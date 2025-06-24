import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan } from '@modules/loan/models';
import { Person } from '@modules/person/models';
import { LoanStatusRepository } from '@modules/loan/repositories';
import { PersonLoansQueryDto, UpdateLoanStatusDto, UpdateMultipleLoanStatusDto, LoanStatusFilter } from '../dto/reports.dto';
import { LoanStatusDocument } from '@modules/loan/models';

export interface PersonLoanSummary {
  person: {
    _id: string;
    name: string;
    documentNumber: string;
    personType: string;
  };
  loans: {
    _id: string;
    resource: {
      title: string;
      isbn?: string;
    };
    loanDate: Date;
    dueDate: Date;
    returnDate?: Date;
    status: string;
    observations?: string;
  }[];
  summary: {
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    returnedLoans: number;
    lostLoans: number;
  };
  personStatus: 'up_to_date' | 'not_up_to_date';
}

function isPopulated(obj: any): obj is Record<string, any> {
  return obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Types.ObjectId);
}

function getPopulatedField(obj: any, field: string): any {
  return isPopulated(obj) && obj[field] ? obj[field] : '';
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectModel(Loan.name) private loanModel: Model<Loan>,
    @InjectModel(Person.name) private personModel: Model<Person>,
    private readonly loanStatusRepository: LoanStatusRepository,
  ) {}

  async getPersonLoans(query: PersonLoansQueryDto): Promise<PersonLoanSummary[]> {
    const { search, status, year = new Date().getFullYear().toString() } = query;

    // Construir filtro de fecha para el año
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);

    // ✅ DEBUG: Log para verificar los filtros
    this.logger.debug('Getting person loans with filters:', { search, status, year, startDate, endDate });

    // 1. Obtener todos los préstamos del año (sin filtrar por estado)
    const loanFilter: any = {
      loanDate: { $gte: startDate, $lte: endDate },
    };

    const loans = await this.loanModel
      .find(loanFilter)
      .populate('personId', 'firstName lastName documentNumber personTypeId')
      .populate('resourceId', 'title isbn stateId')
      .populate('statusId', 'name')
      .lean();

    // ✅ DEBUG: Log para verificar los préstamos obtenidos
    this.logger.debug(`Found ${loans.length} loans for year ${year}`);
    
    // ✅ DEBUG: Log para verificar préstamos perdidos
    const lostLoans = loans.filter(loan => getPopulatedField(loan.statusId, 'name') === 'lost');
    this.logger.debug(`Found ${lostLoans.length} lost loans:`, lostLoans.map(loan => ({
      loanId: loan._id,
      personName: `${getPopulatedField(loan.personId, 'firstName')} ${getPopulatedField(loan.personId, 'lastName')}`.trim(),
      resourceTitle: getPopulatedField(loan.resourceId, 'title'),
      resourceState: getPopulatedField(getPopulatedField(loan.resourceId, 'stateId'), 'name'),
      status: getPopulatedField(loan.statusId, 'name')
    })));

    // 2. Agrupar préstamos por persona y calcular resumen
    const personLoansMap = new Map<string, any[]>();
    loans.forEach(loan => {
      const personId = loan.personId._id.toString();
      if (!personLoansMap.has(personId)) {
        personLoansMap.set(personId, []);
      }
      personLoansMap.get(personId)!.push(loan);
    });

    // 3. Obtener personas
    const personIds = Array.from(personLoansMap.keys());
    let personFilter: any = { _id: { $in: personIds } };
    if (search) {
      personFilter = {
        _id: { $in: personIds },
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { documentNumber: { $regex: search, $options: 'i' } },
        ],
      };
    }
    const people = await this.personModel
      .find(personFilter)
      .populate('personTypeId', 'name description')
      .lean();

    // 4. Construir el resumen por persona
    let personSummaries: PersonLoanSummary[] = people.map(person => {
      const personId = person._id.toString();
      const personLoans = personLoansMap.get(personId) || [];
      return {
        person: {
          _id: personId,
          name: `${getPopulatedField(person, 'firstName')} ${getPopulatedField(person, 'lastName')}`,
          documentNumber: person.documentNumber || 'Sin documento',
          personType: getPopulatedField(person.personTypeId, 'name'),
        },
        loans: personLoans.map(loan => ({
          ...loan,
          resource: loan.resourceId ? {
            title: getPopulatedField(loan.resourceId, 'title'),
            isbn: getPopulatedField(loan.resourceId, 'isbn'),
          } : { title: 'Sin título' },
          status: getPopulatedField(loan.statusId, 'name')
        })),
        summary: this.calculateSummary(personLoans),
        personStatus: this.calculatePersonStatus(personLoans),
      };
    });

    // ✅ DEBUG: Log para verificar el resumen calculado
    const summariesWithLost = personSummaries.filter(summary => summary.summary.lostLoans > 0);
    this.logger.debug(`Found ${summariesWithLost.length} people with lost loans:`, summariesWithLost.map(summary => ({
      personName: summary.person.name,
      lostLoans: summary.summary.lostLoans,
      totalLoans: summary.summary.totalLoans
    })));

    // 5. Filtrar por estado usando el resumen
    if (status && status.length > 0) {
      // Mapear los nombres de filtro a las claves del resumen
      const statusMap = {
        active: 'activeLoans',
        overdue: 'overdueLoans',
        returned: 'returnedLoans',
        lost: 'lostLoans',
      } as const;
      type SummaryKey = keyof typeof statusMap;
      personSummaries = personSummaries.filter(summary =>
        status.some(s => summary.summary[statusMap[s as SummaryKey] as keyof typeof summary.summary] > 0)
      );
      
      // ✅ DEBUG: Log para verificar el filtrado
      this.logger.debug(`After filtering by status ${status}, found ${personSummaries.length} people`);
    }

    return personSummaries;
  }

  async updateLoanStatus(updateDto: UpdateLoanStatusDto): Promise<void> {
    const { loanId, status, observations } = updateDto;

    const statusId = await this.getStatusId(status);
    
    const updateData: any = { statusId };
    if (observations) {
      updateData.observations = observations;
    }

    // Si se marca como devuelto, agregar fecha de devolución
    if (status === LoanStatusFilter.RETURNED) {
      updateData.returnDate = new Date();
    }

    const result = await this.loanModel.findByIdAndUpdate(loanId, updateData);
    
    if (!result) {
      throw new NotFoundException(`Préstamo con ID ${loanId} no encontrado`);
    }
  }

  async updateMultipleLoanStatus(updateDto: UpdateMultipleLoanStatusDto): Promise<void> {
    const { loanIds, status, observations } = updateDto;

    const statusId = await this.getStatusId(status);
    
    const updateData: any = { statusId };
    if (observations) {
      updateData.observations = observations;
    }

    // Si se marca como devuelto, agregar fecha de devolución
    if (status === LoanStatusFilter.RETURNED) {
      updateData.returnDate = new Date();
    }

    await this.loanModel.updateMany(
      { _id: { $in: loanIds } },
      updateData
    );
  }

  private calculateSummary(loans: any[]): PersonLoanSummary['summary'] {
    const summary = {
      totalLoans: loans.length,
      activeLoans: 0,
      overdueLoans: 0,
      returnedLoans: 0,
      lostLoans: 0,
    };

    loans.forEach(loan => {
      const statusName = getPopulatedField(loan.statusId, 'name').toLowerCase();
      
      if (statusName === 'active') {
        summary.activeLoans++;
      } else if (statusName === 'overdue') {
        summary.overdueLoans++;
      } else if (statusName === 'returned') {
        summary.returnedLoans++;
      } else if (statusName === 'lost') {
        summary.lostLoans++;
      }
    });

    return summary;
  }

  private calculatePersonStatus(loans: any[]): 'up_to_date' | 'not_up_to_date' {
    const overdueLoans = loans.filter(loan => {
      const statusName = getPopulatedField(loan.statusId, 'name').toLowerCase();
      return statusName === 'overdue';
    }).length;
    
    const activeLoans = loans.filter(loan => {
      const statusName = getPopulatedField(loan.statusId, 'name').toLowerCase();
      return statusName === 'active';
    }).length;

    const lostLoans = loans.filter(loan => {
      const statusName = getPopulatedField(loan.statusId, 'name').toLowerCase();
      return statusName === 'lost';
    }).length;

    // Una persona no está al día si tiene préstamos vencidos, activos o perdidos
    if (overdueLoans === 0 && activeLoans === 0 && lostLoans === 0) {
      return 'up_to_date';
    }
    return 'not_up_to_date';
  }

  private async getStatusId(status: LoanStatusFilter): Promise<string> {
    // Mapear los filtros a los nombres de estado en la base de datos (en inglés)
    const statusMap = {
      [LoanStatusFilter.ACTIVE]: 'active',
      [LoanStatusFilter.OVERDUE]: 'overdue',
      [LoanStatusFilter.RETURNED]: 'returned',
      [LoanStatusFilter.LOST]: 'lost',
    };

    const statusName = statusMap[status];
    
    // Mostrar todos los estados disponibles en la base de datos
    const allStatuses = await this.loanStatusRepository.findAll();
    
    // Buscar el estado directamente en el array de estados disponibles
    const statusDoc = allStatuses.find(s => s.name === statusName);
    
    if (!statusDoc) {
      throw new NotFoundException(`Estado '${statusName}' no encontrado`);
    }
    
    const statusDocTyped = statusDoc as LoanStatusDocument;
    const statusId = (statusDocTyped._id as Types.ObjectId | string).toString();
    
    return statusId;
  }

  private async getStatusIds(statuses: LoanStatusFilter[]): Promise<string[]> {
    const statusIds = await Promise.all(
      statuses.map(status => this.getStatusId(status))
    );
    return statusIds;
  }
} 