// src/modules/loan/services/overdue.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { LoanRepository, LoanStatusRepository } from '@modules/loan/repositories';
import { PersonTypeRepository } from '@modules/person/repositories';
import { LoggerService } from '@shared/services/logger.service';
import {
  OverdueSearchDto,
  OverdueResponseDto,
  OverdueStatsDto,
  LoanResponseDto,
} from '@modules/loan/dto';
import { PaginatedResponseDto } from '@shared/dto/base.dto';
import { LoanDocument } from '@modules/loan/models';
import { DateUtils, getErrorMessage, getErrorStack } from '@shared/utils';
import { ObjectId } from '@shared/types/mongoose.types';

@Injectable()
export class OverdueService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly loanStatusRepository: LoanStatusRepository,
    private readonly personTypeRepository: PersonTypeRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('OverdueService');
  }

  /**
   * Buscar préstamos vencidos con filtros
   */
  async findOverdueLoans(searchDto: OverdueSearchDto): Promise<PaginatedResponseDto<OverdueResponseDto>> {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      personId, 
      personType,
      minDaysOverdue,
      dateFrom,
      dateTo,
      grade
    } = searchDto;

    try {
      // Construir filtros base
      const filters: any = {
        isOverdue: true,
      };

      if (personId) {
        filters.personId = personId;
      }

      if (dateFrom || dateTo) {
        // Convertir fechas de vencimiento a filtro de rango
        const today = new Date();
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          filters.dateTo = fromDate; // Préstamos que vencieron después de esta fecha
        }
        if (dateTo) {
          const toDate = new Date(dateTo);
          filters.dateFrom = toDate; // Préstamos que vencieron antes de esta fecha
        }
      }

      if (search) {
        filters.search = search;
      }

      // Obtener préstamos vencidos base
      const result = await this.loanRepository.findWithFilters(filters, page, limit);

      // Filtrar por tipo de persona si se especifica
      let filteredData = result.data;
      if (personType || minDaysOverdue || grade) {
        filteredData = this.filterOverdueLoans(result.data, {
          personType,
          minDaysOverdue,
          grade,
        });
      }

      // Mapear a OverdueResponseDto
      const mappedData = filteredData.map((loan) => this.mapToOverdueResponseDto(loan));

      return new PaginatedResponseDto(mappedData, mappedData.length, page, limit);
    } catch (error) {
      this.logger.error('Error finding overdue loans', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        searchDto
      });
      throw new BadRequestException('Error al buscar préstamos vencidos: ' + getErrorMessage(error));
    }
  }

  /**
   * Obtener estadísticas de préstamos vencidos
   */
  async getOverdueStatistics(): Promise<OverdueStatsDto> {
    try {
      const overdueLoans = await this.loanRepository.findOverdue();
      const gradeMap = new Map<string, number>();
      let totalDaysOverdue = 0;
      let maxDaysOverdue = 0;
      let oldestLoan: LoanDocument | null = null;

      const stats: OverdueStatsDto = {
        totalOverdue: overdueLoans.length,
        bySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        },
        byPersonType: {
          students: 0,
          teachers: 0
        },
        byGrade: [],
        averageDaysOverdue: 0,
        totalOverdueAmount: 0,
        oldestOverdue: null,
        recentOverdue: []
      };

      for (const loan of overdueLoans) {
        const daysOverdue = this.calculateDaysOverdue(loan.dueDate);
        totalDaysOverdue += daysOverdue;

        // Actualizar el más antiguo
        if (daysOverdue > maxDaysOverdue) {
          maxDaysOverdue = daysOverdue;
          oldestLoan = loan;
        }

        // Categorizar por severidad
        if (daysOverdue <= 7) {
          stats.bySeverity.low++;
        } else if (daysOverdue <= 15) {
          stats.bySeverity.medium++;
        } else if (daysOverdue <= 30) {
          stats.bySeverity.high++;
        } else {
          stats.bySeverity.critical++;
        }

        // Procesar información de persona (si está poblada)
        if (loan.populated('personId') && loan.personId) {
          const person = loan.personId as any;
          
          // Contar por grado
          if (person.grade) {
            const currentCount = gradeMap.get(person.grade) || 0;
            gradeMap.set(person.grade, currentCount + 1);
          }

          // Contar por tipo de persona
          if (person.personTypeId) {
            const personTypeId = person.personTypeId.toString();
            if (person.grade) {
              stats.byPersonType.students++;
            } else {
              stats.byPersonType.teachers++;
            }
          }
        }
      }

      // Calcular estadísticas adicionales
      stats.averageDaysOverdue = overdueLoans.length > 0 ? totalDaysOverdue / overdueLoans.length : 0;
      stats.totalOverdueAmount = overdueLoans.length;

      // Convertir mapa de grados a array
      stats.byGrade = Array.from(gradeMap.entries()).map(([grade, count]) => ({
        grade,
        count,
      })).sort((a, b) => a.grade.localeCompare(b.grade));

      // Configurar préstamo más antiguo
      if (oldestLoan) {
        stats.oldestOverdue = {
          daysOverdue: maxDaysOverdue,
          loan: this.mapToOverdueResponseDto(oldestLoan),
        };
      }

      // Obtener préstamos vencidos recientes (últimos 5)
      stats.recentOverdue = overdueLoans
        .sort((a: LoanDocument, b: LoanDocument) => b.dueDate.getTime() - a.dueDate.getTime())
        .slice(0, 5)
        .map((loan: LoanDocument) => this.mapToOverdueResponseDto(loan));

      return stats;
    } catch (error) {
      this.logger.error('Error getting overdue statistics', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw new BadRequestException('Error al obtener estadísticas de préstamos vencidos: ' + getErrorMessage(error));
    }
  }

  /**
   * Actualizar estados de préstamos vencidos
   */
  async updateOverdueStatuses(): Promise<{ updatedCount: number }> {
    try {
      const overdueStatus = await this.loanStatusRepository.getOverdueStatus();
      if (!overdueStatus) {
        throw new BadRequestException('Estado de préstamo "vencido" no encontrado en el sistema');
      }

      const statusId = overdueStatus._id as ObjectId;
      const updatedCount = await this.loanRepository.updateOverdueLoans(statusId, new Date());

      this.logger.log(`Updated ${updatedCount} loans to overdue status`);

      return { updatedCount };
    } catch (error) {
      this.logger.error('Error updating overdue statuses', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw new BadRequestException('Error al actualizar estados de préstamos vencidos: ' + getErrorMessage(error));
    }
  }

  /**
   * Buscar préstamos próximos a vencer
   */
  async findLoansNearDue(daysUntilDue: number = 3): Promise<LoanResponseDto[]> {
    try {
      const loans = await this.loanRepository.findLoansNearDue(daysUntilDue);
      return loans.map((loan: LoanDocument) => this.mapLoanToResponseDto(loan));
    } catch (error) {
      this.logger.error('Error finding loans near due', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        daysUntilDue
      });
      throw new BadRequestException('Error al buscar préstamos próximos a vencer: ' + getErrorMessage(error));
    }
  }

  /**
   * Filtrar préstamos vencidos por criterios adicionales
   */
  private filterOverdueLoans(
    loans: LoanDocument[], 
    filters: {
      personType?: 'student' | 'teacher';
      minDaysOverdue?: number;
      grade?: string;
    }
  ): LoanDocument[] {
    return loans.filter(loan => {
      // Filtrar por tipo de persona
      if (filters.personType && loan.populated('personId')) {
        const person = loan.personId as any;
        const hasGrade = !!person.grade;
        if (filters.personType === 'student' && !hasGrade) return false;
        if (filters.personType === 'teacher' && hasGrade) return false;
      }

      // Filtrar por días de retraso mínimo
      if (filters.minDaysOverdue) {
        const daysOverdue = this.calculateDaysOverdue(loan.dueDate);
        if (daysOverdue < filters.minDaysOverdue) return false;
      }

      // Filtrar por grado
      if (filters.grade && loan.populated('personId')) {
        const person = loan.personId as any;
        if (person.grade !== filters.grade) return false;
      }

      return true;
    });
  }

  /**
   * Calcular días de retraso
   */
  private calculateDaysOverdue(dueDate: Date): number {
    const today = new Date();
    const diffTime = today.getTime() - dueDate.getTime();
    return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  }

  /**
   * Determinar severidad del retraso
   */
  private getSeverity(daysOverdue: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysOverdue <= 7) return 'low';
    if (daysOverdue <= 15) return 'medium';
    if (daysOverdue <= 30) return 'high';
    return 'critical';
  }

  /**
   * Mapear préstamo a DTO de respuesta vencida
   */
  private mapToOverdueResponseDto(loan: LoanDocument): OverdueResponseDto {
    const daysOverdue = this.calculateDaysOverdue(loan.dueDate);
    return {
      _id: loan._id?.toString() || '',
      personId: loan.personId?.toString() || '',
      resourceId: loan.resourceId?.toString() || '',
      dueDate: loan.dueDate,
      daysOverdue,
      status: loan.statusId?.toString() || '',
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      severity: this.getSeverity(daysOverdue),
    };
  }

  /**
   * Mapear préstamo básico a DTO de respuesta
   */
  private mapLoanToResponseDto(loan: LoanDocument): LoanResponseDto {
    return {
      _id: loan._id?.toString() || '',
      personId: loan.personId?.toString() || '',
      resourceId: loan.resourceId?.toString() || '',
      quantity: loan.quantity,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnedDate: loan.returnedDate,
      statusId: loan.statusId?.toString() || '',
      observations: loan.observations,
      loanedBy: loan.loanedBy?.toString() || '',
      returnedBy: loan.returnedBy?.toString(),
      daysOverdue: this.calculateDaysOverdue(loan.dueDate),
      isOverdue: loan.isOverdue,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      person: loan.populated('personId') ? {
        _id: (loan.personId as any)._id?.toString() || '',
        firstName: (loan.personId as any).firstName || '',
        lastName: (loan.personId as any).lastName || '',
        fullName: (loan.personId as any).fullName || `${(loan.personId as any).firstName} ${(loan.personId as any).lastName}`,
        documentNumber: (loan.personId as any).documentNumber,
        grade: (loan.personId as any).grade,
        personType: (loan.personId as any).personType ? {
          _id: (loan.personId as any).personType._id?.toString() || '',
          name: (loan.personId as any).personType.name || '',
          description: (loan.personId as any).personType.description || '',
        } : undefined,
      } : undefined,
      resource: loan.populated('resourceId') ? {
        _id: (loan.resourceId as any)._id?.toString() || '',
        title: (loan.resourceId as any).title || '',
        isbn: (loan.resourceId as any).isbn,
        author: (loan.resourceId as any).author,
        category: (loan.resourceId as any).category,
        available: (loan.resourceId as any).available,
        state: (loan.resourceId as any).state ? {
          _id: (loan.resourceId as any).state._id?.toString() || '',
          name: (loan.resourceId as any).state.name || '',
          description: (loan.resourceId as any).state.description || '',
          color: (loan.resourceId as any).state.color || '',
        } : undefined,
      } : undefined,
      status: loan.populated('statusId') ? {
        _id: (loan.statusId as any)._id?.toString() || '',
        name: (loan.statusId as any).name || '',
        description: (loan.statusId as any).description || '',
        color: (loan.statusId as any).color || '',
      } : undefined,
      loanedByUser: loan.populated('loanedBy') ? {
        _id: (loan.loanedBy as any)._id?.toString() || '',
        firstName: (loan.loanedBy as any).firstName || '',
        lastName: (loan.loanedBy as any).lastName || '',
        username: (loan.loanedBy as any).username || '',
      } : undefined,
      returnedByUser: loan.populated('returnedBy') ? {
        _id: (loan.returnedBy as any)._id?.toString() || '',
        firstName: (loan.returnedBy as any).firstName || '',
        lastName: (loan.returnedBy as any).lastName || '',
        username: (loan.returnedBy as any).username || '',
      } : undefined,
    };
  }
}