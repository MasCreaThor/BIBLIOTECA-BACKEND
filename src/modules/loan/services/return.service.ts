// src/modules/loan/services/return.service.ts - ACTUALIZADO CON ACTUALIZACIÓN DE STOCK
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LoanRepository, LoanStatusRepository } from '@modules/loan/repositories';
import { ResourceRepository } from '@modules/resource/repositories';
import { ResourceStateRepository } from '@modules/resource/repositories';
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
    private readonly resourceStateRepository: ResourceStateRepository,
    private readonly loanValidationService: LoanValidationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ReturnService');
  }

  /**
   * ✅ ACTUALIZADO: Procesar devolución de préstamo con actualización de stock
   */
  async processReturn(returnDto: ReturnLoanDto, userId: string): Promise<ReturnResponseDto> {
    this.logger.debug(`Processing return for loan: ${returnDto.loanId} by user: ${userId}`);

    try {
      // Validar parámetros básicos
      if (!MongoUtils.isValidObjectId(returnDto.loanId)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      if (!MongoUtils.isValidObjectId(userId)) {
        throw new BadRequestException('ID de usuario inválido');
      }

      // Buscar el préstamo
      const loan = await this.loanRepository.findByIdWithPopulate(returnDto.loanId);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      if (loan.returnedDate) {
        throw new BadRequestException('El préstamo ya ha sido devuelto');
      }

      // Calcular información de la devolución
      const returnDate = returnDto.returnDate ? new Date(returnDto.returnDate) : new Date();
      const dueDate = new Date(loan.dueDate);
      const today = new Date();
      const isLate = returnDate > dueDate;
      const daysOverdue = isLate ? Math.ceil((returnDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      // ✅ CORRECCIÓN: Determinar el estado correcto según la condición del recurso
      let statusToUse;
      if (returnDto.resourceCondition === 'lost') {
        // Si el recurso está perdido, usar estado "lost"
        statusToUse = await this.loanStatusRepository.findByName('lost');
        if (!statusToUse) {
          throw new BadRequestException('Estado de préstamo perdido no encontrado');
        }
      } else {
        // Si el recurso no está perdido, usar estado "returned"
        statusToUse = await this.loanStatusRepository.findByName('returned');
        if (!statusToUse) {
          throw new BadRequestException('Estado de devolución no encontrado');
        }
      }

      // Preparar datos de actualización
      const updateData: any = {
        returnedDate: returnDate,
        statusId: statusToUse._id,  // ✅ CORRECCIÓN: Usar el estado correcto
        returnedBy: new Types.ObjectId(userId),
      };

      // Agregar observaciones de devolución
      if (returnDto.returnObservations?.trim()) {
        const currentObservations = loan.observations?.trim();
        const newObservations = currentObservations
          ? `${currentObservations}\n[DEVOLUCIÓN]: ${returnDto.returnObservations.trim()}`
          : `[DEVOLUCIÓN]: ${returnDto.returnObservations.trim()}`;
        updateData.observations = newObservations;
      }

      // Actualizar el préstamo
      const updatedLoan = await this.loanRepository.update(returnDto.loanId, updateData);
      if (!updatedLoan) {
        throw new NotFoundException('No se pudo actualizar el préstamo');
      }

      // ✅ ACTUALIZAR STOCK: Decrementar contador de préstamos actuales
      const resourceId = this.extractObjectIdString(loan.resourceId);
      const loanQuantity = loan.quantity || 1;

      this.logger.debug('Updating resource stock after return', {
        resourceId,
        loanQuantity,
        resourceCondition: returnDto.resourceCondition
      });

      // Solo decrementar si el recurso no está perdido
      if (returnDto.resourceCondition !== 'lost') {
        const stockUpdated = await this.resourceRepository.decrementCurrentLoans(
          resourceId, 
          loanQuantity
        );

        if (!stockUpdated) {
          this.logger.warn(`Failed to update stock for resource ${resourceId} after return`);
          // Continuar, pero registrar warning
        } else {
          this.logger.debug(`Stock updated for resource ${resourceId}: -${loanQuantity} loans`);
        }
      } else {
        this.logger.debug(`Resource ${resourceId} marked as lost, stock not updated`);
      }

      // Gestionar estado del recurso si se especifica
      let resourceConditionChanged = false;
      if (returnDto.resourceCondition) {
        if (returnDto.resourceCondition === 'lost') {
          // ✅ NUEVO: Usar lógica inteligente para recursos perdidos
          const resource = await this.resourceRepository.findById(resourceId);
          if (resource) {
            resourceConditionChanged = await this.updateResourceConditionIntelligently(
              resourceId,
              loanQuantity, // Cantidad prestada que se perdió
              resource
            );
          } else {
            this.logger.warn(`Resource not found for intelligent update: ${resourceId}`);
            // Fallback al método original
            resourceConditionChanged = await this.updateResourceCondition(
              resourceId,
              returnDto.resourceCondition
            );
          }
        } else {
          // Para otros estados, usar el método original
          resourceConditionChanged = await this.updateResourceCondition(
            resourceId,
            returnDto.resourceCondition
          );
        }
      }

      // ✅ ACTUALIZADO: No actualizar disponibilidad manualmente si se usó lógica inteligente
      if (returnDto.resourceCondition && returnDto.resourceCondition !== 'lost') {
        // Solo actualizar disponibilidad para estados que no sean perdido
        if (returnDto.resourceCondition !== 'damaged') {
          await this.resourceRepository.updateAvailability(resourceId, true);
          this.logger.debug(`Resource ${resourceId} marked as available`);
        } else {
          this.logger.debug(`Resource ${resourceId} kept as unavailable due to condition: ${returnDto.resourceCondition}`);
        }
      }

      // Generar mensaje de respuesta
      let message = 'Devolución registrada exitosamente';
      if (isLate) {
        message += ` (${daysOverdue} día${daysOverdue > 1 ? 's' : ''} de retraso)`;
      }
      if (resourceConditionChanged) {
        message += `. Estado del recurso actualizado a: ${this.getConditionDescription(returnDto.resourceCondition!)}`;
      }

      this.logger.log(`Return processed successfully for loan: ${returnDto.loanId}`, {
        wasOverdue: isLate,
        daysOverdue,
        resourceCondition: returnDto.resourceCondition,
        stockUpdated: returnDto.resourceCondition !== 'lost'
      });

      return {
        loan: this.transformToLoanResponseDto(updatedLoan),
        daysOverdue,
        wasOverdue: isLate,
        resourceConditionChanged,
        message,
        penalties: isLate ? {
          hasLateReturnPenalty: true,
          penaltyDays: daysOverdue,
          description: `Devolución tardía de ${daysOverdue} día${daysOverdue > 1 ? 's' : ''}`
        } : undefined,
        resourceCondition: returnDto.resourceCondition ? {
          previousCondition: 'good',
          newCondition: returnDto.resourceCondition,
          requiresAction: returnDto.resourceCondition === 'damaged' || returnDto.resourceCondition === 'lost',
          suggestedAction: returnDto.resourceCondition === 'damaged' 
            ? 'Revisar el recurso para determinar si puede seguir siendo prestado'
            : returnDto.resourceCondition === 'lost'
            ? 'Marcar el recurso como perdido en el inventario'
            : undefined
        } : undefined
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error processing return for loan: ${returnDto.loanId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        returnDto
      });
      throw error;
    }
  }

  /**
   * ✅ ACTUALIZADO: Marcar préstamo como perdido con actualización de stock
   */
  async markAsLost(
    loanId: string, 
    observations: string, 
    userId: string,
    lostQuantity?: number
  ): Promise<LoanResponseDto> {
    this.logger.debug(`Marking loan as lost: ${loanId} by user: ${userId}, lostQuantity: ${lostQuantity}`);

    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      const loan = await this.loanRepository.findByIdWithPopulate(loanId);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      if (loan.returnedDate) {
        throw new BadRequestException('El préstamo ya ha sido devuelto');
      }

      // Validar cantidad perdida
      const loanQuantity = loan.quantity || 1;
      const actualLostQuantity = lostQuantity || loanQuantity;
      
      if (actualLostQuantity > loanQuantity) {
        throw new BadRequestException(`No se pueden perder ${actualLostQuantity} copias cuando solo se prestaron ${loanQuantity}`);
      }

      if (actualLostQuantity < 1) {
        throw new BadRequestException('La cantidad perdida debe ser al menos 1');
      }

      // Obtener estado perdido
      const lostStatus = await this.loanStatusRepository.findByName('lost');
      if (!lostStatus) {
        throw new BadRequestException('Estado de préstamo perdido no encontrado');
      }

      // Obtener información del recurso
      const resourceId = this.extractObjectIdString(loan.resourceId);
      const resource = await this.resourceRepository.findById(resourceId);
      if (!resource) {
        throw new NotFoundException('Recurso no encontrado');
      }

      // ✅ NUEVA LÓGICA: Determinar si se pierden todas las copias o solo algunas
      const isCompleteLoss = actualLostQuantity === loanQuantity;
      const remainingQuantity = loanQuantity - actualLostQuantity;

      // Actualizar préstamo
      const updateData: any = {
        statusId: new Types.ObjectId((lostStatus._id as Types.ObjectId).toString()),
        returnedBy: new Types.ObjectId(userId),
        observations: observations.trim()
      };

      // Si se pierden todas las copias, marcar como devuelto
      if (isCompleteLoss) {
        updateData.returnedDate = new Date();
      } else {
        // Si se pierden algunas copias, actualizar la cantidad del préstamo
        updateData.quantity = remainingQuantity;
        updateData.observations = `${observations.trim()}\n[PÉRDIDA PARCIAL]: Se perdieron ${actualLostQuantity} de ${loanQuantity} copias. Quedan ${remainingQuantity} copias en préstamo.`;
      }

      const updatedLoan = await this.loanRepository.updateBasic(loanId, updateData);
      if (!updatedLoan) {
        throw new NotFoundException('No se pudo actualizar el préstamo');
      }

      // ✅ NUEVA LÓGICA: Actualizar stock del recurso
      const stockUpdated = await this.resourceRepository.decrementCurrentLoans(
        resourceId, 
        actualLostQuantity
      );

      if (!stockUpdated) {
        this.logger.warn(`Failed to update stock for lost resource ${resourceId}`);
      }

      // ✅ NUEVA LÓGICA: Gestionar estado del recurso inteligentemente
      await this.updateResourceConditionIntelligently(resourceId, actualLostQuantity, resource);

      this.logger.log(`Loan marked as lost: ${loanId}, lostQuantity: ${actualLostQuantity}, isCompleteLoss: ${isCompleteLoss}`);

      const populatedLoan = await this.loanRepository.findByIdWithPopulate(loanId);
      if (!populatedLoan) {
        throw new NotFoundException('No se pudo recuperar el préstamo actualizado');
      }

      return this.transformToLoanResponseDto(populatedLoan);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error marking loan as lost: ${loanId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        lostQuantity
      });
      throw error;
    }
  }

  /**
   * ✅ MANTENIDO: Renovar préstamo
   */
  async renewLoan(
    loanId: string, 
    additionalDays: number, 
    userId: string
  ): Promise<LoanResponseDto> {
    this.logger.debug(`Renewing loan: ${loanId} for ${additionalDays} days by user: ${userId}`);

    try {
      if (!MongoUtils.isValidObjectId(loanId)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      if (additionalDays < 1 || additionalDays > 30) {
        throw new BadRequestException('Los días adicionales deben estar entre 1 y 30');
      }

      const loan = await this.loanRepository.findByIdWithPopulate(loanId);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      if (loan.returnedDate) {
        throw new BadRequestException('No se puede renovar un préstamo ya devuelto');
      }

      // Calcular nueva fecha de vencimiento
      const newDueDate = new Date(loan.dueDate);
      newDueDate.setDate(newDueDate.getDate() + additionalDays);

      const updateData = {
        dueDate: newDueDate,
        renewedBy: new Types.ObjectId(userId),
        renewedAt: new Date()
      };

      const updatedLoan = await this.loanRepository.update(loanId, updateData);
      if (!updatedLoan) {
        throw new NotFoundException('No se pudo renovar el préstamo');
      }

      this.logger.log(`Loan renewed: ${loanId} for ${additionalDays} days`);

      return this.transformToLoanResponseDto(updatedLoan);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error renewing loan: ${loanId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        additionalDays
      });
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener devoluciones pendientes
   */
  async getPendingReturns(limit: number = 50): Promise<LoanResponseDto[]> {
    this.logger.debug(`Getting pending returns, limit: ${limit}`);

    try {
      const overdueStatus = await this.loanStatusRepository.findByName('overdue');
      const activeStatus = await this.loanStatusRepository.findByName('active');

      const filters: any = {
        returnedDate: null,
        $or: []
      };

      if (overdueStatus) {
        filters.$or.push({ statusId: overdueStatus._id });
      }

      if (activeStatus) {
        filters.$or.push({ 
          statusId: activeStatus._id,
          dueDate: { $lt: new Date() }
        });
      }

      if (filters.$or.length === 0) {
        return [];
      }

      const loans = await this.loanRepository.findWithCompletePopulate(filters);
      
      // Aplicar límite
      const limitedLoans = loans.slice(0, limit);
      
      return limitedLoans.map(loan => this.transformToLoanResponseDto(loan));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting pending returns', {
        error: errorMessage,
        stack: getErrorStack(error),
        limit
      });
      return [];
    }
  }

  /**
   * Procesar múltiples devoluciones en lote
   */
  async processBatchReturns(returns: ReturnLoanDto[], userId: string): Promise<Array<{ success: boolean; loanId: string; message?: string; error?: string }>> {
    this.logger.debug(`Processing batch returns: ${returns.length} items`);

    const results = await Promise.all(
      returns.map(async (returnDto) => {
        try {
          await this.processReturn(returnDto, userId);
          return {
            success: true,
            loanId: returnDto.loanId,
            message: 'Devolución procesada exitosamente'
          };
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          this.logger.error(`Error processing return for loan: ${returnDto.loanId}`, {
            error: errorMessage,
            stack: getErrorStack(error)
          });
          return {
            success: false,
            loanId: returnDto.loanId,
            error: errorMessage
          };
        }
      })
    );

    this.logger.debug(`Batch returns processed: ${results.filter(r => r.success).length} successful, ${results.filter(r => !r.success).length} failed`);
    return results;
  }

  /**
   * Obtener historial de devoluciones
   */
  async getReturnHistory(
    startDate?: Date,
    endDate?: Date,
    limit: number = 100
  ): Promise<LoanResponseDto[]> {
    this.logger.debug('Getting return history', { startDate, endDate, limit });

    try {
      const filters: any = {
        returnedDate: { $ne: null }
      };

      if (startDate) {
        filters.returnedDate.$gte = startDate;
      }

      if (endDate) {
        filters.returnedDate.$lte = endDate;
      }

      const loans = await this.loanRepository.findWithCompletePopulate(filters);
      return loans.map(loan => this.transformToLoanResponseDto(loan));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting return history', {
        error: errorMessage,
        stack: getErrorStack(error),
        startDate,
        endDate,
        limit
      });
      throw error;
    }
  }

  // ✅ MÉTODOS AUXILIARES

  /**
   * Extraer string de ObjectId (puede estar poblado o no)
   */
  private extractObjectIdString(objectIdOrPopulated: any): string {
    if (typeof objectIdOrPopulated === 'string') {
      return objectIdOrPopulated;
    }
    
    if (objectIdOrPopulated && objectIdOrPopulated._id) {
      return objectIdOrPopulated._id.toString();
    }
    
    if (objectIdOrPopulated && Types.ObjectId.isValid(objectIdOrPopulated)) {
      return objectIdOrPopulated.toString();
    }
    
    throw new Error('Invalid ObjectId format');
  }

  /**
   * ✅ CORREGIDO: Actualizar estado/condición del recurso
   */
  private async updateResourceCondition(
    resourceId: string, 
    condition: 'good' | 'deteriorated' | 'damaged' | 'lost'
  ): Promise<boolean> {
    try {
      // ✅ NUEVO: Obtener el estado del recurso correspondiente
      const resourceState = await this.resourceStateRepository.findByName(condition);
      if (!resourceState) {
        this.logger.error(`Resource state not found for condition: ${condition}`);
        return false;
      }

      // ✅ NUEVO: Actualizar tanto el estado como la disponibilidad del recurso
      const updateData: any = {
        stateId: new Types.ObjectId((resourceState._id as Types.ObjectId).toString())
      };

      // Actualizar disponibilidad según la condición
      if (condition === 'damaged' || condition === 'lost') {
        updateData.available = false;
      } else {
        updateData.available = true;
      }

      // ✅ NUEVO: Actualizar el recurso con el nuevo estado
      const updatedResource = await this.resourceRepository.update(resourceId, updateData);
      if (!updatedResource) {
        this.logger.error(`Failed to update resource state: ${resourceId}`);
        return false;
      }

      this.logger.debug(`Resource condition updated: ${resourceId} -> ${condition} (stateId: ${resourceState._id})`);
      return true;
    } catch (error) {
      this.logger.error(`Error updating resource condition: ${resourceId}`, error);
      return false;
    }
  }

  /**
   * ✅ NUEVO: Actualizar estado del recurso de forma inteligente
   * Solo marca como perdido si no quedan copias disponibles
   */
  private async updateResourceConditionIntelligently(
    resourceId: string, 
    lostQuantity: number,
    resource: any
  ): Promise<boolean> {
    try {
      // Calcular stock disponible después de la pérdida
      const currentAvailableQuantity = resource.availableQuantity || 0;
      const newAvailableQuantity = Math.max(0, currentAvailableQuantity - lostQuantity);
      
      this.logger.debug(`Resource stock analysis: ${resourceId}`, {
        totalQuantity: resource.totalQuantity,
        currentLoansCount: resource.currentLoansCount,
        currentAvailableQuantity,
        lostQuantity,
        newAvailableQuantity
      });

      // Si quedan copias disponibles, mantener estado "good"
      if (newAvailableQuantity > 0) {
        const goodState = await this.resourceStateRepository.findByName('good');
        if (goodState) {
          const updateData = {
            stateId: new Types.ObjectId((goodState._id as Types.ObjectId).toString()),
            available: true
          };
          
          const updatedResource = await this.resourceRepository.update(resourceId, updateData);
          if (updatedResource) {
            this.logger.debug(`Resource ${resourceId} kept as available (${newAvailableQuantity} copies remaining)`);
            return true;
          }
        }
      } else {
        // Si no quedan copias disponibles, marcar como perdido
        const lostState = await this.resourceStateRepository.findByName('lost');
        if (lostState) {
          const updateData = {
            stateId: new Types.ObjectId((lostState._id as Types.ObjectId).toString()),
            available: false
          };
          
          const updatedResource = await this.resourceRepository.update(resourceId, updateData);
          if (updatedResource) {
            this.logger.debug(`Resource ${resourceId} marked as lost (no copies remaining)`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      this.logger.error(`Error updating resource condition intelligently: ${resourceId}`, error);
      return false;
    }
  }

  /**
   * Obtener descripción de condición del recurso
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
   * Transformar documento de préstamo a DTO de respuesta
   */
  private transformToLoanResponseDto(loan: LoanDocument): LoanResponseDto {
    const now = new Date();
    const isOverdue = !loan.returnedDate && loan.dueDate < now;
    const daysOverdue = isOverdue ? Math.ceil((now.getTime() - loan.dueDate.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

    const responseDto: LoanResponseDto = {
      _id: loan._id?.toString?.() ?? '',
      personId: this.extractObjectIdString(loan.personId),
      resourceId: this.extractObjectIdString(loan.resourceId),
      quantity: loan.quantity || 1,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnedDate: loan.returnedDate,
      statusId: this.extractObjectIdString(loan.statusId),
      observations: loan.observations,
      loanedBy: this.extractObjectIdString(loan.loanedBy),
      returnedBy: loan.returnedBy ? this.extractObjectIdString(loan.returnedBy) : undefined,
      renewedBy: loan.renewedBy ? this.extractObjectIdString(loan.renewedBy) : undefined,
      renewedAt: loan.renewedAt,
      daysOverdue,
      isOverdue,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt
    };

    // Poblar datos relacionados si están disponibles
    if (loan.populated && typeof loan.populated === 'function' && loan.populated('personId') && loan.personId) {
      const person = loan.personId as any;
      responseDto.person = {
        _id: person._id?.toString(),
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: person.fullName || `${person.firstName} ${person.lastName}`,
        documentNumber: person.documentNumber,
        grade: person.grade,
        personType: person.personType ? {
          _id: person.personType._id?.toString(),
          name: person.personType.name,
          description: person.personType.description,
        } : undefined,
      };
    }

    if (loan.populated && typeof loan.populated === 'function' && loan.populated('resourceId') && loan.resourceId) {
      const resource = loan.resourceId as any;
      responseDto.resource = {
        _id: resource._id?.toString(),
        title: resource.title,
        isbn: resource.isbn,
        author: resource.author,
        category: resource.category,
        available: resource.available,
        totalQuantity: resource.totalQuantity,
        currentLoansCount: resource.currentLoansCount,
        availableQuantity: resource.availableQuantity,
        state: resource.state ? {
          _id: resource.state._id?.toString(),
          name: resource.state.name,
          description: resource.state.description,
          color: resource.state.color,
        } : undefined,
      };
    }

    if (loan.populated && typeof loan.populated === 'function' && loan.populated('statusId') && loan.statusId) {
      const status = loan.statusId as any;
      responseDto.status = {
        _id: status._id?.toString(),
        name: status.name,
        description: status.description,
        color: status.color,
      };
    }

    if (loan.populated && typeof loan.populated === 'function' && loan.populated('loanedBy') && loan.loanedBy) {
      const user = loan.loanedBy as any;
      responseDto.loanedByUser = {
        _id: user._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      };
    }

    if (loan.populated && typeof loan.populated === 'function' && loan.populated('returnedBy') && loan.returnedBy) {
      const user = loan.returnedBy as any;
      responseDto.returnedByUser = {
        _id: user._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      };
    }

    if (loan.populated && typeof loan.populated === 'function' && loan.populated('renewedBy') && loan.renewedBy) {
      const user = loan.renewedBy as any;
      responseDto.renewedByUser = {
        _id: user._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      };
    }

    return responseDto;
  }
}