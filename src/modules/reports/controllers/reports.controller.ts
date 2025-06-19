import { Controller, Get, Put, Body, Query, UseGuards } from '@nestjs/common';
import { ReportsService, PersonLoanSummary } from '../services/reports.service';
import { PersonLoansQueryDto, UpdateLoanStatusDto, UpdateMultipleLoanStatusDto } from '../dto/reports.dto';
import { AuthGuard } from '../../../shared/guards';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan } from '@modules/loan/models';
import { Resource } from '@modules/resource/models';

function isPopulated(obj: any): obj is Record<string, any> {
  return obj && typeof obj === 'object' && !Array.isArray(obj) && !(obj instanceof Types.ObjectId);
}

@Controller('reports')
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(
    private readonly reportsService: ReportsService,
    @InjectModel(Loan.name) private loanModel: Model<Loan>,
    @InjectModel(Resource.name) private resourceModel: Model<Resource>
  ) {}

  @Get('person-loans')
  async getPersonLoans(@Query() query: PersonLoansQueryDto): Promise<PersonLoanSummary[]> {
    return this.reportsService.getPersonLoans(query);
  }

  @Get('debug-lost-resources')
  async debugLostResources(): Promise<any> {
    // Verificar préstamos marcados como perdidos
    const lostLoans = await this.loanModel
      .find({})
      .populate('personId', 'firstName lastName documentNumber')
      .populate('resourceId', 'title isbn stateId')
      .populate('statusId', 'name')
      .lean();

    const lostLoansFiltered = lostLoans.filter(loan => isPopulated(loan.statusId) && (loan.statusId as any).name === 'lost');

    // Verificar recursos marcados como perdidos
    const lostResources = await this.resourceModel
      .find({})
      .populate('stateId', 'name description')
      .lean();

    const lostResourcesFiltered = lostResources.filter(resource => isPopulated(resource.stateId) && (resource.stateId as any).name === 'lost');

    return {
      totalLoans: lostLoans.length,
      lostLoans: lostLoansFiltered.length,
      lostLoansDetails: lostLoansFiltered.map(loan => ({
        loanId: loan._id,
        personName: isPopulated(loan.personId) ? `${(loan.personId as any).firstName || ''} ${(loan.personId as any).lastName || ''}`.trim() : '',
        resourceTitle: isPopulated(loan.resourceId) ? (loan.resourceId as any).title : '',
        resourceState: isPopulated(loan.resourceId) && isPopulated((loan.resourceId as any).stateId) ? ((loan.resourceId as any).stateId as any).name : '',
        loanStatus: isPopulated(loan.statusId) ? (loan.statusId as any).name : '',
        loanDate: loan.loanDate,
        returnedDate: loan.returnedDate
      })),
      totalResources: lostResources.length,
      lostResources: lostResourcesFiltered.length,
      lostResourcesDetails: lostResourcesFiltered.map(resource => ({
        resourceId: resource._id,
        title: resource.title,
        state: isPopulated(resource.stateId) ? (resource.stateId as any).name : '',
        available: resource.available
      }))
    };
  }

  @Get('debug-simple')
  async debugSimple(): Promise<any> {
    try {
      // Contar todos los préstamos
      const totalLoans = await this.loanModel.countDocuments({});
      
      // Contar préstamos con estado "lost"
      const lostLoansCount = await this.loanModel.countDocuments({
        'statusId': { $exists: true }
      });

      // Obtener algunos préstamos para ver su estructura
      const sampleLoans = await this.loanModel
        .find({})
        .limit(5)
        .populate('statusId', 'name')
        .lean();

      return {
        message: 'Debug simple funcionando',
        totalLoans,
        lostLoansCount,
        sampleLoans: sampleLoans.map(loan => ({
          loanId: loan._id,
          statusId: loan.statusId,
          statusName: isPopulated(loan.statusId) ? (loan.statusId as any).name : 'No poblado',
          loanDate: loan.loanDate
        }))
      };
    } catch (error: any) {
      return {
        error: error?.message || 'Error desconocido',
        stack: error?.stack || 'No stack disponible'
      };
    }
  }

  @Get('debug-lost-all-years')
  async debugLostAllYears(): Promise<any> {
    try {
      // Buscar préstamos perdidos en TODOS los años
      const allLoans = await this.loanModel
        .find({})
        .populate('personId', 'firstName lastName documentNumber')
        .populate('resourceId', 'title isbn stateId')
        .populate('statusId', 'name')
        .lean();

      const lostLoans = allLoans.filter(loan => isPopulated(loan.statusId) && (loan.statusId as any).name === 'lost');

      // Agrupar por año
      const lostLoansByYear = lostLoans.reduce((acc: { [key: number]: any[] }, loan) => {
        const year = new Date(loan.loanDate).getFullYear();
        if (!acc[year]) acc[year] = [];
        acc[year].push({
          loanId: loan._id,
          personName: isPopulated(loan.personId) ? `${(loan.personId as any).firstName || ''} ${(loan.personId as any).lastName || ''}`.trim() : '',
          resourceTitle: isPopulated(loan.resourceId) ? (loan.resourceId as any).title : '',
          resourceState: isPopulated(loan.resourceId) && isPopulated((loan.resourceId as any).stateId) ? ((loan.resourceId as any).stateId as any).name : '',
          loanStatus: isPopulated(loan.statusId) ? (loan.statusId as any).name : '',
          loanDate: loan.loanDate,
          returnedDate: loan.returnedDate
        });
        return acc;
      }, {} as { [key: number]: any[] });

      return {
        message: 'Búsqueda de préstamos perdidos en todos los años',
        totalLoans: allLoans.length,
        totalLostLoans: lostLoans.length,
        lostLoansByYear,
        allStatuses: [...new Set(allLoans.map(loan => isPopulated(loan.statusId) ? (loan.statusId as any).name : 'No poblado'))]
      };
    } catch (error: any) {
      return {
        error: error?.message || 'Error desconocido',
        stack: error?.stack || 'No stack disponible'
      };
    }
  }

  @Put('update-loan-status')
  async updateLoanStatus(@Body() updateDto: UpdateLoanStatusDto): Promise<{ message: string }> {
    await this.reportsService.updateLoanStatus(updateDto);
    return { message: 'Estado del préstamo actualizado correctamente' };
  }

  @Put('update-multiple-loan-status')
  async updateMultipleLoanStatus(@Body() updateDto: UpdateMultipleLoanStatusDto): Promise<{ message: string }> {
    await this.reportsService.updateMultipleLoanStatus(updateDto);
    return { message: 'Estados de préstamos actualizados correctamente' };
  }
} 