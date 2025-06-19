// src/modules/loan/controllers/can-borrow.controller.ts - ACTUALIZADO CON ENDPOINTS DE STOCK
import {
  Controller,
  Get,
  Param,
  HttpCode,
  HttpStatus,
  Post,
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

  /**
   * ✅ DEBUG: Verificar disponibilidad de stock de un recurso específico
   * GET /api/loans/debug-resource-stock/:resourceId
   */
  @Get('debug-resource-stock/:resourceId')
  @HttpCode(HttpStatus.OK)
  async debugResourceStock(
    @Param('resourceId') resourceId: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.debug(`Debugging resource stock: ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        this.logger.warn(`Invalid resource ID format: ${resourceId}`);
        return ApiResponseDto.success(
          { error: 'ID de recurso inválido' },
          'ID de recurso inválido',
          HttpStatus.OK
        );
      }

      // Obtener información del recurso
      const resource = await this.loanValidationService['resourceRepository'].findById(resourceId);
      if (!resource) {
        return ApiResponseDto.success(
          { error: 'Recurso no encontrado' },
          'Recurso no encontrado',
          HttpStatus.OK
        );
      }

      // Obtener préstamos activos con cantidades
      const activeLoans = await this.loanValidationService['loanRepository'].findActiveLoansWithQuantityByResource(resourceId);
      
      // Contar préstamos (método anterior)
      const loanCount = await this.loanValidationService['loanRepository'].countActiveByResource(resourceId);
      
      // Sumar cantidades (método corregido)
      const totalQuantityLoaned = await this.loanValidationService['loanRepository'].getTotalQuantityLoanedByResource(resourceId);

      const result = {
        resource: {
          _id: resource._id,
          title: resource.title,
          totalQuantity: resource.totalQuantity,
          available: resource.available,
          state: resource.stateId
        },
        stockAnalysis: {
          totalQuantity: resource.totalQuantity,
          loanCount: loanCount, // Número de préstamos
          totalQuantityLoaned: totalQuantityLoaned, // Cantidad total prestada
          availableQuantity: resource.totalQuantity - totalQuantityLoaned,
          canLoan: resource.available && (resource.totalQuantity - totalQuantityLoaned) > 0
        },
        activeLoans: activeLoans.map(loan => ({
          loanId: loan._id,
          personId: loan.personId,
          quantity: loan.quantity,
          loanDate: loan.loanDate,
          dueDate: loan.dueDate
        }))
      };
      
      this.logger.debug(`Resource stock debug for ${resourceId}:`, result);
      
      return ApiResponseDto.success(
        result,
        'Información de stock obtenida exitosamente',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error debugging resource stock: ${resourceId}`, error);
      throw error;
    }
  }

  /**
   * ✅ CORRECCIÓN: Corregir disponibilidad de un recurso basado en su stock real
   * POST /api/loans/fix-resource-availability/:resourceId
   */
  @Post('fix-resource-availability/:resourceId')
  @HttpCode(HttpStatus.OK)
  async fixResourceAvailability(
    @Param('resourceId') resourceId: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.debug(`Fixing resource availability: ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        this.logger.warn(`Invalid resource ID format: ${resourceId}`);
        return ApiResponseDto.success(
          { error: 'ID de recurso inválido' },
          'ID de recurso inválido',
          HttpStatus.OK
        );
      }

      // Obtener información del recurso
      const resource = await this.loanValidationService['resourceRepository'].findById(resourceId);
      if (!resource) {
        return ApiResponseDto.success(
          { error: 'Recurso no encontrado' },
          'Recurso no encontrado',
          HttpStatus.OK
        );
      }

      // Obtener cantidad total prestada
      const totalQuantityLoaned = await this.loanValidationService['loanRepository'].getTotalQuantityLoanedByResource(resourceId);
      
      // Calcular cantidad disponible real
      const availableQuantity = Math.max(0, resource.totalQuantity - totalQuantityLoaned);
      
      // Determinar si el recurso debería estar disponible
      const shouldBeAvailable = availableQuantity > 0;
      
      // Determinar el estado correcto del recurso
      let correctStateId = resource.stateId;
      let stateChanged = false;
      
      if (availableQuantity > 0) {
        // Si hay stock disponible, el estado debería ser "good" (bueno)
        // Buscar el estado "good" en la base de datos
        const goodState = await this.loanValidationService['resourceRepository'].findByIdWithPopulate(resourceId);
        
        if (goodState && goodState.stateId) {
          const currentState = goodState.stateId as any;
          if (currentState.name === 'lost' || currentState.name === 'damaged') {
            // Buscar el estado "good" para actualizarlo
            const ResourceStateModel = this.loanValidationService['resourceRepository']['resourceModel'].db.collection('resourcestates');
            const goodStateDoc = await ResourceStateModel.findOne({ name: 'good' });
            
            if (goodStateDoc) {
              correctStateId = goodStateDoc._id;
              stateChanged = true;
            }
          }
        }
      }
      
      // Solo actualizar si es necesario
      let updatedResource = resource;
      const updateData: any = {};
      let needsUpdate = false;
      
      if (resource.available !== shouldBeAvailable) {
        updateData.available = shouldBeAvailable;
        needsUpdate = true;
      }
      
      if (stateChanged && correctStateId !== resource.stateId) {
        updateData.stateId = correctStateId;
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        const updated = await this.loanValidationService['resourceRepository'].update(resourceId, updateData);
        if (updated) {
          updatedResource = updated;
        }
      }

      const result = {
        resource: {
          _id: resource._id,
          title: resource.title,
          totalQuantity: resource.totalQuantity,
          previousAvailable: resource.available,
          newAvailable: shouldBeAvailable,
          state: resource.stateId
        },
        stockAnalysis: {
          totalQuantity: resource.totalQuantity,
          totalQuantityLoaned,
          availableQuantity,
          shouldBeAvailable,
          corrected: resource.available !== shouldBeAvailable
        }
      };
      
      this.logger.debug(`Resource availability fixed for ${resourceId}:`, result);
      
      return ApiResponseDto.success(
        result,
        'Disponibilidad del recurso corregida exitosamente',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error fixing resource availability: ${resourceId}`, error);
      throw error;
    }
  }

  /**
   * ✅ CORRECCIÓN ESPECÍFICA: Corregir estado de recurso de "lost" a "good"
   * POST /api/loans/fix-resource-state/:resourceId
   */
  @Post('fix-resource-state/:resourceId')
  @HttpCode(HttpStatus.OK)
  async fixResourceState(
    @Param('resourceId') resourceId: string,
  ): Promise<ApiResponseDto<any>> {
    this.logger.debug(`Fixing resource state: ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        this.logger.warn(`Invalid resource ID format: ${resourceId}`);
        return ApiResponseDto.success(
          { error: 'ID de recurso inválido' },
          'ID de recurso inválido',
          HttpStatus.OK
        );
      }

      // Obtener información del recurso con populate
      const resource = await this.loanValidationService['resourceRepository'].findByIdWithPopulate(resourceId);
      if (!resource) {
        return ApiResponseDto.success(
          { error: 'Recurso no encontrado' },
          'Recurso no encontrado',
          HttpStatus.OK
        );
      }

      // Verificar si el recurso está en estado "lost" o "damaged"
      let currentStateName = 'unknown';
      if (resource.stateId && typeof resource.stateId === 'object' && (resource.stateId as any).name) {
        currentStateName = (resource.stateId as any).name;
      }

      this.logger.debug(`Current resource state: ${currentStateName}`);

      // Solo corregir si está en estado problemático
      if (currentStateName === 'lost' || currentStateName === 'damaged') {
        // Buscar el estado "good" directamente en la colección
        const db = this.loanValidationService['resourceRepository']['resourceModel'].db;
        const goodState = await db.collection('resourcestates').findOne({ name: 'good' });
        
        if (goodState) {
          // Actualizar el recurso con el estado "good"
          const updateData = {
            stateId: goodState._id,
            available: true
          };
          
          const updated = await this.loanValidationService['resourceRepository'].update(resourceId, updateData);
          
          if (updated) {
            this.logger.debug(`Resource state updated from ${currentStateName} to good`);
            
            return ApiResponseDto.success(
              {
                resource: {
                  _id: resource._id,
                  title: resource.title,
                  previousState: currentStateName,
                  newState: 'good',
                  stateId: goodState._id
                },
                corrected: true,
                message: `Estado del recurso corregido de "${currentStateName}" a "good"`
              },
              'Estado del recurso corregido exitosamente',
              HttpStatus.OK,
            );
          }
        } else {
          this.logger.error('Good state not found in database');
          return ApiResponseDto.success(
            { error: 'Estado "good" no encontrado en la base de datos' },
            'Error al corregir estado del recurso',
            HttpStatus.OK
          );
        }
      } else {
        return ApiResponseDto.success(
          {
            resource: {
              _id: resource._id,
              title: resource.title,
              currentState: currentStateName
            },
            corrected: false,
            message: `El recurso ya está en estado correcto: ${currentStateName}`
          },
          'El recurso ya tiene un estado correcto',
          HttpStatus.OK,
        );
      }
      
      // Return por defecto en caso de que no se actualice
      return ApiResponseDto.success(
        { error: 'No se pudo actualizar el recurso' },
        'Error al actualizar el recurso',
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error(`Error fixing resource state: ${resourceId}`, error);
      throw error;
    }
  }
}