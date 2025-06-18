// src/modules/loan/services/overdue.service.ts
import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
import { LoanDocument, LoanStatusDocument } from '@modules/loan/models';
import { DateUtils, getErrorMessage, getErrorStack } from '@shared/utils';
import { Types, Document } from 'mongoose';

@Injectable()
export class OverdueService {
  private overdueStatusId!: Types.ObjectId;

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly loanStatusRepository: LoanStatusRepository,
    private readonly personTypeRepository: PersonTypeRepository,
    private readonly logger: LoggerService,
  ) {
    this.initializeOverdueStatus();
  }

  private async initializeOverdueStatus(): Promise<void> {
    try {
      const overdueStatus = await this.loanStatusRepository.getOverdueStatus() as LoanStatusDocument;
      if (!overdueStatus) {
        throw new Error('No se pudo obtener el estado de préstamo vencido');
      }
      this.overdueStatusId = new Types.ObjectId((overdueStatus._id as string));
    } catch (error) {
      throw new InternalServerErrorException('Error al inicializar el estado de préstamo vencido');
    }
  }

  /**
   * Buscar préstamos vencidos con filtros
   */
  async findOverdueLoans(page: number = 1, limit: number = 10): Promise<PaginatedResponseDto<OverdueResponseDto>> {
    try {
      const loans = await this.loanRepository.findWithCompletePopulate({
        statusId: this.overdueStatusId,
      });
      // paginación manual
      const startIndex = (page - 1) * limit;
      const paginated = loans.slice(startIndex, startIndex + limit);
      const overdueLoans = paginated.map((loan: LoanDocument) => this.mapToOverdueResponseDto(loan));
      return new PaginatedResponseDto(
        overdueLoans,
        loans.length,
        page,
        limit
      );
    } catch (error) {
      throw new InternalServerErrorException('Error al buscar préstamos vencidos');
    }
  }

  /**
   * Obtener estadísticas de préstamos vencidos
   */
  async getOverdueStatistics(): Promise<OverdueStatsDto> {
    try {
      const overdueLoans = await this.loanRepository.findWithCompletePopulate({ statusId: this.overdueStatusId });
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
        byDaysOverdue: {
          '1-7': 0,
          '8-14': 0,
          '15-30': 0,
          '30+': 0
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
          stats.byDaysOverdue['1-7']++;
        } else if (daysOverdue <= 15) {
          stats.bySeverity.medium++;
          stats.byDaysOverdue['8-14']++;
        } else if (daysOverdue <= 30) {
          stats.bySeverity.high++;
          stats.byDaysOverdue['15-30']++;
        } else {
          stats.bySeverity.critical++;
          stats.byDaysOverdue['30+']++;
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

      const statusId = overdueStatus._id as Types.ObjectId;
      const updatedCount = await this.loanRepository.updateManyLoans(
        { statusId: this.overdueStatusId },
        { statusId: statusId, updatedAt: new Date() }
      );

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
  async findLoansNearDue(daysThreshold: number = 3): Promise<OverdueResponseDto[]> {
    try {
      const today = new Date();
      const thresholdDate = new Date(today);
      thresholdDate.setDate(today.getDate() + daysThreshold);

      const loans = await this.loanRepository.findWithCompletePopulate({
        statusId: { $ne: this.overdueStatusId },
        returnedDate: null,
        dueDate: { $lte: thresholdDate, $gt: today }
      });

      return loans.map((loan: LoanDocument) => this.mapToOverdueResponseDto(loan));
    } catch (error) {
      throw new InternalServerErrorException('Error al buscar préstamos próximos a vencer');
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
    const diffTime = today.getTime() - new Date(dueDate).getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
    const today = new Date();
    const dueDate = new Date(loan.dueDate);
    const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      _id: loan._id?.toString?.() ?? '',
      personId: loan.personId?.toString?.() ?? '',
      resourceId: loan.resourceId?.toString?.() ?? '',
      dueDate: loan.dueDate,
      daysOverdue,
      status: loan.statusId?.toString?.() ?? '',
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      severity: this.calculateSeverity(daysOverdue)
    };
  }

  private calculateSeverity(daysOverdue: number): 'low' | 'medium' | 'high' | 'critical' {
    if (daysOverdue <= 3) return 'low';
    if (daysOverdue <= 7) return 'medium';
    if (daysOverdue <= 15) return 'high';
    return 'critical';
  }
}