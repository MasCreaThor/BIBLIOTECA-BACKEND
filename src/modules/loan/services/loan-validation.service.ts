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

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly personRepository: PersonRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LoanValidationService');
  }

  /**
   * Validar que se puede realizar un préstamo
   */
  async validateLoanCreation(personId: string, resourceId: string, quantity: number = 1): Promise<void> {
    // Validar IDs
    if (!MongoUtils.isValidObjectId(personId)) {
      throw new BadRequestException('ID de persona inválido');
    }

    if (!MongoUtils.isValidObjectId(resourceId)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    // Validar que la persona existe y está activa
    const person = await this.personRepository.findById(personId);
    if (!person || !person.active) {
      throw new BadRequestException('La persona no existe o no está activa');
    }

    // Validar que el recurso existe y está disponible
    const resource = await this.resourceRepository.findByIdWithPopulate(resourceId);
    if (!resource) {
      throw new BadRequestException('El recurso no existe');
    }

    if (!resource.available) {
      throw new BadRequestException('El recurso no está disponible para préstamo');
    }

    // Verificar que el recurso no esté ya prestado
    const isAvailable = await this.loanRepository.isResourceAvailable(resourceId);
    if (!isAvailable) {
      throw new BadRequestException('El recurso ya está prestado');
    }

    // Verificar límite de préstamos por persona
    const activeLoansCount = await this.loanRepository.countActiveByPerson(personId);
    if (activeLoansCount >= this.MAX_LOANS_PER_PERSON) {
      throw new BadRequestException(
        `La persona ya tiene ${activeLoansCount} préstamos activos. Máximo permitido: ${this.MAX_LOANS_PER_PERSON}`
      );
    }

    // Verificar que la persona no tenga préstamos vencidos
    const hasOverdueLoans = await this.hasOverdueLoans(personId);
    if (hasOverdueLoans) {
      throw new BadRequestException('La persona tiene préstamos vencidos. Debe devolver los recursos antes de solicitar nuevos préstamos');
    }

    this.logger.debug(`Loan validation successful for person: ${personId}, resource: ${resourceId}`);
  }

  /**
   * Calcular fecha de vencimiento
   */
  calculateDueDate(loanDate: Date = new Date()): Date {
    const dueDate = new Date(loanDate);
    dueDate.setDate(dueDate.getDate() + this.MAX_LOAN_DAYS);
    return dueDate;
  }

  /**
   * Verificar si una persona tiene préstamos vencidos
   */
  private async hasOverdueLoans(personId: string): Promise<boolean> {
    const today = new Date();
    const overdueLoans = await this.loanRepository.findWithFilters({
      personId,
      isOverdue: true,
    }, 1, 1);

    return overdueLoans.total > 0;
  }

  /**
   * Validar devolución de préstamo
   */
  async validateLoanReturn(loanId: string): Promise<void> {
    if (!MongoUtils.isValidObjectId(loanId)) {
      throw new BadRequestException('ID de préstamo inválido');
    }

    const loan = await this.loanRepository.findById(loanId);
    if (!loan) {
      throw new BadRequestException('El préstamo no existe');
    }

    if (loan.returnedDate) {
      throw new BadRequestException('Este préstamo ya fue devuelto');
    }

    this.logger.debug(`Return validation successful for loan: ${loanId}`);
  }

  /**
   * Obtener configuración de límites
   */
  getLimits(): {
    maxLoansPerPerson: number;
    maxLoanDays: number;
  } {
    return {
      maxLoansPerPerson: this.MAX_LOANS_PER_PERSON,
      maxLoanDays: this.MAX_LOAN_DAYS,
    };
  }
}