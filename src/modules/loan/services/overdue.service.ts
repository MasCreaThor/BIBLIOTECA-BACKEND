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
import { DateUtils } from '@shared/utils';
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
      dueDateFrom,
      dueDateTo,
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

      if (dueDateFrom || dueDateTo) {
        // Convertir fechas de vencimiento a filtro de rango
        const today = new Date();
        if (dueDateFrom) {
          const fromDate = new Date(dueDateFrom);
          filters.dateTo = fromDate; // Préstamos que vencieron después de esta fecha
        }
        if (dueDateTo) {
          const toDate = new Date(dueDateTo);
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
      this.logger.error('Error finding overdue loans', error);
      throw new BadRequestException('Error al buscar préstamos vencidos');
    }
  }

  /**
   * Obtener estadísticas de préstamos vencidos
   */
  async getOverdueStatistics(): Promise<OverdueStatsDto> {
    try {
      const overdueLoans = await this.loanRepository.findOverdueLoans();

      const stats: OverdueStatsDto = {
        totalOverdue: overdueLoans.length,
        byPersonType: {
          students: 0,
          teachers: 0,
        },
        bySeverity: {
          low: 0,      // 1-7 días
          medium: 0,   // 8-15 días
          high: 0,     // 16-30 días
          critical: 0, // 30+ días
        },
        byGrade: [],
        oldestOverdue: null,
      };

      const gradeMap = new Map<string, number>();
      let oldestLoan: LoanDocument | null = null;
      let maxDaysOverdue = 0;

      for (const loan of overdueLoans) {
        const daysOverdue = this.calculateDaysOverdue(loan.dueDate);

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

          // Contar por tipo de persona (necesitamos el tipo poblado)
          if (person.personTypeId) {
            const personTypeId = person.personTypeId.toString();
            // Aquí deberíamos obtener el tipo, pero como optimización
            // podríamos asumir que el grado indica si es estudiante
            if (person.grade) {
              stats.byPersonType.students++;
            } else {
              stats.byPersonType.teachers++;
            }
          }
        }
      }

      // Convertir mapa de grados a array
      stats.byGrade = Array.from(gradeMap.entries()).map(([grade, count]) => ({
        grade,
        count,
      })).sort((a, b) => a.grade.localeCompare(b.grade));

      // Configurar préstamo más antiguo
      if (oldestLoan) {
        stats.oldestOverdue = {
          daysOverdue: maxDaysOverdue,
          loan: this.mapLoanToResponseDto(oldestLoan),
        };
      }

      return stats;
    } catch (error) {
      this.logger.error('Error getting overdue statistics', error);
      throw new BadRequestException('Error al obtener estadísticas de préstamos vencidos');
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
      const updatedCount = await this.loanRepository.updateOverdueStatus(statusId.toString());

      this.logger.log(`Updated ${updatedCount} loans to overdue status`);

      return { updatedCount };
    } catch (error) {
      this.logger.error('Error updating overdue statuses', error);
      throw new BadRequestException('Error al actualizar estados de préstamos vencidos');
    }
  }

  /**
   * Buscar préstamos próximos a vencer
   */
  async findLoansNearDue(daysUntilDue: number = 3): Promise<LoanResponseDto[]> {
    try {
      const loans = await this.loanRepository.findLoansNearDue(daysUntilDue);
      return loans.map((loan) => this.mapLoanToResponseDto(loan));
    } catch (error) {
      this.logger.error('Error finding loans near due', error);
      throw new BadRequestException('Error al buscar préstamos próximos a vencer');
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
    return loans.filter((loan) => {
      // Filtro por días mínimos de retraso
      if (filters.minDaysOverdue) {
        const daysOverdue = this.calculateDaysOverdue(loan.dueDate);
        if (daysOverdue < filters.minDaysOverdue) {
          return false;
        }
      }

      // Filtros que requieren información de persona poblada
      if (loan.populated('personId') && loan.personId) {
        const person = loan.personId as any;

        // Filtro por grado
        if (filters.grade && person.grade !== filters.grade) {
          return false;
        }

        // Filtro por tipo de persona (simplificado)
        if (filters.personType) {
          if (filters.personType === 'student' && !person.grade) {
            return false;
          }
          if (filters.personType === 'teacher' && person.grade) {
            return false;
          }
        }
      }

      return true;
    });
  }

  /**
   * Calcular días de retraso
   */
  private calculateDaysOverdue(dueDate: Date): number {
    const today = new Date();
    if (today <= dueDate) {
      return 0;
    }
    return DateUtils.daysDifference(dueDate, today);
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
    
    const baseDto = this.mapLoanToResponseDto(loan);
    
    return {
      ...baseDto,
      daysOverdue,
      severity: this.getSeverity(daysOverdue),
    };
  }

  /**
   * Mapear préstamo básico a DTO de respuesta
   */
  private mapLoanToResponseDto(loan: LoanDocument): LoanResponseDto {
    const responseDto: LoanResponseDto = {
      _id: (loan._id as any).toString(),
      personId: loan.personId.toString(),
      resourceId: loan.resourceId.toString(),
      quantity: loan.quantity,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnedDate: loan.returnedDate,
      statusId: loan.statusId.toString(),
      observations: loan.observations,
      loanedBy: loan.loanedBy.toString(),
      returnedBy: loan.returnedBy?.toString(),
      daysOverdue: loan.daysOverdue,
      isOverdue: loan.isOverdue,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };

    // Mapear información poblada si está disponible
    if (loan.populated('personId') && loan.personId) {
      const person = loan.personId as any;
      responseDto.person = {
        _id: person._id?.toString(),
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: person.fullName || `${person.firstName} ${person.lastName}`,
        documentNumber: person.documentNumber,
        grade: person.grade,
      };
    }

    if (loan.populated('resourceId') && loan.resourceId) {
      const resource = loan.resourceId as any;
      responseDto.resource = {
        _id: resource._id?.toString(),
        title: resource.title,
        isbn: resource.isbn,
      };
    }

    if (loan.populated('statusId') && loan.statusId) {
      const status = loan.statusId as any;
      responseDto.status = {
        _id: status._id?.toString(),
        name: status.name,
        description: status.description,
        color: status.color,
      };
    }

    return responseDto;
  }
}