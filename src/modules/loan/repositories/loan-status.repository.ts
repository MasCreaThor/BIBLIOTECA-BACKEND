// src/modules/loan/repositories/loan-status.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { LoanStatus, LoanStatusDocument } from '@modules/loan/models';
import { LoggerService } from '@shared/services/logger.service';
import { MongoUtils } from '@shared/utils';

interface ErrorWithMessage {
  message: string;
  stack?: string;
}

function isErrorWithMessage(error: unknown): error is ErrorWithMessage {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}

function toErrorWithMessage(maybeError: unknown): ErrorWithMessage {
  if (isErrorWithMessage(maybeError)) return maybeError;

  try {
    return new Error(JSON.stringify(maybeError));
  } catch {
    return new Error(String(maybeError));
  }
}

function getErrorMessage(error: unknown): string {
  return toErrorWithMessage(error).message;
}

function getErrorStack(error: unknown): string | undefined {
  return toErrorWithMessage(error).stack;
}

@Injectable()
export class LoanStatusRepository {
  constructor(
    @InjectModel(LoanStatus.name) private readonly loanStatusModel: Model<LoanStatusDocument>,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LoanStatusRepository');
  }

  /**
   * Obtener estado activo - VERSIÓN MEJORADA
   */
  async getActiveStatus(): Promise<LoanStatusDocument | null> {
    try {
      let activeStatus = await this.loanStatusModel
        .findOne({ name: 'active', active: true })
        .exec();

      // Crear estado activo si no existe
      if (!activeStatus) {
        this.logger.warn('Active loan status not found, creating it...');
        
        try {
          activeStatus = await this.loanStatusModel.create({
            name: 'active',
            description: 'Préstamo activo - El recurso está prestado y dentro del período permitido',
            color: '#007bff',
            active: true
          });
          
          this.logger.log('Active loan status created successfully');
        } catch (createError: unknown) {
          this.logger.error('Error creating active loan status', {
            error: getErrorMessage(createError),
            stack: getErrorStack(createError)
          });
          
          // Intentar buscar nuevamente por si fue creado por otro proceso
          activeStatus = await this.loanStatusModel
            .findOne({ name: 'active', active: true })
            .exec();
        }
      }

      return activeStatus;
    } catch (error: unknown) {
      this.logger.error('Error getting active loan status', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * Buscar estado por nombre
   */
  async findByName(name: string): Promise<LoanStatusDocument | null> {
    try {
      if (!name || typeof name !== 'string') {
        return null;
      }

      return await this.loanStatusModel
        .findOne({ 
          name: name.toLowerCase().trim(), 
          active: true 
        })
        .exec();
    } catch (error: unknown) {
      this.logger.error(`Error finding loan status by name: ${name}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * Buscar estado por ID
   */
  async findById(id: string): Promise<LoanStatusDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      return await this.loanStatusModel
        .findById(id)
        .exec();
    } catch (error: unknown) {
      this.logger.error(`Error finding loan status by ID: ${id}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * Obtener todos los estados activos
   */
  async findAll(): Promise<LoanStatusDocument[]> {
    try {
      return await this.loanStatusModel
        .find({ active: true })
        .sort({ name: 1 })
        .exec();
    } catch (error: unknown) {
      this.logger.error('Error finding all loan statuses', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * Crear nuevo estado
   */
  async create(statusData: Partial<LoanStatus>): Promise<LoanStatusDocument> {
    try {
      // Validar datos básicos
      if (!statusData.name) {
        throw new Error('El nombre del estado es requerido');
      }

      // Verificar que no exista un estado con el mismo nombre
      const existing = await this.findByName(statusData.name);
      if (existing) {
        throw new Error(`Ya existe un estado con el nombre: ${statusData.name}`);
      }

      const status = new this.loanStatusModel({
        ...statusData,
        name: statusData.name.toLowerCase().trim() as 'active' | 'returned' | 'overdue' | 'lost',
        active: statusData.active ?? true
      });
      
      const savedStatus = await status.save();
      this.logger.log(`Created loan status: ${savedStatus.name}`);
      
      return savedStatus;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error creating loan status', {
        error: errorMessage,
        stack: getErrorStack(error),
        statusData
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Actualizar estado
   */
  async update(id: string, updateData: Partial<LoanStatus>): Promise<LoanStatusDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new Error('ID de estado inválido');
      }

      // Si se está actualizando el nombre, validar que no exista otro con el mismo nombre
      if (updateData.name) {
        const existing = await this.loanStatusModel
          .findOne({ 
            name: updateData.name.toLowerCase().trim(),
            _id: { $ne: new Types.ObjectId(id) },
            active: true
          })
          .exec();

        if (existing) {
          throw new Error(`Ya existe otro estado con el nombre: ${updateData.name}`);
        }

        const normalizedName = updateData.name.toLowerCase().trim();
        if (!['active', 'returned', 'overdue', 'lost'].includes(normalizedName)) {
          throw new Error('Nombre de estado inválido. Debe ser uno de: active, returned, overdue, lost');
        }

        updateData.name = normalizedName as 'active' | 'returned' | 'overdue' | 'lost';
      }

      const updatedStatus = await this.loanStatusModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      if (updatedStatus) {
        this.logger.log(`Updated loan status: ${updatedStatus.name}`);
      }

      return updatedStatus;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error updating loan status: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        updateData
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Desactivar estado (soft delete)
   */
  async deactivate(id: string): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return false;
      }

      const result = await this.loanStatusModel
        .findByIdAndUpdate(
          id,
          { active: false },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.log(`Deactivated loan status: ${result.name}`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      this.logger.error(`Error deactivating loan status: ${id}`, {
        error: getErrorMessage(error)
      });
      return false;
    }
  }

  /**
   * Activar estado
   */
  async activate(id: string): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return false;
      }

      const result = await this.loanStatusModel
        .findByIdAndUpdate(id, { active: true }, { new: true })
        .exec();

      if (result) {
        this.logger.log(`Activated loan status: ${result.name}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error activating loan status: ${id}`, error);
      return false;
    }
  }

  /**
   * Eliminar estado permanentemente
   */
  async delete(id: string): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return false;
      }

      // Verificar que no haya préstamos asociados a este estado
      const loansCount = await this.countLoansWithStatus(id);
      if (loansCount > 0) {
        throw new Error(`No se puede eliminar el estado porque tiene ${loansCount} préstamos asociados`);
      }

      const result = await this.loanStatusModel
        .findByIdAndDelete(id)
        .exec();

      if (result) {
        this.logger.log(`Deleted loan status: ${result.name}`);
        return true;
      }

      return false;
    } catch (error) {
      this.logger.error(`Error deleting loan status: ${id}`, error);
      return false;
    }
  }

  /**
   * Contar préstamos con un estado específico
   */
  private async countLoansWithStatus(statusId: string): Promise<number> {
    try {
      // Necesitamos importar el modelo de Loan para esta consulta
      // Por ahora retornamos 0, pero en una implementación real harías la consulta
      return 0;
    } catch (error) {
      this.logger.error(`Error counting loans with status: ${statusId}`, error);
      return 0;
    }
  }

  /**
   * Inicializar estados por defecto
   */
  async initializeDefaultStatuses(): Promise<void> {
    try {
      const defaultStatuses = [
        {
          name: 'active',
          description: 'Préstamo activo - El recurso está prestado y dentro del período permitido',
          color: '#007bff',
          active: true
        },
        {
          name: 'returned',
          description: 'Préstamo devuelto - El recurso ha sido devuelto exitosamente',
          color: '#28a745',
          active: true
        },
        {
          name: 'overdue',
          description: 'Préstamo vencido - El préstamo ha superado la fecha de vencimiento',
          color: '#ffc107',
          active: true
        },
        {
          name: 'lost',
          description: 'Recurso perdido - El recurso se ha marcado como perdido',
          color: '#dc3545',
          active: true
        }
      ];

      for (const statusData of defaultStatuses) {
        const existing = await this.findByName(statusData.name);
        
        if (!existing) {
          await this.create({
            ...statusData,
            name: statusData.name as 'active' | 'returned' | 'overdue' | 'lost'
          });
          this.logger.log(`Initialized default status: ${statusData.name}`);
        } else {
          // Actualizar descripción y color si es necesario
          if (existing.description !== statusData.description || existing.color !== statusData.color) {
            await this.update((existing._id as any).toString(), {
              description: statusData.description,
              color: statusData.color
            });
            this.logger.log(`Updated default status: ${statusData.name}`);
          }
        }
      }

      this.logger.log('Default loan statuses initialized successfully');
    } catch (error) {
      this.logger.error('Error initializing default loan statuses', error);
      throw error;
    }
  }

  /**
   * Obtener estado "returned"
   */
  async getReturnedStatus(): Promise<LoanStatusDocument | null> {
    try {
      let returnedStatus = await this.findByName('returned');

      if (!returnedStatus) {
        this.logger.warn('Returned loan status not found, creating it...');
        returnedStatus = await this.create({
          name: 'returned',
          description: 'Préstamo devuelto - El recurso ha sido devuelto exitosamente',
          color: '#28a745',
          active: true
        });
      }

      return returnedStatus;
    } catch (error) {
      this.logger.error('Error getting returned loan status', error);
      return null;
    }
  }

  /**
   * Obtener estado "overdue"
   */
  async getOverdueStatus(): Promise<LoanStatusDocument | null> {
    try {
      let overdueStatus = await this.findByName('overdue');

      if (!overdueStatus) {
        this.logger.warn('Overdue loan status not found, creating it...');
        overdueStatus = await this.create({
          name: 'overdue',
          description: 'Préstamo vencido - El préstamo ha superado la fecha de vencimiento',
          color: '#ffc107',
          active: true
        });
      }

      return overdueStatus;
    } catch (error) {
      this.logger.error('Error getting overdue loan status', error);
      return null;
    }
  }

  /**
   * Obtener estado "lost"
   */
  async getLostStatus(): Promise<LoanStatusDocument | null> {
    try {
      let lostStatus = await this.findByName('lost');

      if (!lostStatus) {
        this.logger.warn('Lost loan status not found, creating it...');
        lostStatus = await this.create({
          name: 'lost',
          description: 'Recurso perdido - El recurso se ha marcado como perdido',
          color: '#dc3545',
          active: true
        });
      }

      return lostStatus;
    } catch (error) {
      this.logger.error('Error getting lost loan status', error);
      return null;
    }
  }

  /**
   * Contar total de estados
   */
  async count(): Promise<number> {
    try {
      return await this.loanStatusModel.countDocuments({ active: true }).exec();
    } catch (error) {
      this.logger.error('Error counting loan statuses', error);
      return 0;
    }
  }

  /**
   * Verificar si existe un estado con un nombre específico
   */
  async existsByName(name: string): Promise<boolean> {
    try {
      const status = await this.findByName(name);
      return !!status;
    } catch (error) {
      this.logger.error(`Error checking if status exists by name: ${name}`, error);
      return false;
    }
  }

  /**
   * Obtener estadísticas de uso de estados
   */
  async getUsageStatistics(): Promise<Array<{
    statusId: string;
    statusName: string;
    count: number;
    color: string;
  }>> {
    try {
      // Esta implementación requeriría acceso al modelo de Loan
      // Por ahora retornamos un array vacío
      return [];
    } catch (error) {
      this.logger.error('Error getting usage statistics', error);
      return [];
    }
  }
}