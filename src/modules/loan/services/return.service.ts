// src/modules/loan/services/return.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LoanRepository, LoanStatusRepository } from '@modules/loan/repositories';
import { ResourceRepository } from '@modules/resource/repositories';
import { LoanValidationService } from './loan-validation.service';
import { LoggerService } from '@shared/services/logger.service';
import {
  ReturnLoanDto,
  ReturnResponseDto,
  LoanResponseDto,
} from '@modules/loan/dto';
import { LoanDocument } from '@modules/loan/models';
import { Types } from 'mongoose';
import { MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';

@Injectable()
export class ReturnService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly loanStatusRepository: LoanStatusRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly loanValidationService: LoanValidationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ReturnService');
  }

  /**
   * Procesar devolución de préstamo
   */
  async processReturn(returnDto: ReturnLoanDto, userId: string): Promise<ReturnResponseDto> {
    this.logger.log(`Processing return for loan: ${returnDto.loanId} by user: ${userId}`);

    try {
      // Validar datos de devolución
      await this.loanValidationService.validateReturnData(
        returnDto.loanId,
        returnDto.returnDate ? new Date(returnDto.returnDate) : undefined
      );

      // ✅ OPTIMIZACIÓN: Usar método que no hace populate de resourceId
      const loan = await this.loanRepository.findByIdForProcessing(returnDto.loanId);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      if (loan.returnedDate) {
        throw new BadRequestException('Este préstamo ya ha sido devuelto');
      }

      // Calcular información de la devolución
      const returnDate = returnDto.returnDate ? new Date(returnDto.returnDate) : new Date();
      const daysOverdue = this.calculateDaysOverdue(loan.dueDate, returnDate);
      const wasOverdue = daysOverdue > 0;

      this.logger.debug(`Return calculation for loan ${returnDto.loanId}:`, {
        returnDate,
        dueDate: loan.dueDate,
        daysOverdue,
        wasOverdue
      });

      // Obtener estado de "devuelto"
      const returnedStatus = await this.loanStatusRepository.getReturnedStatus();
      if (!returnedStatus) {
        throw new BadRequestException('Estado de préstamo "devuelto" no encontrado');
      }

      // Actualizar el préstamo
      const updateData: Partial<LoanDocument> = {
        returnedDate: returnDate,
        statusId: returnedStatus._id as Types.ObjectId,
        returnedBy: new Types.ObjectId(userId),
      };

      // Agregar observaciones de devolución si las hay
      if (returnDto.returnObservations) {
        const currentObservations = loan.observations || '';
        const newObservations = currentObservations 
          ? `${currentObservations}\n[DEVOLUCIÓN]: ${returnDto.returnObservations.trim()}`
          : `[DEVOLUCIÓN]: ${returnDto.returnObservations.trim()}`;
        updateData.observations = newObservations;
      }

      const updatedLoan = await this.loanRepository.update(returnDto.loanId, updateData);
      if (!updatedLoan) {
        throw new NotFoundException('No se pudo actualizar el préstamo');
      }

      // ✅ SOLUCIÓN: Extraer correctamente el ID del recurso (puede estar poblado)
      const resourceId = this.extractObjectIdString(loan.resourceId);
      
      this.logger.debug('Resource ID extracted:', {
        originalResourceId: loan.resourceId,
        extractedResourceId: resourceId,
        resourceIdType: typeof loan.resourceId
      });

      // Gestionar estado del recurso y disponibilidad
      let resourceConditionChanged = false;
      if (returnDto.resourceCondition) {
        resourceConditionChanged = await this.updateResourceCondition(
          resourceId,
          returnDto.resourceCondition
        );
      }

      // Actualizar disponibilidad del recurso (solo si no está perdido o dañado)
      if (returnDto.resourceCondition !== 'lost' && returnDto.resourceCondition !== 'damaged') {
        await this.resourceRepository.updateAvailability(resourceId, true);
        this.logger.debug(`Resource ${resourceId} marked as available`);
      } else {
        this.logger.debug(`Resource ${resourceId} kept as unavailable due to condition: ${returnDto.resourceCondition}`);
      }

      // Generar mensaje de respuesta
      let message = 'Devolución registrada exitosamente';
      if (wasOverdue) {
        message += ` (${daysOverdue} día${daysOverdue > 1 ? 's' : ''} de retraso)`;
      }
      if (resourceConditionChanged) {
        message += `. Estado del recurso actualizado a: ${this.getConditionDescription(returnDto.resourceCondition!)}`;
      }

      this.logger.log(`Return processed successfully for loan: ${returnDto.loanId}`, {
        wasOverdue,
        daysOverdue,
        resourceConditionChanged
      });

      // Crear respuesta
      const response: ReturnResponseDto = {
        loan: this.mapLoanToResponseDto(updatedLoan),
        daysOverdue,
        wasOverdue,
        resourceConditionChanged,
        message,
      };

      return response;

    } catch (error) {
      this.logger.error(`Error processing return for loan: ${returnDto.loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        returnDto
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error al procesar la devolución: ' + getErrorMessage(error));
    }
  }

  /**
   * Marcar préstamo como perdido
   */
  async markAsLost(loanId: string, observations: string, userId: string): Promise<LoanResponseDto> {
    this.logger.log(`Marking loan as lost: ${loanId} by user: ${userId}`);

    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      if (!observations || observations.trim().length === 0) {
        throw new BadRequestException('Las observaciones son requeridas para marcar como perdido');
      }

      if (observations.length > 500) {
        throw new BadRequestException('Las observaciones no pueden exceder 500 caracteres');
      }

      // ✅ OPTIMIZACIÓN: Usar método que no hace populate de resourceId
      const loan = await this.loanRepository.findByIdForProcessing(loanId);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      if (loan.returnedDate) {
        throw new BadRequestException('No se puede marcar como perdido un préstamo ya devuelto');
      }

      // Obtener estado de "perdido"
      const lostStatus = await this.loanStatusRepository.getLostStatus();
      if (!lostStatus) {
        throw new BadRequestException('Estado de préstamo "perdido" no encontrado');
      }

      // Actualizar el préstamo
      const currentObservations = loan.observations || '';
      const newObservations = currentObservations 
        ? `${currentObservations}\n[PERDIDO]: ${observations.trim()}`
        : `[PERDIDO]: ${observations.trim()}`;

      const updateData = {
        statusId: lostStatus._id as Types.ObjectId,
        observations: newObservations,
        returnedBy: new Types.ObjectId(userId),
      };

      const updatedLoan = await this.loanRepository.update(loanId, updateData);
      if (!updatedLoan) {
        throw new NotFoundException('No se pudo actualizar el préstamo');
      }

      // ✅ SOLUCIÓN: Extraer correctamente el ID del recurso
      const resourceId = this.extractObjectIdString(loan.resourceId);

      // Marcar recurso como perdido y no disponible
      await this.updateResourceCondition(resourceId, 'lost');
      await this.resourceRepository.updateAvailability(resourceId, false);

      this.logger.log(`Loan marked as lost successfully: ${loanId}`);

      return this.mapLoanToResponseDto(updatedLoan);

    } catch (error) {
      this.logger.error(`Error marking loan as lost: ${loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        observations
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error al marcar como perdido: ' + getErrorMessage(error));
    }
  }

  /**
   * Renovar préstamo (extender fecha de vencimiento)
   */
  async renewLoan(loanId: string, additionalDays: number, userId: string): Promise<LoanResponseDto> {
    this.logger.log(`Renewing loan: ${loanId} for ${additionalDays} days by user: ${userId}`);

    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      if (additionalDays < 1 || additionalDays > 30) {
        throw new BadRequestException('Los días adicionales deben estar entre 1 y 30');
      }

      // Obtener el préstamo
      const loan = await this.loanRepository.findById(loanId);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      if (loan.returnedDate) {
        throw new BadRequestException('No se puede renovar un préstamo ya devuelto');
      }

      // ✅ SOLUCIÓN: Extraer correctamente el ID de la persona
      const personId = this.extractObjectIdString(loan.personId);

      // Verificar que la persona no tenga otros préstamos vencidos
      const hasOtherOverdueLoans = await this.hasOtherOverdueLoans(personId, loanId);
      
      if (hasOtherOverdueLoans) {
        throw new BadRequestException('No se puede renovar el préstamo porque la persona tiene otros préstamos vencidos');
      }

      // Calcular nueva fecha de vencimiento
      const newDueDate = new Date(loan.dueDate);
      newDueDate.setDate(newDueDate.getDate() + additionalDays);

      // Actualizar el préstamo
      const currentObservations = loan.observations || '';
      const renewalNote = `[RENOVACIÓN]: Extendido por ${additionalDays} días hasta ${newDueDate.toLocaleDateString()}`;
      const newObservations = currentObservations 
        ? `${currentObservations}\n${renewalNote}`
        : renewalNote;

      const updateData = {
        dueDate: newDueDate,
        observations: newObservations,
      };

      const updatedLoan = await this.loanRepository.update(loanId, updateData);
      if (!updatedLoan) {
        throw new NotFoundException('No se pudo actualizar el préstamo');
      }

      this.logger.log(`Loan renewed successfully: ${loanId} until ${newDueDate.toISOString()}`);

      return this.mapLoanToResponseDto(updatedLoan);

    } catch (error) {
      this.logger.error(`Error renewing loan: ${loanId}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        userId,
        additionalDays
      });

      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }

      throw new BadRequestException('Error al renovar préstamo: ' + getErrorMessage(error));
    }
  }

  /**
   * Obtener devoluciones pendientes (préstamos vencidos)
   */
  async getPendingReturns(limit: number = 50): Promise<LoanResponseDto[]> {
    this.logger.debug(`Getting pending returns, limit: ${limit}`);

    try {
      const overdueLoans = await this.loanRepository.findOverdue();
      return overdueLoans.slice(0, limit).map((loan: LoanDocument) => this.mapLoanToResponseDto(loan));
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
   */
  async getReturnHistory(
    dateFrom?: Date,
    dateTo?: Date,
    limit: number = 100
  ): Promise<LoanResponseDto[]> {
    this.logger.debug(`Getting return history from ${dateFrom} to ${dateTo}, limit: ${limit}`);

    try {
      const filters: any = {
        returnedDate: { $ne: null }
      };

      if (dateFrom) {
        filters.returnedDate = { ...filters.returnedDate, $gte: dateFrom };
      }

      if (dateTo) {
        filters.returnedDate = { ...filters.returnedDate, $lte: dateTo };
      }

      // Esta implementación podría expandirse con un método específico en el repository
      const result = await this.loanRepository.findWithFilters(filters, 1, limit);
      return result.data.map(loan => this.mapLoanToResponseDto(loan));
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
   * Procesar devoluciones en lote
   */
  async processBatchReturns(
    returns: Array<{
      loanId: string;
      returnDate?: string;
      resourceCondition?: 'good' | 'deteriorated' | 'damaged' | 'lost';
      returnObservations?: string;
    }>,
    userId: string
  ): Promise<Array<{
    loanId: string;
    success: boolean;
    result?: ReturnResponseDto;
    error?: string;
  }>> {
    this.logger.log(`Processing batch returns: ${returns.length} items by user: ${userId}`);

    const results: Array<{
      loanId: string;
      success: boolean;
      result?: ReturnResponseDto;
      error?: string;
    }> = [];

    for (const returnData of returns) {
      try {
        if (!returnData.loanId) {
          throw new Error('ID de préstamo requerido');
        }

        const returnDto: ReturnLoanDto = {
          loanId: returnData.loanId,
          returnDate: returnData.returnDate,
          resourceCondition: returnData.resourceCondition,
          returnObservations: returnData.returnObservations,
        };

        const result = await this.processReturn(returnDto, userId);
        
        results.push({
          loanId: returnData.loanId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          loanId: returnData.loanId,
          success: false,
          error: getErrorMessage(error)
        });
        
        this.logger.warn(`Failed to process return in batch: ${returnData.loanId}`, {
          error: getErrorMessage(error)
        });
      }
    }

    return results;
  }

  /**
   * Obtener préstamos vencidos
   */
  async getOverdueLoans(limit: number = 50): Promise<LoanResponseDto[]> {
    try {
      const overdueLoans = await this.loanRepository.findOverdue();
      return overdueLoans.slice(0, limit).map((loan: LoanDocument) => this.mapLoanToResponseDto(loan));
    } catch (error) {
      this.logger.error('Error getting overdue loans', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw new BadRequestException('Error al obtener préstamos vencidos: ' + getErrorMessage(error));
    }
  }

  // ===== MÉTODOS PRIVADOS =====

  /**
   * ✅ NUEVA FUNCIÓN: Extraer ObjectId como string de manera segura
   * Maneja casos donde el campo puede estar poblado o no
   */
  private extractObjectIdString(value: any): string {
    try {
      if (!value) {
        throw new Error('Value is null or undefined');
      }

      // Si es un string, validar que sea un ObjectId válido
      if (typeof value === 'string') {
        if (!MongoUtils.isValidObjectId(value)) {
          throw new Error(`Invalid ObjectId string: ${value}`);
        }
        return value;
      }

      // Si es un ObjectId de Mongoose
      if (value instanceof Types.ObjectId) {
        return value.toString();
      }

      // Si es un objeto poblado, extraer el _id
      if (typeof value === 'object' && value._id) {
        return this.extractObjectIdString(value._id);
      }

      // Si el objeto tiene toHexString (para ObjectIds)
      if (value.toHexString && typeof value.toHexString === 'function') {
        return value.toHexString();
      }

      // Fallback: intentar toString()
      const stringValue = value.toString();
      if (MongoUtils.isValidObjectId(stringValue)) {
        return stringValue;
      }

      throw new Error(`Cannot extract ObjectId from value: ${JSON.stringify(value)}`);
    } catch (error) {
      this.logger.error('Error extracting ObjectId string', {
        error: getErrorMessage(error),
        value: value,
        valueType: typeof value
      });
      throw new BadRequestException(`Error procesando ObjectId: ${getErrorMessage(error)}`);
    }
  }

  /**
   * Calcular días de retraso
   */
  private calculateDaysOverdue(dueDate: Date, returnDate: Date): number {
    if (returnDate <= dueDate) {
      return 0;
    }

    const diffTime = returnDate.getTime() - dueDate.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Actualizar condición del recurso
   */
  private async updateResourceCondition(
    resourceId: string,
    condition: 'good' | 'deteriorated' | 'damaged' | 'lost'
  ): Promise<boolean> {
    try {
      // Esta implementación depende de cómo esté estructurado el ResourceRepository
      // Por ahora, asumimos que existe un método para actualizar el estado
      
      const conditionMap = {
        good: 'good',
        deteriorated: 'deteriorated',
        damaged: 'damaged',
        lost: 'lost'
      };

      // Aquí iría la lógica para actualizar el estado del recurso
      // await this.resourceRepository.updateCondition(resourceId, conditionMap[condition]);
      
      this.logger.debug(`Resource condition updated: ${resourceId} -> ${condition}`);
      return true;
    } catch (error) {
      this.logger.error(`Error updating resource condition: ${resourceId}`, error);
      return false;
    }
  }

  /**
   * Verificar si la persona tiene otros préstamos vencidos
   */
  private async hasOtherOverdueLoans(personId: string, excludeLoanId: string): Promise<boolean> {
    try {
      const overdueLoans = await this.loanRepository.findOverdueByPerson(personId);
      return overdueLoans.some(loan => {
        const loanId = loan._id?.toString();
        return loanId && loanId !== excludeLoanId;
      });
    } catch (error) {
      this.logger.error('Error checking for other overdue loans', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        personId,
        excludeLoanId
      });
      return false;
    }
  }

  /**
   * Obtener descripción de la condición del recurso
   */
  private getConditionDescription(condition: string): string {
    const descriptions = {
      good: 'Buen estado',
      deteriorated: 'Deteriorado',
      damaged: 'Dañado',
      lost: 'Perdido'
    };

    return descriptions[condition as keyof typeof descriptions] || condition;
  }

  /**
   * Mapear préstamo a DTO de respuesta
   */
  private mapLoanToResponseDto(loan: LoanDocument): LoanResponseDto {
    return {
      _id: loan._id?.toString() || '',
      personId: this.extractObjectIdString(loan.personId),
      resourceId: this.extractObjectIdString(loan.resourceId),
      quantity: loan.quantity,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnedDate: loan.returnedDate,
      statusId: this.extractObjectIdString(loan.statusId),
      observations: loan.observations,
      loanedBy: this.extractObjectIdString(loan.loanedBy),
      returnedBy: loan.returnedBy ? this.extractObjectIdString(loan.returnedBy) : undefined,
      daysOverdue: loan.daysOverdue,
      isOverdue: loan.isOverdue,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      person: loan.populated('personId') ? {
        _id: (loan.personId as any)._id?.toString() || '',
        firstName: (loan.personId as any).firstName || '',
        lastName: (loan.personId as any).lastName || '',
        fullName: (loan.personId as any).fullName || `${(loan.personId as any).firstName} ${(loan.personId as any).lastName}`,
        documentNumber: (loan.personId as any).documentNumber,
        grade: (loan.personId as any).grade,
        personType: (loan.personId as any).personType ? {
          _id: (loan.personId as any).personType._id?.toString() || '',
          name: (loan.personId as any).personType.name || '',
          description: (loan.personId as any).personType.description || '',
        } : undefined,
      } : undefined,
      resource: loan.populated('resourceId') ? {
        _id: (loan.resourceId as any)._id?.toString() || '',
        title: (loan.resourceId as any).title || '',
        isbn: (loan.resourceId as any).isbn,
        author: (loan.resourceId as any).author,
        category: (loan.resourceId as any).category,
        available: (loan.resourceId as any).available,
        state: (loan.resourceId as any).state ? {
          _id: (loan.resourceId as any).state._id?.toString() || '',
          name: (loan.resourceId as any).state.name || '',
          description: (loan.resourceId as any).state.description || '',
          color: (loan.resourceId as any).state.color || '',
        } : undefined,
      } : undefined,
      status: loan.populated('statusId') ? {
        _id: (loan.statusId as any)._id?.toString() || '',
        name: (loan.statusId as any).name || '',
        description: (loan.statusId as any).description || '',
        color: (loan.statusId as any).color || '',
      } : undefined,
      loanedByUser: loan.populated('loanedBy') ? {
        _id: (loan.loanedBy as any)._id?.toString() || '',
        firstName: (loan.loanedBy as any).firstName || '',
        lastName: (loan.loanedBy as any).lastName || '',
        username: (loan.loanedBy as any).username || '',
      } : undefined,
      returnedByUser: loan.populated('returnedBy') ? {
        _id: (loan.returnedBy as any)._id?.toString() || '',
        firstName: (loan.returnedBy as any).firstName || '',
        lastName: (loan.returnedBy as any).lastName || '',
        username: (loan.returnedBy as any).username || '',
      } : undefined,
    };
  }
}