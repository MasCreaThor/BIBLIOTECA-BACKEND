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

    this.logger.debug(`🔍 Iniciando búsqueda de reportes con filtros:`, { search, status, year });

    // Construir filtro de fecha para el año
    const startDate = new Date(`${year}-01-01`);
    const endDate = new Date(`${year}-12-31`);
    this.logger.debug(`📅 Filtro de fechas: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // 1. Obtener todos los préstamos del año (sin filtrar por estado)
    const loanFilter: any = {
      loanDate: { $gte: startDate, $lte: endDate },
    };
    this.logger.debug(`🔍 Filtro final de préstamos:`, JSON.stringify(loanFilter, null, 2));

    const loans = await this.loanModel
      .find(loanFilter)
      .populate('personId', 'firstName lastName documentNumber personTypeId')
      .populate('resourceId', 'title isbn')
      .populate('statusId', 'name')
      .lean();

    this.logger.debug(`📊 Préstamos encontrados: ${loans.length}`);

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
      this.logger.debug(`🔍 Aplicando filtro de búsqueda: "${search}"`);
      personFilter = {
        _id: { $in: personIds },
        $or: [
          { firstName: { $regex: search, $options: 'i' } },
          { lastName: { $regex: search, $options: 'i' } },
          { documentNumber: { $regex: search, $options: 'i' } },
        ],
      };
    }
    const people = await this.personModel.find(personFilter).lean();

    // 4. Construir el resumen por persona
    let personSummaries: PersonLoanSummary[] = people.map(person => {
      const personId = person._id.toString();
      const personLoans = personLoansMap.get(personId) || [];
      return {
        person: {
          _id: personId,
          name: `${person.firstName} ${person.lastName}`,
          documentNumber: person.documentNumber || 'Sin documento',
          personType: (person.personTypeId as any)?.name || 'No especificado',
        },
        loans: personLoans.map(loan => ({
          ...loan,
          resource: loan.resourceId ? {
            title: loan.resourceId.title,
            isbn: loan.resourceId.isbn,
          } : { title: 'Sin título' },
          status: loan.statusId?.name || 'Sin estado'
        })),
        summary: this.calculateSummary(personLoans),
        personStatus: this.calculatePersonStatus(personLoans),
      };
    });

    // 5. Filtrar por estado usando el resumen
    if (status && status.length > 0) {
      this.logger.debug(`🔍 Filtrando personas por estado en el resumen: ${status.join(', ')}`);
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
    }

    this.logger.debug(`👤 Personas encontradas después de filtros: ${personSummaries.length}`);
    this.logger.debug(`✅ Resultado final: ${personSummaries.length} personas con préstamos`);

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
      const statusName = loan.statusId.name.toLowerCase();
      
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
      const statusName = loan.statusId.name.toLowerCase();
      return statusName === 'overdue';
    }).length;
    
    const activeLoans = loans.filter(loan => {
      const statusName = loan.statusId.name.toLowerCase();
      return statusName === 'active';
    }).length;

    if (overdueLoans === 0 && activeLoans === 0) {
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
    this.logger.debug(`🏷️ Estados disponibles en BD:`, allStatuses.map(s => ({ id: s._id, name: s.name })));
    
    // Buscar el estado directamente en el array de estados disponibles
    const statusDoc = allStatuses.find(s => s.name === statusName);
    
    if (!statusDoc) {
      throw new NotFoundException(`Estado '${statusName}' no encontrado`);
    }
    
    const statusDocTyped = statusDoc as LoanStatusDocument;
    const statusId = (statusDocTyped._id as Types.ObjectId | string).toString();
    this.logger.debug(`🏷️ ID correcto para estado '${statusName}': ${statusId}`);
    
    return statusId;
  }

  private async getStatusIds(statuses: LoanStatusFilter[]): Promise<string[]> {
    const statusIds = await Promise.all(
      statuses.map(status => this.getStatusId(status))
    );
    return statusIds;
  }
} 