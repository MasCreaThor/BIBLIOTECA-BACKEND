// src/modules/loan/services/loan-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { LoanRepository } from '@modules/loan/repositories';
import { PersonRepository } from '@modules/person/repositories';
import { PersonTypeRepository } from '@modules/person/repositories';
import { ResourceRepository } from '@modules/resource/repositories';
import { LoggerService } from '@shared/services/logger.service';
import { MongoUtils } from '@shared/utils';
import { Types } from 'mongoose';

@Injectable()
export class LoanValidationService {
  private readonly MAX_LOANS_PER_PERSON = 3;
  private readonly MAX_LOAN_DAYS = 15;
  private readonly MIN_QUANTITY = 1;
  private readonly MAX_QUANTITY = 5;

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly personRepository: PersonRepository,
    private readonly personTypeRepository: PersonTypeRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LoanValidationService');
  }

  /**
   * ✅ ACTUALIZADO: Validar que se puede realizar un préstamo con cantidad y reglas por tipo
   */
  async validateLoanCreation(personId: string, resourceId: string, quantity: number = 1): Promise<void> {
    this.logger.debug(`Validating loan creation for person ${personId}, resource ${resourceId}, quantity ${quantity}`);

    try {
      // Validación básica de parámetros
      await this.validateBasicParameters(personId, resourceId, quantity);

      // Validar persona
      const person = await this.validatePerson(personId);

      // Validar recurso y disponibilidad de stock
      await this.validateResourceWithStock(resourceId, quantity);

      // ✅ NUEVO: Validar cantidad según tipo de persona
      await this.validateQuantityByPersonType(person, resourceId, quantity);

      // Validar límites de préstamos
      await this.validateLoanLimits(personId);

      // Validar préstamos vencidos
      await this.validateOverdueLoans(personId);

      this.logger.debug(`All loan validations passed for person ${personId} and resource ${resourceId}`);
    } catch (error) {
      this.handleValidationError(error, `person ${personId} and resource ${resourceId}`);
      throw error;
    }
  }

  /**
   * ✅ ACTUALIZADO: Validar parámetros básicos con validación de cantidad mejorada
   */
  private async validateBasicParameters(personId: string, resourceId: string, quantity: number): Promise<void> {
    // Validar IDs
    if (!MongoUtils.isValidObjectId(personId)) {
      throw new BadRequestException('ID de persona inválido');
    }

    if (!MongoUtils.isValidObjectId(resourceId)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    // Validar cantidad
    if (!Number.isInteger(quantity) || quantity < this.MIN_QUANTITY) {
      throw new BadRequestException(`La cantidad debe ser un número entero mayor a ${this.MIN_QUANTITY - 1}`);
    }

    if (quantity > this.MAX_QUANTITY) {
      throw new BadRequestException(`La cantidad no puede exceder ${this.MAX_QUANTITY} unidades`);
    }
  }

  /**
   * ✅ ACTUALIZADO: Validar persona y retornar datos
   */
  private async validatePerson(personId: string): Promise<any> {
    this.logger.debug(`Validating person: ${personId}`);

    const person = await this.personRepository.findByIdWithPopulate(personId);
    if (!person) {
      throw new BadRequestException('La persona especificada no existe');
    }

    if (!person.active) {
      throw new BadRequestException('La persona no está activa en el sistema');
    }

    // Validaciones adicionales según el tipo de persona
    if (person.personTypeId) {
      const personType = person.personTypeId as any;
      if (personType && !personType.active) {
        throw new BadRequestException('El tipo de persona no está activo');
      }
    }

    this.logger.debug(`Person validation passed: ${personId}`);
    return person;
  }

  /**
   * ✅ NUEVO: Validar recurso con verificación de stock disponible
   */
  private async validateResourceWithStock(resourceId: string, requestedQuantity: number): Promise<void> {
    this.logger.debug(`Validating resource with stock: ${resourceId} for quantity: ${requestedQuantity}`);

    const resource = await this.resourceRepository.findByIdWithPopulate(resourceId);
    if (!resource) {
      throw new BadRequestException('El recurso especificado no existe');
    }

    if (!resource.available) {
      throw new BadRequestException('El recurso no está disponible para préstamo');
    }

    // Verificar estado del recurso
    if (resource.stateId) {
      const resourceState = resource.stateId as any;
      if (resourceState.name === 'damaged' || resourceState.name === 'lost') {
        throw new BadRequestException(
          `El recurso no se puede prestar porque está en estado: ${resourceState.description}`
        );
      }
    }

    // ✅ NUEVA VALIDACIÓN: Verificar stock disponible
    const currentLoans = await this.loanRepository.countActiveByResource(resourceId);
    const availableQuantity = resource.totalQuantity - currentLoans;

    if (availableQuantity < requestedQuantity) {
      throw new BadRequestException(
        `No hay suficientes unidades disponibles. ` +
        `Solicitado: ${requestedQuantity}, Disponible: ${availableQuantity}, Total: ${resource.totalQuantity}`
      );
    }

    this.logger.debug(`Resource stock validation passed: ${availableQuantity}/${resource.totalQuantity} available`);
  }

  private async validateQuantityByPersonType(person: any, resourceId: string, requestedQuantity: number): Promise<void> {
    this.logger.debug(`Validating quantity by person type for person: ${person._id}`);

    let personType: any = null;

    // Obtener tipo de persona
    if ((person as any).personType) {
      personType = (person as any).personType;
    } else if (person.personTypeId) {
      personType = await this.personTypeRepository.findById(person.personTypeId.toString());
    }

    if (!personType) {
      throw new BadRequestException('No se pudo determinar el tipo de persona');
    }

    // ✅ REGLAS ESPECÍFICAS POR TIPO
    if (personType.name === 'student') {
      // ESTUDIANTES: máximo 1 unidad
      if (requestedQuantity > 1) {
        throw new BadRequestException(
          `Los estudiantes solo pueden prestar 1 unidad a la vez. Solicitado: ${requestedQuantity}`
        );
      }
    } else if (personType.name === 'teacher') {
      // PROFESORES: pueden prestar toda la cantidad disponible
      const resource = await this.resourceRepository.findById(resourceId);
      if (!resource) {
        throw new BadRequestException('Recurso no encontrado');
      }
      const currentLoans = await this.loanRepository.countActiveByResource(resourceId);
      const maxAvailable = resource.totalQuantity - currentLoans;

      if (requestedQuantity > maxAvailable) {
        throw new BadRequestException(
          `Los profesores pueden prestar hasta ${maxAvailable} unidades disponibles. Solicitado: ${requestedQuantity}`
        );
      }
    } else {
      // OTROS TIPOS: usar límite general
      if (requestedQuantity > this.MAX_QUANTITY) {
        throw new BadRequestException(
          `Cantidad máxima permitida: ${this.MAX_QUANTITY}. Solicitado: ${requestedQuantity}`
        );
      }
    }

    this.logger.debug(`Quantity validation passed for ${personType.name}: ${requestedQuantity} units`);
  }

  private async validateLoanLimits(personId: string): Promise<void> {
    this.logger.debug(`Validating loan limits for person: ${personId}`);

    const activeLoansCount = await this.loanRepository.countActiveByPerson(personId);
    
    if (activeLoansCount >= this.MAX_LOANS_PER_PERSON) {
      throw new BadRequestException(
        `La persona ya tiene ${activeLoansCount} préstamos activos. Máximo permitido: ${this.MAX_LOANS_PER_PERSON}`
      );
    }

    this.logger.debug(`Loan limits validation passed: ${activeLoansCount}/${this.MAX_LOANS_PER_PERSON}`);
  }

  private async validateOverdueLoans(personId: string): Promise<void> {
    this.logger.debug(`Validating overdue loans for person: ${personId}`);

    const hasOverdueLoans = await this.hasOverdueLoans(personId);
    if (hasOverdueLoans) {
      const overdueLoans = await this.loanRepository.findOverdueByPerson(personId);
      const overdueCount = overdueLoans.length;
      
      throw new BadRequestException(
        `La persona tiene ${overdueCount} préstamo${overdueCount > 1 ? 's' : ''} vencido${overdueCount > 1 ? 's' : ''}. Debe devolverlo${overdueCount > 1 ? 's' : ''} antes de solicitar nuevos préstamos.`
      );
    }

    this.logger.debug(`Overdue loans validation passed for person: ${personId}`);
  }

  /**
   * ✅ NUEVO: Obtener información de disponibilidad detallada
   */
  async getResourceAvailabilityInfo(resourceId: string): Promise<{
    totalQuantity: number;
    currentLoans: number;
    availableQuantity: number;
    canLoan: boolean;
    resource: {
      _id: string;
      title: string;
      available: boolean;
    };
  }> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        throw new BadRequestException('ID de recurso inválido');
      }

      const resource = await this.resourceRepository.findById(resourceId);
      if (!resource) {
        throw new BadRequestException('Recurso no encontrado');
      }

      const currentLoans = await this.loanRepository.countActiveByResource(resourceId);
      const availableQuantity = resource.totalQuantity - currentLoans;

      if (resource) {
        const resourceId = resource._id instanceof Types.ObjectId ? resource._id.toString() : resource._id as string;
        return {
          totalQuantity: resource.totalQuantity,
          currentLoans,
          availableQuantity: Math.max(0, availableQuantity),
          canLoan: resource.available && availableQuantity > 0,
          resource: {
            _id: resourceId,
            title: resource.title,
            available: resource.available
          }
        };
      }

      throw new BadRequestException('Recurso no encontrado');
    } catch (error) {
      this.logger.error(`Error getting availability info for resource: ${resourceId}`, error);
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener cantidad máxima que puede prestar una persona para un recurso
   */
  async getMaxQuantityForPerson(personId: string, resourceId: string): Promise<{
    maxQuantity: number;
    reason: string;
    personType: string;
  }> {
    try {
      const person = await this.personRepository.findByIdWithPopulate(personId);
      if (!person) {
        throw new BadRequestException('Persona no encontrada');
      }

      const resource = await this.resourceRepository.findById(resourceId);
      if (!resource) {
        throw new BadRequestException('Recurso no encontrado');
      }

      const currentLoans = await this.loanRepository.countActiveByResource(resourceId);
      const availableQuantity = resource.totalQuantity - currentLoans;

      let personType: any = null;
      if ((person as any).personType) {
        personType = (person as any).personType;
      } else if (person.personTypeId) {
        personType = await this.personTypeRepository.findById(person.personTypeId.toString());
      }

      if (!personType) {
        return {
          maxQuantity: 0,
          reason: 'No se pudo determinar el tipo de persona',
          personType: 'unknown'
        };
      }

      let maxQuantity = 0;
      let reason = '';

      if (personType.name === 'student') {
        maxQuantity = Math.min(1, availableQuantity);
        reason = 'Los estudiantes pueden prestar máximo 1 unidad';
      } else if (personType.name === 'teacher') {
        maxQuantity = availableQuantity;
        reason = 'Los profesores pueden prestar toda la cantidad disponible';
      } else {
        maxQuantity = Math.min(this.MAX_QUANTITY, availableQuantity);
        reason = `Máximo general: ${this.MAX_QUANTITY} unidades`;
      }

      return {
        maxQuantity: Math.max(0, maxQuantity),
        reason,
        personType: personType.name
      };
    } catch (error) {
      this.logger.error(`Error getting max quantity for person ${personId} and resource ${resourceId}`, error);
      throw error;
    }
  }

  // ✅ MÉTODOS EXISTENTES MANTENIDOS
  private async hasOverdueLoans(personId: string): Promise<boolean> {
    try {
      const overdueLoans = await this.loanRepository.findOverdueByPerson(personId);
      return overdueLoans.length > 0;
    } catch (error) {
      this.handleError(error, `checking overdue loans for person ${personId}`);
      return true;
    }
  }

  async canPersonBorrow(personId: string): Promise<{
    canBorrow: boolean;
    reason?: string;
    activeLoansCount?: number;
    hasOverdueLoans?: boolean;
    maxLoansAllowed?: number;
  }> {
    this.logger.debug(`Checking if person can borrow: ${personId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        return {
          canBorrow: false,
          reason: 'ID de persona inválido'
        };
      }

      const person = await this.personRepository.findById(personId);
      if (!person) {
        return {
          canBorrow: false,
          reason: 'La persona no existe'
        };
      }

      if (!person.active) {
        return {
          canBorrow: false,
          reason: 'La persona no está activa'
        };
      }

      const activeLoansCount = await this.loanRepository.countActiveByPerson(personId);
      const hasOverdueLoans = await this.hasOverdueLoans(personId);

      if (hasOverdueLoans) {
        return {
          canBorrow: false,
          reason: 'La persona tiene préstamos vencidos',
          activeLoansCount,
          hasOverdueLoans: true,
          maxLoansAllowed: this.MAX_LOANS_PER_PERSON
        };
      }

      if (activeLoansCount >= this.MAX_LOANS_PER_PERSON) {
        return {
          canBorrow: false,
          reason: `Se ha alcanzado el límite máximo de ${this.MAX_LOANS_PER_PERSON} préstamos`,
          activeLoansCount,
          hasOverdueLoans: false,
          maxLoansAllowed: this.MAX_LOANS_PER_PERSON
        };
      }

      return {
        canBorrow: true,
        activeLoansCount,
        hasOverdueLoans: false,
        maxLoansAllowed: this.MAX_LOANS_PER_PERSON
      };
    } catch (error) {
      this.handleError(error, `checking if person can borrow: ${personId}`);
      return {
        canBorrow: false,
        reason: 'Error interno de validación'
      };
    }
  }

  getConfigurationLimits(): {
    maxLoansPerPerson: number;
    maxLoanDays: number;
    minQuantity: number;
    maxQuantity: number;
  } {
    return {
      maxLoansPerPerson: this.MAX_LOANS_PER_PERSON,
      maxLoanDays: this.MAX_LOAN_DAYS,
      minQuantity: this.MIN_QUANTITY,
      maxQuantity: this.MAX_QUANTITY
    };
  }

  private handleValidationError(error: unknown, context: string): void {
    if (error instanceof Error) {
      this.logger.warn(`Loan validation failed: ${error.message}`, {
        context,
        error: error.message,
        stack: error.stack
      });
    } else {
      this.logger.warn(`Loan validation failed: ${String(error)}`, {
        context,
        error: String(error)
      });
    }
  }

  private handleError(error: unknown, context: string): void {
    if (error instanceof Error) {
      this.logger.error(`Error in loan validation: ${error.message}`, {
        context,
        error: error.message,
        stack: error.stack
      });
    } else {
      this.logger.error(`Error in loan validation: ${String(error)}`, {
        context,
        error: String(error)
      });
    }
  }
}