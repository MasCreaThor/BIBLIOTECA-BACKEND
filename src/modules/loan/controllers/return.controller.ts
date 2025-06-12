// src/modules/loan/controllers/return.controller.ts
import {
    Controller,
    Post,
    Put,
    Body,
    Param,
    HttpCode,
    HttpStatus,
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
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
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
      try {
        this.logger.log(`Processing return for loan: ${returnLoanDto.loanId}`);
        
        const result = await this.returnService.processReturn(returnLoanDto, userId);
        
        return ApiResponseDto.success(result, result.message, HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error processing return for loan: ${returnLoanDto.loanId}`, error);
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
      try {
        if (!MongoUtils.isValidObjectId(loanId)) {
          this.logger.warn(`Invalid loan ID format: ${loanId}`);
          throw new Error('ID de préstamo inválido');
        }
  
        if (!body.observations || !ValidationUtils.isNotEmpty(body.observations)) {
          throw new Error('Las observaciones son requeridas para marcar como perdido');
        }
  
        this.logger.log(`Marking loan as lost: ${loanId}`);
        
        const loan = await this.returnService.markAsLost(loanId, body.observations, userId);
        
        return ApiResponseDto.success(loan, 'Préstamo marcado como perdido exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error marking loan as lost: ${loanId}`, error);
        throw error;
      }
    }
  }