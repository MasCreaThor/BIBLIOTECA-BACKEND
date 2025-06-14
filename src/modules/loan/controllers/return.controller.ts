// src/modules/loan/controllers/return.controller.ts
import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ReturnService } from '@modules/loan/services';
import { LoggerService } from '@shared/services/logger.service';
import {
  ReturnLoanDto,
  ReturnResponseDto,
  LoanResponseDto,
} from '@modules/loan/dto';
import { ApiResponseDto } from '@shared/dto/base.dto';
import { Roles, CurrentUserId } from '@shared/decorators/auth.decorators';
import { UserRole } from '@shared/guards/roles.guard';
import { ValidationUtils, MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';

/**
 * Controlador para gestión de devoluciones
 */
@Controller('returns')
@Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
export class ReturnController {
  constructor(
    private readonly returnService: ReturnService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ReturnController');
  }

  /**
   * Procesar devolución de préstamo
   * POST /api/returns
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async processReturn(
    @Body() returnLoanDto: ReturnLoanDto,
    @CurrentUserId() userId: string,
  ): Promise<ApiResponseDto<ReturnResponseDto>> {
    this.logger.log(`Processing return for loan: ${returnLoanDto.loanId} by user: ${userId}`);
    
    try {
      const result = await this.returnService.processReturn(returnLoanDto, userId);
      
      this.logger.log(`Return processed successfully for loan: ${returnLoanDto.loanId}`, {
        wasOverdue: result.wasOverdue,
        daysOverdue: result.daysOverdue
      });
      
      return ApiResponseDto.success(
        result, 
        result.message, 
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error(`Error processing return for loan: ${returnLoanDto.loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        returnLoanDto
      });
      throw error;
    }
  }

  /**
   * Marcar préstamo como perdido
   * PUT /api/returns/:loanId/mark-lost
   */
  @Put(':loanId/mark-lost')
  @HttpCode(HttpStatus.OK)
  async markAsLost(
    @Param('loanId') loanId: string,
    @Body() body: { observations: string },
    @CurrentUserId() userId: string,
  ): Promise<ApiResponseDto<LoanResponseDto>> {
    this.logger.log(`Marking loan as lost: ${loanId} by user: ${userId}`);
    
    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        this.logger.warn(`Invalid loan ID format: ${loanId}`);
        throw new Error('ID de préstamo inválido');
      }

      if (!body.observations || !ValidationUtils.isNotEmpty(body.observations)) {
        throw new Error('Las observaciones son requeridas para marcar como perdido');
      }

      if (body.observations.length > 500) {
        throw new Error('Las observaciones no pueden exceder 500 caracteres');
      }

      const loan = await this.returnService.markAsLost(
        loanId, 
        body.observations.trim(), 
        userId
      );
      
      this.logger.log(`Loan marked as lost successfully: ${loanId}`);
      
      return ApiResponseDto.success(
        loan, 
        'Préstamo marcado como perdido exitosamente', 
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error(`Error marking loan as lost: ${loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        observations: body.observations
      });
      throw error;
    }
  }

  /**
   * Renovar préstamo (extender fecha de vencimiento)
   * PUT /api/returns/:loanId/renew
   */
  @Put(':loanId/renew')
  @HttpCode(HttpStatus.OK)
  async renewLoan(
    @Param('loanId') loanId: string,
    @Body() body: { additionalDays?: number; reason?: string },
    @CurrentUserId() userId: string,
  ): Promise<ApiResponseDto<LoanResponseDto>> {
    this.logger.log(`Renewing loan: ${loanId} by user: ${userId}`);
    
    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        this.logger.warn(`Invalid loan ID format: ${loanId}`);
        throw new Error('ID de préstamo inválido');
      }

      const additionalDays = body.additionalDays || 15;
      
      if (additionalDays < 1 || additionalDays > 30) {
        throw new Error('Los días adicionales deben estar entre 1 y 30');
      }

      const loan = await this.returnService.renewLoan(
        loanId, 
        additionalDays, 
        userId
      );
      
      this.logger.log(`Loan renewed successfully: ${loanId} for ${additionalDays} days`);
      
      return ApiResponseDto.success(
        loan, 
        `Préstamo renovado por ${additionalDays} días adicionales`, 
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error(`Error renewing loan: ${loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        additionalDays: body.additionalDays
      });
      throw error;
    }
  }

  /**
   * Obtener devoluciones pendientes (préstamos vencidos)
   * GET /api/returns/pending
   */
  @Get('pending')
  async getPendingReturns(
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<ApiResponseDto<LoanResponseDto[]>> {
    this.logger.debug(`Getting pending returns, limit: ${limit}`);
    
    try {
      if (limit > 200) {
        limit = 200; // Límite máximo para prevenir sobrecarga
      }

      const pendingReturns = await this.returnService.getPendingReturns(limit);
      
      this.logger.debug(`Found ${pendingReturns.length} pending returns`);
      
      return ApiResponseDto.success(
        pendingReturns,
        `${pendingReturns.length} devoluciones pendientes obtenidas`,
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error('Error getting pending returns', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        limit
      });
      throw error;
    }
  }

  /**
   * Obtener historial de devoluciones
   * GET /api/returns/history
   */
  @Get('history')
  async getReturnHistory(
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe) limit: number,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ): Promise<ApiResponseDto<LoanResponseDto[]>> {
    this.logger.debug(`Getting return history from ${dateFrom} to ${dateTo}, limit: ${limit}`);
    
    try {
      if (limit > 200) {
        limit = 200; // Límite máximo para prevenir sobrecarga
      }

      const startDate = dateFrom ? new Date(dateFrom) : undefined;
      const endDate = dateTo ? new Date(dateTo) : undefined;

      const history = await this.returnService.getReturnHistory(startDate, endDate, limit);
      
      this.logger.debug(`Found ${history.length} returns in history`);
      
      return ApiResponseDto.success(
        history,
        `${history.length} devoluciones encontradas en el historial`,
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error('Error getting return history', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        dateFrom,
        dateTo,
        limit
      });
      throw error;
    }
  }

  /**
   * Obtener estadísticas de devoluciones
   * GET /api/returns/stats
   */
  @Get('stats')
  async getReturnStats(
    @Query('period') period: 'today' | 'week' | 'month' | 'year' = 'month',
  ): Promise<ApiResponseDto<{
    totalReturns: number;
    onTimeReturns: number;
    lateReturns: number;
    averageLateDays: number;
    lostResources: number;
    period: string;
    dateRange: { start: string; end: string };
  }>> {
    this.logger.debug(`Getting return statistics for period: ${period}`);
    
    try {
      // Calcular rango de fechas según el período
      const now = new Date();
      let startDate: Date;
      let endDate = now;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const returnHistory = await this.returnService.getReturnHistory(
        startDate,
        endDate,
        1000
      );

      // Calcular estadísticas
      const totalReturns = returnHistory.length;
      let onTimeReturns = 0;
      let lateReturns = 0;
      let totalLateDays = 0;
      let lostResources = 0;

      returnHistory.forEach(loan => {
        if (loan.returnedDate) {
          const returnDate = new Date(loan.returnedDate);
          const dueDate = new Date(loan.dueDate);
          
          if (returnDate <= dueDate) {
            onTimeReturns++;
          } else {
            lateReturns++;
            const lateDays = Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
            totalLateDays += lateDays;
          }
        }

        // Contar recursos perdidos
        if (loan.status?.name === 'lost') {
          lostResources++;
        }
      });

      const averageLateDays = lateReturns > 0 ? totalLateDays / lateReturns : 0;

      const stats = {
        totalReturns,
        onTimeReturns,
        lateReturns,
        averageLateDays: Math.round(averageLateDays * 100) / 100,
        lostResources,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };
      
      this.logger.debug(`Return statistics for ${period}:`, stats);
      
      return ApiResponseDto.success(
        stats,
        `Estadísticas de devoluciones para ${period} obtenidas`,
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error getting return statistics for period: ${period}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * Procesar devolución múltiple (batch)
   * POST /api/returns/batch
   */
  @Post('batch')
  @HttpCode(HttpStatus.OK)
  async processBatchReturns(
    @Body() body: { 
      returns: Array<{
        loanId: string;
        returnDate?: string;
        resourceCondition?: 'good' | 'deteriorated' | 'damaged' | 'lost';
        returnObservations?: string;
      }>;
    },
    @CurrentUserId() userId: string,
  ): Promise<ApiResponseDto<{
    successCount: number;
    errorCount: number;
    results: Array<{
      loanId: string;
      success: boolean;
      result?: ReturnResponseDto;
      error?: string;
    }>;
  }>> {
    this.logger.log(`Processing batch returns: ${body.returns?.length || 0} items by user: ${userId}`);
    
    try {
      if (!body.returns || !Array.isArray(body.returns) || body.returns.length === 0) {
        throw new Error('No se proporcionaron devoluciones para procesar');
      }

      if (body.returns.length > 50) {
        throw new Error('No se pueden procesar más de 50 devoluciones a la vez');
      }

      const results = await this.returnService.processBatchReturns(body.returns, userId);
      
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      this.logger.log(`Batch returns processed: ${successCount} success, ${errorCount} errors`);
      
      return ApiResponseDto.success(
        {
          successCount,
          errorCount,
          results
        },
        `Procesadas ${successCount} devoluciones exitosamente, ${errorCount} con error`,
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error('Error processing batch returns', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        returnsCount: body.returns?.length
      });
      throw error;
    }
  }

  /**
   * Verificar estado de devolución de un préstamo
   * GET /api/returns/:loanId/status
   */
  @Get(':loanId/status')
  async getReturnStatus(
    @Param('loanId') loanId: string,
  ): Promise<ApiResponseDto<{
    loanId: string;
    canReturn: boolean;
    isReturned: boolean;
    isOverdue: boolean;
    daysOverdue?: number;
    dueDate: Date;
    reason?: string;
  }>> {
    this.logger.debug(`Getting return status for loan: ${loanId}`);
    
    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        this.logger.warn(`Invalid loan ID format: ${loanId}`);
        throw new Error('ID de préstamo inválido');
      }

      // Esta funcionalidad podría implementarse en el ReturnService
      // Por ahora, retornamos información básica
      
      const status = {
        loanId,
        canReturn: true,
        isReturned: false,
        isOverdue: false,
        dueDate: new Date(),
        reason: 'Información no disponible - implementar en ReturnService'
      };
      
      return ApiResponseDto.success(
        status,
        'Estado de devolución obtenido',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error getting return status for loan: ${loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw error;
    }
  }
}