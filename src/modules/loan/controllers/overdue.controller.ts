// src/modules/loan/controllers/overdue.controller.ts
import {
    Controller,
    Get,
    Post,
    Query,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { OverdueService } from '@modules/loan/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    OverdueSearchDto,
    OverdueResponseDto,
    OverdueStatsDto,
    LoanResponseDto,
  } from '@modules/loan/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';
  
  /**
   * Controlador para gestión de préstamos vencidos
   */
  @Controller('overdue')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class OverdueController {
    constructor(
      private readonly overdueService: OverdueService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('OverdueController');
    }
  
    /**
     * Buscar préstamos vencidos con filtros
     * GET /api/overdue
     */
    @Get()
    async findOverdueLoans(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('personId') personId?: string,
      @Query('personType') personType?: 'student' | 'teacher',
      @Query('minDaysOverdue') minDaysOverdue?: string,
      @Query('dateFrom') dateFrom?: string,
      @Query('dateTo') dateTo?: string,
      @Query('grade') grade?: string,
      @Query('sortBy') sortBy?: string,
      @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ): Promise<ApiResponseDto<PaginatedResponseDto<OverdueResponseDto>>> {
      try {
        const searchDto: OverdueSearchDto = {
          page: parseInt(page, 10) || 1,
          limit: Math.min(parseInt(limit, 10) || 20, 100),
          sortBy: sortBy || 'dueDate',
          sortOrder: sortOrder || 'asc',
        };
  
        if (search && ValidationUtils.isNotEmpty(search)) {
          searchDto.search = search.trim();
        }
  
        if (personId && MongoUtils.isValidObjectId(personId)) {
          searchDto.personId = personId;
        }
  
        if (personType && ['student', 'teacher'].includes(personType)) {
          searchDto.personType = personType;
        }
  
        if (minDaysOverdue) {
          const minDays = parseInt(minDaysOverdue, 10);
          if (minDays > 0) {
            searchDto.minDaysOverdue = minDays;
          }
        }
  
        if (dateFrom && ValidationUtils.isNotEmpty(dateFrom)) {
          searchDto.dateFrom = dateFrom;
        }
  
        if (dateTo && ValidationUtils.isNotEmpty(dateTo)) {
          searchDto.dateTo = dateTo;
        }
  
        if (grade && ValidationUtils.isNotEmpty(grade)) {
          searchDto.grade = grade.trim();
        }
  
        this.logger.debug('Finding overdue loans with filters:', searchDto);
  
        const result = await this.overdueService.findOverdueLoans(searchDto.page, searchDto.limit);
  
        return ApiResponseDto.success(result, 'Préstamos vencidos obtenidos exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding overdue loans', {
          error: getErrorMessage(error),
          stack: getErrorStack(error)
        });
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de préstamos vencidos
     * GET /api/overdue/stats
     */
    @Get('stats')
    async getOverdueStatistics(): Promise<ApiResponseDto<OverdueStatsDto>> {
      try {
        this.logger.debug('Getting overdue statistics');
        const stats = await this.overdueService.getOverdueStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas de préstamos vencidos obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting overdue statistics', error);
        throw error;
      }
    }
  
    /**
     * Actualizar estados de préstamos vencidos
     * POST /api/overdue/update-statuses
     */
    @Post('update-statuses')
    @HttpCode(HttpStatus.OK)
    async updateOverdueStatuses(): Promise<ApiResponseDto<{ updatedCount: number }>> {
      try {
        this.logger.log('Updating overdue loan statuses');
        const result = await this.overdueService.updateOverdueStatuses();
  
        return ApiResponseDto.success(
          result, 
          `${result.updatedCount} préstamos actualizados a estado vencido`, 
          HttpStatus.OK
        );
      } catch (error) {
        this.logger.error('Error updating overdue statuses', error);
        throw error;
      }
    }
  
    /**
     * Buscar préstamos próximos a vencer
     * GET /api/overdue/near-due
     */
    @Get('near-due')
    async findLoansNearDue(
      @Query('days') days: string = '3',
    ): Promise<ApiResponseDto<OverdueResponseDto[]>> {
      try {
        const daysUntilDue = Math.min(parseInt(days, 10) || 3, 30); // Máximo 30 días
  
        this.logger.debug(`Finding loans near due in ${daysUntilDue} days`);
        const loans = await this.overdueService.findLoansNearDue(daysUntilDue);
  
        return ApiResponseDto.success(
          loans, 
          `Préstamos próximos a vencer en ${daysUntilDue} días obtenidos exitosamente`, 
          HttpStatus.OK
        );
      } catch (error) {
        this.logger.error('Error finding loans near due', error);
        throw error;
      }
    }
  }