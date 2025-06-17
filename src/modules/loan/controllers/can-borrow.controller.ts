// src/modules/loan/controllers/can-borrow.controller.ts - ACTUALIZADO CON ENDPOINTS DE STOCK
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
 * Controlador para verificación de disponibilidad de préstamos y stock
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
            reason: 'ID de persona inválido'
          },
          'Verificación completada',
          HttpStatus.OK
        );
      }

      const result = await this.loanValidationService.canPersonBorrow(personId);
      
      this.logger.debug(`Can borrow result for person ${personId}:`, result);
      
      return ApiResponseDto.success(
        result,
        'Verificación de elegibilidad completada',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error checking if person can borrow: ${personId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      
      return ApiResponseDto.success(
        {
          canBorrow: false,
          reason: 'Error interno en la verificación'
        },
        'Error en la verificación de elegibilidad',
        HttpStatus.OK
      );
    }
  }

  /**
   * ✅ NUEVO: Verificar disponibilidad de stock de un recurso
   * GET /api/loans/resource-availability/:resourceId
   */
  @Get('resource-availability/:resourceId')
  @HttpCode(HttpStatus.OK)
  async checkResourceAvailability(
    @Param('resourceId') resourceId: string,
  ): Promise<ApiResponseDto<{
    totalQuantity: number;
    currentLoans: number;
    availableQuantity: number;
    canLoan: boolean;
    resource: {
      _id: string;
      title: string;
      available: boolean;
    };
  }>> {
    this.logger.debug(`Checking resource availability: ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        this.logger.warn(`Invalid resource ID format: ${resourceId}`);
        return ApiResponseDto.success(
          {
            totalQuantity: 0,
            currentLoans: 0,
            availableQuantity: 0,
            canLoan: false,
            resource: {
              _id: resourceId,
              title: 'Recurso inválido',
              available: false
            }
          },
          'ID de recurso inválido',
          HttpStatus.OK
        );
      }

      const result = await this.loanValidationService.getResourceAvailabilityInfo(resourceId);
      
      this.logger.debug(`Resource availability for ${resourceId}:`, result);
      
      return ApiResponseDto.success(
        result,
        'Información de disponibilidad obtenida exitosamente',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error checking resource availability: ${resourceId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      
      return ApiResponseDto.success(
        {
          totalQuantity: 0,
          currentLoans: 0,
          availableQuantity: 0,
          canLoan: false,
          resource: {
            _id: resourceId,
            title: 'Error al cargar recurso',
            available: false
          }
        },
        'Error al verificar disponibilidad del recurso',
        HttpStatus.OK
      );
    }
  }

  /**
   * ✅ NUEVO: Obtener cantidad máxima que puede prestar una persona para un recurso específico
   * GET /api/loans/max-quantity/:personId/:resourceId
   */
  @Get('max-quantity/:personId/:resourceId')
  @HttpCode(HttpStatus.OK)
  async getMaxQuantityForPerson(
    @Param('personId') personId: string,
    @Param('resourceId') resourceId: string,
  ): Promise<ApiResponseDto<{
    maxQuantity: number;
    reason: string;
    personType: string;
    resourceInfo: {
      totalQuantity: number;
      currentLoans: number;
      availableQuantity: number;
    };
  }>> {
    this.logger.debug(`Getting max quantity for person ${personId} and resource ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        return ApiResponseDto.success(
          {
            maxQuantity: 0,
            reason: 'ID de persona inválido',
            personType: 'unknown',
            resourceInfo: {
              totalQuantity: 0,
              currentLoans: 0,
              availableQuantity: 0
            }
          },
          'ID de persona inválido',
          HttpStatus.OK
        );
      }

      if (!MongoUtils.isValidObjectId(resourceId)) {
        return ApiResponseDto.success(
          {
            maxQuantity: 0,
            reason: 'ID de recurso inválido',
            personType: 'unknown',
            resourceInfo: {
              totalQuantity: 0,
              currentLoans: 0,
              availableQuantity: 0
            }
          },
          'ID de recurso inválido',
          HttpStatus.OK
        );
      }

      // Obtener información de cantidad máxima
      const maxQuantityResult = await this.loanValidationService.getMaxQuantityForPerson(personId, resourceId);
      
      // Obtener información adicional del recurso
      const resourceAvailability = await this.loanValidationService.getResourceAvailabilityInfo(resourceId);

      const result = {
        maxQuantity: maxQuantityResult.maxQuantity,
        reason: maxQuantityResult.reason,
        personType: maxQuantityResult.personType,
        resourceInfo: {
          totalQuantity: resourceAvailability.totalQuantity,
          currentLoans: resourceAvailability.currentLoans,
          availableQuantity: resourceAvailability.availableQuantity
        }
      };
      
      this.logger.debug(`Max quantity result:`, result);
      
      return ApiResponseDto.success(
        result,
        'Cantidad máxima calculada exitosamente',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error getting max quantity for person ${personId} and resource ${resourceId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      
      return ApiResponseDto.success(
        {
          maxQuantity: 0,
          reason: 'Error interno en el cálculo',
          personType: 'unknown',
          resourceInfo: {
            totalQuantity: 0,
            currentLoans: 0,
            availableQuantity: 0
          }
        },
        'Error al calcular cantidad máxima',
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