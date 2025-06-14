// src/modules/loan/services/loan-validation.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { LoanRepository } from '@modules/loan/repositories';
import { PersonRepository } from '@modules/person/repositories';
import { ResourceRepository } from '@modules/resource/repositories';
import { LoggerService } from '@shared/services/logger.service';
import { MongoUtils } from '@shared/utils';

@Injectable()
export class LoanValidationService {
  private readonly MAX_LOANS_PER_PERSON = 3;
  private readonly MAX_LOAN_DAYS = 15;
  private readonly MIN_QUANTITY = 1;
  private readonly MAX_QUANTITY = 5;

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly personRepository: PersonRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LoanValidationService');
  }

  /**
   * Validar que se puede realizar un préstamo - VERSIÓN COMPLETA
   */
  async validateLoanCreation(personId: string, resourceId: string, quantity: number = 1): Promise<void> {
    this.logger.debug(`Validating loan creation for person ${personId} and resource ${resourceId}`);

    try {
      // Validación básica de parámetros
      await this.validateBasicParameters(personId, resourceId, quantity);

      // Validar persona
      await this.validatePerson(personId);

      // Validar recurso
      await this.validateResource(resourceId);

      // Validar límites de préstamos
      await this.validateLoanLimits(personId);

      // Validar préstamos vencidos
      await this.validateOverdueLoans(personId);

      // Validación final de disponibilidad
      await this.validateResourceAvailability(resourceId);

      this.logger.debug(`All loan validations passed for person ${personId} and resource ${resourceId}`);
    } catch (error) {
      this.handleValidationError(error, `person ${personId} and resource ${resourceId}`);
      throw error;
    }
  }

  /**
   * Validar parámetros básicos
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
    if (!Number.isInteger(quantity) || quantity < this.MIN_QUANTITY || quantity > this.MAX_QUANTITY) {
      throw new BadRequestException(
        `La cantidad debe ser un número entero entre ${this.MIN_QUANTITY} y ${this.MAX_QUANTITY}`
      );
    }
  }

  /**
   * Validar persona
   */
  private async validatePerson(personId: string): Promise<void> {
    this.logger.debug(`Validating person: ${personId}`);

    const person = await this.personRepository.findById(personId);
    if (!person) {
      throw new BadRequestException('La persona especificada no existe');
    }

    if (!person.active) {
      throw new BadRequestException('La persona no está activa en el sistema');
    }

    // Validaciones adicionales según el tipo de persona
    if (person.personTypeId) {
      const personType = await this.personRepository.findById(person.personTypeId.toString());
      if (personType && !personType.active) {
        throw new BadRequestException('El tipo de persona no está activo');
      }
    }

    this.logger.debug(`Person validation passed: ${personId}`);
  }

  /**
   * Validar recurso
   */
  private async validateResource(resourceId: string): Promise<void> {
    this.logger.debug(`Validating resource: ${resourceId}`);

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

    this.logger.debug(`Resource validation passed: ${resourceId}`);
  }

  /**
   * Validar límites de préstamos
   */
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

  /**
   * Validar préstamos vencidos
   */
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
   * Validar disponibilidad del recurso
   */
  private async validateResourceAvailability(resourceId: string): Promise<void> {
    this.logger.debug(`Validating resource availability: ${resourceId}`);

    const isAvailable = await this.loanRepository.isResourceAvailable(resourceId);
    if (!isAvailable) {
      throw new BadRequestException('El recurso ya está prestado a otra persona');
    }

    this.logger.debug(`Resource availability validation passed: ${resourceId}`);
  }

  /**
   * Verificar si una persona tiene préstamos vencidos
   */
  private async hasOverdueLoans(personId: string): Promise<boolean> {
    try {
      const overdueLoans = await this.loanRepository.findOverdueByPerson(personId);
      return overdueLoans.length > 0;
    } catch (error) {
      this.handleError(error, `checking overdue loans for person ${personId}`);
      // En caso de error, ser conservativo y asumir que sí tiene préstamos vencidos
      return true;
    }
  }

  /**
   * Verificar si una persona puede pedir más préstamos
   */
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
          reason: 'ID de persona inválido',
          maxLoansAllowed: this.MAX_LOANS_PER_PERSON
        };
      }

      // Verificar que la persona existe y está activa
      const person = await this.personRepository.findById(personId);
      if (!person) {
        return { 
          canBorrow: false, 
          reason: 'La persona no existe',
          maxLoansAllowed: this.MAX_LOANS_PER_PERSON
        };
      }

      if (!person.active) {
        return { 
          canBorrow: false, 
          reason: 'La persona no está activa en el sistema',
          maxLoansAllowed: this.MAX_LOANS_PER_PERSON
        };
      }

      // Verificar límite de préstamos activos
      const activeLoansCount = await this.loanRepository.countActiveByPerson(personId);
      if (activeLoansCount >= this.MAX_LOANS_PER_PERSON) {
        return {
          canBorrow: false,
          reason: `Máximo de préstamos alcanzado (${activeLoansCount}/${this.MAX_LOANS_PER_PERSON})`,
          activeLoansCount,
          maxLoansAllowed: this.MAX_LOANS_PER_PERSON
        };
      }

      // Verificar préstamos vencidos
      const hasOverdue = await this.hasOverdueLoans(personId);
      if (hasOverdue) {
        const overdueLoans = await this.loanRepository.findOverdueByPerson(personId);
        return {
          canBorrow: false,
          reason: `Tiene ${overdueLoans.length} préstamo${overdueLoans.length > 1 ? 's' : ''} vencido${overdueLoans.length > 1 ? 's' : ''} pendiente${overdueLoans.length > 1 ? 's' : ''}`,
          activeLoansCount,
          hasOverdueLoans: true,
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
        reason: 'Error interno de validación',
        maxLoansAllowed: this.MAX_LOANS_PER_PERSON
      };
    }
  }

  /**
   * Validar datos de devolución
   */
  async validateReturnData(loanId: string, returnDate?: Date): Promise<void> {
    this.logger.debug(`Validating return data for loan: ${loanId}`);

    if (!MongoUtils.isValidObjectId(loanId)) {
      throw new BadRequestException('ID de préstamo inválido');
    }

    const loan = await this.loanRepository.findById(loanId);
    if (!loan) {
      throw new BadRequestException('El préstamo especificado no existe');
    }

    if (loan.returnedDate) {
      throw new BadRequestException('El préstamo ya ha sido devuelto');
    }

    // Validar fecha de devolución
    if (returnDate) {
      const loanDate = new Date(loan.loanDate);
      const today = new Date();

      if (returnDate < loanDate) {
        throw new BadRequestException('La fecha de devolución no puede ser anterior a la fecha de préstamo');
      }

      if (returnDate > today) {
        throw new BadRequestException('La fecha de devolución no puede ser futura');
      }
    }

    this.logger.debug(`Return validation passed for loan: ${loanId}`);
  }

  /**
   * Validar si un recurso puede ser prestado
   */
  async validateResourceForLoan(resourceId: string): Promise<{
    canBorrow: boolean;
    reason?: string;
    resource?: any;
  }> {
    this.logger.debug(`Validating resource for loan: ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return {
          canBorrow: false,
          reason: 'ID de recurso inválido'
        };
      }

      const resource = await this.resourceRepository.findByIdWithPopulate(resourceId);
      if (!resource) {
        return {
          canBorrow: false,
          reason: 'El recurso no existe'
        };
      }

      if (!resource.available) {
        return {
          canBorrow: false,
          reason: 'El recurso no está disponible',
          resource
        };
      }

      const isCurrentlyLoaned = !(await this.loanRepository.isResourceAvailable(resourceId));
      if (isCurrentlyLoaned) {
        return {
          canBorrow: false,
          reason: 'El recurso ya está prestado',
          resource
        };
      }

      // Verificar estado del recurso
      if (resource.stateId) {
        const resourceState = resource.stateId as any;
        if (resourceState.name === 'damaged') {
          return {
            canBorrow: false,
            reason: 'El recurso está dañado',
            resource
          };
        }
        if (resourceState.name === 'lost') {
          return {
            canBorrow: false,
            reason: 'El recurso está marcado como perdido',
            resource
          };
        }
      }

      return {
        canBorrow: true,
        resource
      };
    } catch (error) {
      this.handleError(error, `validating resource for loan: ${resourceId}`);
      return {
        canBorrow: false,
        reason: 'Error interno de validación'
      };
    }
  }

  /**
   * Obtener configuración de límites
   */
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