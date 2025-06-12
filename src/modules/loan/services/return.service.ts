// src/modules/loan/services/return.service.ts
import {
    Injectable,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { LoanRepository, LoanStatusRepository } from '@modules/loan/repositories';
  import { ResourceRepository, ResourceStateRepository } from '@modules/resource/repositories';
  import { LoanValidationService } from './loan-validation.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    ReturnLoanDto,
    ReturnResponseDto,
    LoanResponseDto,
  } from '@modules/loan/dto';
  import { LoanDocument } from '@modules/loan/models';
  import { MongoUtils, DateUtils } from '@shared/utils';
  import { ObjectId } from '@shared/types/mongoose.types';
  
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
     * Procesar devolución de préstamo
     */
    async processReturn(returnLoanDto: ReturnLoanDto, returnedByUserId: string): Promise<ReturnResponseDto> {
      const { loanId, returnDate, resourceCondition, returnObservations } = returnLoanDto;
  
      try {
        // Validar que se puede realizar la devolución
        await this.loanValidationService.validateLoanReturn(loanId);
  
        // Obtener el préstamo con información poblada
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) {
          throw new NotFoundException('Préstamo no encontrado');
        }
  
        // Calcular información de la devolución
        const returnDateTime = returnDate ? new Date(returnDate) : new Date();
        const daysOverdue = this.calculateDaysOverdue(loan.dueDate, returnDateTime);
        const wasOverdue = daysOverdue > 0;
  
        // Obtener estado apropiado para el préstamo
        const returnedStatus = await this.loanStatusRepository.getReturnedStatus();
        if (!returnedStatus) {
          throw new BadRequestException('Estado de préstamo "devuelto" no encontrado en el sistema');
        }
  
        // Actualizar el préstamo
        const updateData: any = {
          returnedDate: returnDateTime,
          statusId: returnedStatus._id,
          returnedBy: MongoUtils.toObjectId(returnedByUserId),
        };
  
        // Agregar observaciones de devolución si existen
        if (returnObservations) {
          const currentObservations = loan.observations || '';
          const newObservations = currentObservations 
            ? `${currentObservations}\n[DEVOLUCIÓN]: ${returnObservations.trim()}`
            : `[DEVOLUCIÓN]: ${returnObservations.trim()}`;
          updateData.observations = newObservations;
        }
  
        const updatedLoan = await this.loanRepository.update(loanId, updateData);
        if (!updatedLoan) {
          throw new NotFoundException('No se pudo actualizar el préstamo');
        }
  
        // Gestionar estado del recurso
        let resourceConditionChanged = false;
        if (resourceCondition) {
          resourceConditionChanged = await this.updateResourceCondition(
            loan.resourceId.toString(),
            resourceCondition
          );
        }
  
        // Actualizar disponibilidad del recurso
        await this.resourceRepository.updateAvailability(loan.resourceId.toString(), true);
  
        // Generar mensaje de respuesta
        let message = 'Devolución registrada exitosamente';
        if (wasOverdue) {
          message += ` (${daysOverdue} días de retraso)`;
        }
        if (resourceConditionChanged) {
          message += `. Estado del recurso actualizado a: ${resourceCondition}`;
        }
  
        this.logger.log(`Return processed successfully: Loan ${loanId}, ${daysOverdue} days overdue`);
  
        // Mapear respuesta
        const loanResponse = this.mapLoanToResponseDto(updatedLoan);
  
        return {
          loan: loanResponse,
          daysOverdue,
          wasOverdue,
          resourceConditionChanged,
          message,
        };
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
  
        this.logger.error(`Error processing return for loan: ${loanId}`, error);
        throw new BadRequestException('Error al procesar la devolución');
      }
    }
  
    /**
     * Marcar préstamo como perdido
     */
    async markAsLost(loanId: string, observations: string, markedByUserId: string): Promise<LoanResponseDto> {
      try {
        if (!MongoUtils.isValidObjectId(loanId)) {
          throw new BadRequestException('ID de préstamo inválido');
        }
  
        const loan = await this.loanRepository.findById(loanId);
        if (!loan) {
          throw new NotFoundException('Préstamo no encontrado');
        }
  
        if (loan.returnedDate) {
          throw new BadRequestException('Este préstamo ya fue devuelto');
        }
  
        // Obtener estados necesarios
        const lostStatus = await this.loanStatusRepository.getLostStatus();
        const lostResourceState = await this.resourceStateRepository.getLostState();
  
        if (!lostStatus) {
          throw new BadRequestException('Estado de préstamo "perdido" no encontrado en el sistema');
        }
  
        if (!lostResourceState) {
          throw new BadRequestException('Estado de recurso "perdido" no encontrado en el sistema');
        }
  
        // Actualizar préstamo
        const updateData: any = {
          statusId: lostStatus._id,
          returnedBy: MongoUtils.toObjectId(markedByUserId),
        };
  
        if (observations) {
          const currentObservations = loan.observations || '';
          const newObservations = currentObservations 
            ? `${currentObservations}\n[PERDIDO]: ${observations.trim()}`
            : `[PERDIDO]: ${observations.trim()}`;
          updateData.observations = newObservations;
        }
  
        const updatedLoan = await this.loanRepository.update(loanId, updateData);
        if (!updatedLoan) {
          throw new NotFoundException('No se pudo actualizar el préstamo');
        }
  
        // Actualizar estado del recurso a perdido
        await this.resourceRepository.update(loan.resourceId.toString(), {
          stateId: lostResourceState._id as ObjectId,
          available: false,
        });
  
        this.logger.log(`Loan marked as lost: ${loanId}`);
  
        return this.mapLoanToResponseDto(updatedLoan);
      } catch (error) {
        if (
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
  
        this.logger.error(`Error marking loan as lost: ${loanId}`, error);
        throw new BadRequestException('Error al marcar el préstamo como perdido');
      }
    }
  
    /**
     * Calcular días de retraso
     */
    private calculateDaysOverdue(dueDate: Date, returnDate: Date): number {
      if (returnDate <= dueDate) {
        return 0;
      }
      return DateUtils.daysDifference(dueDate, returnDate);
    }
  
    /**
     * Actualizar estado del recurso devuelto
     */
    private async updateResourceCondition(
      resourceId: string, 
      condition: 'good' | 'deteriorated' | 'damaged' | 'lost'
    ): Promise<boolean> {
      try {
        const resourceState = await this.resourceStateRepository.findByName(condition);
        if (!resourceState) {
          this.logger.warn(`Resource state "${condition}" not found`);
          return false;
        }
  
        const resource = await this.resourceRepository.findById(resourceId);
        if (!resource) {
          this.logger.warn(`Resource ${resourceId} not found`);
          return false;
        }
  
        // Solo actualizar si el estado es diferente
        if (resource.stateId.toString() !== (resourceState._id as ObjectId).toString()) {
          await this.resourceRepository.update(resourceId, {
            stateId: resourceState._id as ObjectId,
          });
          
          this.logger.log(`Resource ${resourceId} condition updated to: ${condition}`);
          return true;
        }
  
        return false;
      } catch (error) {
        this.logger.error(`Error updating resource condition: ${resourceId}`, error);
        return false;
      }
    }
  
    /**
     * Mapear préstamo a DTO de respuesta
     */
    private mapLoanToResponseDto(loan: LoanDocument): LoanResponseDto {
      return {
        _id: (loan._id as any).toString(),
        personId: loan.personId.toString(),
        resourceId: loan.resourceId.toString(),
        quantity: loan.quantity,
        loanDate: loan.loanDate,
        dueDate: loan.dueDate,
        returnedDate: loan.returnedDate,
        statusId: loan.statusId.toString(),
        observations: loan.observations,
        loanedBy: loan.loanedBy.toString(),
        returnedBy: loan.returnedBy?.toString(),
        daysOverdue: loan.daysOverdue,
        isOverdue: loan.isOverdue,
        createdAt: loan.createdAt,
        updatedAt: loan.updatedAt,
      };
    }
  }
  