// src/modules/loan/controllers/can-borrow.controller.ts
import {
    Controller,
    Get,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { LoanValidationService } from '@modules/loan/services';
  import { LoggerService } from '@shared/services/logger.service';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { MongoUtils } from '@shared/utils';
  import { getErrorMessage, getErrorStack } from '@shared/utils/error-utils';
  
  /**
   * Controlador para verificación de disponibilidad de préstamos
   */
  @Controller('loans')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class CanBorrowController {
    constructor(
      private readonly loanValidationService: LoanValidationService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('CanBorrowController');
    }
  
    /**
     * Verificar si una persona puede pedir préstamos
     * GET /api/loans/can-borrow/:personId
     */
    @Get('can-borrow/:personId')
    @HttpCode(HttpStatus.OK)
    async canPersonBorrow(
      @Param('personId') personId: string,
    ): Promise<ApiResponseDto<{
      canBorrow: boolean;
      reason?: string;
      activeLoansCount?: number;
      hasOverdueLoans?: boolean;
      maxLoansAllowed?: number;
    }>> {
      this.logger.debug(`Checking if person can borrow: ${personId}`);
  
      try {
        if (!MongoUtils.isValidObjectId(personId)) {
          this.logger.warn(`Invalid person ID format: ${personId}`);
          return ApiResponseDto.success(
            {
              canBorrow: false,
              reason: 'ID de persona inválido',
              maxLoansAllowed: 3
            },
            'Verificación completada',
            HttpStatus.OK
          );
        }
  
        const result = await this.loanValidationService.canPersonBorrow(personId);
        
        this.logger.debug(`Can borrow result for person ${personId}:`, result);
        
        return ApiResponseDto.success(
          result,
          'Verificación de disponibilidad completada exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error checking if person can borrow: ${personId}`, {
          error: getErrorMessage(error),
          stack: getErrorStack(error)
        });
        
        // En caso de error, devolver respuesta negativa por seguridad
        return ApiResponseDto.success(
          {
            canBorrow: false,
            reason: 'Error interno en la verificación',
            maxLoansAllowed: 3
          },
          'Error en la verificación',
          HttpStatus.OK
        );
      }
    }
  
    /**
     * Verificar si un recurso puede ser prestado
     * GET /api/loans/can-lend/:resourceId
     */
    @Get('can-lend/:resourceId')
    @HttpCode(HttpStatus.OK)
    async canLendResource(
      @Param('resourceId') resourceId: string,
    ): Promise<ApiResponseDto<{
      canBorrow: boolean;
      reason?: string;
      resource?: any;
    }>> {
      this.logger.debug(`Checking if resource can be lent: ${resourceId}`);
  
      try {
        if (!MongoUtils.isValidObjectId(resourceId)) {
          this.logger.warn(`Invalid resource ID format: ${resourceId}`);
          return ApiResponseDto.success(
            {
              canBorrow: false,
              reason: 'ID de recurso inválido'
            },
            'Verificación completada',
            HttpStatus.OK
          );
        }
  
        const result = await this.loanValidationService.validateResourceForLoan(resourceId);
        
        this.logger.debug(`Can lend result for resource ${resourceId}:`, result);
        
        return ApiResponseDto.success(
          result,
          'Verificación de disponibilidad del recurso completada',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error checking if resource can be lent: ${resourceId}`, {
          error: getErrorMessage(error),
          stack: getErrorStack(error)
        });
        
        // En caso de error, devolver respuesta negativa por seguridad
        return ApiResponseDto.success(
          {
            canBorrow: false,
            reason: 'Error interno en la verificación del recurso'
          },
          'Error en la verificación del recurso',
          HttpStatus.OK
        );
      }
    }
  
    /**
     * Obtener configuración de límites de préstamos
     * GET /api/loans/config/limits
     */
    @Get('config/limits')
    @HttpCode(HttpStatus.OK)
    async getConfigurationLimits(): Promise<ApiResponseDto<{
      maxLoansPerPerson: number;
      maxLoanDays: number;
      minQuantity: number;
      maxQuantity: number;
    }>> {
      this.logger.debug('Getting loan configuration limits');
  
      try {
        const limits = this.loanValidationService.getConfigurationLimits();
        
        this.logger.debug('Loan configuration limits:', limits);
        
        return ApiResponseDto.success(
          limits,
          'Configuración de límites obtenida exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting configuration limits', {
          error: getErrorMessage(error),
          stack: getErrorStack(error)
        });
        
        // Valores por defecto en caso de error
        return ApiResponseDto.success(
          {
            maxLoansPerPerson: 3,
            maxLoanDays: 15,
            minQuantity: 1,
            maxQuantity: 5
          },
          'Configuración de límites (valores por defecto)',
          HttpStatus.OK
        );
      }
    }
  }