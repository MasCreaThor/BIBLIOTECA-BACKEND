// src/modules/loan/repositories/loan.repository.ts - ACTUALIZADO CON MÉTODOS DE STOCK
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan, LoanDocument } from '@modules/loan/models';
import { LoanStatusRepository } from './loan-status.repository';
import { BaseRepositoryImpl } from '@shared/repositories';
import { LoggerService } from '@shared/services/logger.service';
import { MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';

@Injectable()
export class LoanRepository extends BaseRepositoryImpl<LoanDocument> {
  constructor(
    @InjectModel(Loan.name) private loanModel: Model<LoanDocument>,
    private readonly loanStatusRepository: LoanStatusRepository,
    private readonly logger: LoggerService,
  ) {
    super(loanModel);
    this.logger.setContext('LoanRepository');
  }

  // ✅ MÉTODOS EXISTENTES MANTENIDOS

  /**
   * Buscar préstamos con populate completo
   */
  async findWithCompletePopulate(filter: Record<string, any> = {}): Promise<LoanDocument[]> {
    try {
      const loans = await this.loanModel
        .find(filter)
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade personTypeId',
            populate: {
              path: 'personTypeId',
              select: 'name description'
            }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn totalQuantity currentLoansCount available typeId categoryId stateId',
            populate: [
              { path: 'typeId', select: 'name description' },
              { path: 'categoryId', select: 'name description color' },
              { path: 'stateId', select: 'name description color' }
            ]
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          },
          { 
            path: 'returnedBy', 
            select: 'firstName lastName username' 
          },
          { 
            path: 'renewedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .sort({ loanDate: -1 })
        .exec();

      // ✅ CORRECCIÓN: Agregar fullName calculado para cada préstamo
      return loans.map(loan => {
        const loanObj = loan.toObject();
        if (loanObj.personId && typeof loanObj.personId === 'object') {
          const person = loanObj.personId as any;
          person.fullName = `${person.firstName} ${person.lastName}`;
        }
        return loanObj;
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding loans with complete populate', {
        error: errorMessage,
        stack: getErrorStack(error),
        filter
      });
      return [];
    }
  }

  /**
   * Buscar por ID con populate completo
   */
  async findByIdWithPopulate(id: string): Promise<LoanDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      const loan = await this.loanModel
        .findById(id)
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade personTypeId',
            populate: {
              path: 'personTypeId',
              select: 'name description'
            }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn totalQuantity currentLoansCount available typeId categoryId stateId',
            populate: [
              { path: 'typeId', select: 'name description' },
              { path: 'categoryId', select: 'name description color' },
              { path: 'stateId', select: 'name description color' }
            ]
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          },
          { 
            path: 'returnedBy', 
            select: 'firstName lastName username' 
          },
          { 
            path: 'renewedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .exec();

      if (!loan) {
        return null;
      }

      // ✅ CORRECCIÓN: Agregar fullName calculado
      const loanObj = loan.toObject();
      if (loanObj.personId && typeof loanObj.personId === 'object') {
        const person = loanObj.personId as any;
        person.fullName = `${person.firstName} ${person.lastName}`;
      }
      return loanObj;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan by ID: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * Actualizar préstamo con populate
   */
  async update(id: string, updateData: Partial<Loan>): Promise<LoanDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      const loan = await this.loanModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade' 
          },
          { 
            path: 'resourceId', 
            select: 'title isbn totalQuantity currentLoansCount available' 
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          },
          { 
            path: 'returnedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .exec();

      if (!loan) {
        return null;
      }

      // ✅ CORRECCIÓN: Agregar fullName calculado
      const loanObj = loan.toObject();
      if (loanObj.personId && typeof loanObj.personId === 'object') {
        const person = loanObj.personId as any;
        person.fullName = `${person.firstName} ${person.lastName}`;
      }
      return loanObj;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error updating loan: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        updateData
      });
      return null;
    }
  }

  /**
   * Actualizar préstamo sin populate (optimizado)
   */
  async updateBasic(id: string, updateData: Partial<Loan>): Promise<LoanDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      return await this.loanModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error updating loan (basic): ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        updateData
      });
      return null;
    }
  }

  /**
   * Buscar préstamos activos de una persona
   */
  async findActiveByPerson(personId: string): Promise<LoanDocument[]> {
    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        return [];
      }

      return await this.loanModel
        .find({ 
          personId: new Types.ObjectId(personId), 
          returnedDate: null 
        })
        .populate([
          { 
            path: 'resourceId', 
            select: 'title isbn totalQuantity currentLoansCount available' 
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          }
        ])
        .sort({ loanDate: -1 })
        .exec();
    } catch (error) {
      this.logger.error(`Error finding active loans for person: ${personId}`, error);
      return [];
    }
  }

  /**
   * Verificar si un recurso está disponible (no prestado actualmente)
   */
  async isResourceAvailable(resourceId: string): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const activeLoansCount = await this.loanModel
        .countDocuments({
          resourceId: new Types.ObjectId(resourceId),
          returnedDate: null
        })
        .exec();
      
      return activeLoansCount === 0;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error checking resource availability for ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Contar préstamos activos por recurso (para gestión de stock)
   */
  async countActiveByResource(resourceId: string): Promise<number> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return 0;
      }

      const count = await this.loanModel
        .countDocuments({
          resourceId: new Types.ObjectId(resourceId),
          returnedDate: null
        })
        .exec();

      this.logger.debug(`Active loans for resource ${resourceId}: ${count}`);
      return count;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error counting active loans for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return 0;
    }
  }

  /**
   * ✅ NUEVO: Obtener cantidad total prestada de un recurso
   */
  async getTotalQuantityLoanedByResource(resourceId: string): Promise<number> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return 0;
      }

      const result = await this.loanModel
        .aggregate([
          {
            $match: {
              resourceId: new Types.ObjectId(resourceId),
              returnedDate: null
            }
          },
          {
            $group: {
              _id: null,
              totalQuantity: { $sum: '$quantity' }
            }
          }
        ])
        .exec();

      const totalQuantity = result.length > 0 ? result[0].totalQuantity : 0;
      this.logger.debug(`Total quantity loaned for resource ${resourceId}: ${totalQuantity}`);
      return totalQuantity;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error getting total quantity loaned for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return 0;
    }
  }

  /**
   * ✅ NUEVO: Buscar préstamos activos con cantidad por recurso
   */
  async findActiveLoansWithQuantityByResource(resourceId: string): Promise<Array<{
    _id: string;
    personId: string;
    quantity: number;
    loanDate: Date;
    dueDate: Date;
  }>> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return [];
      }

      const loans = await this.loanModel
        .find(
          {
            resourceId: new Types.ObjectId(resourceId),
            returnedDate: null
          },
          {
            _id: 1,
            personId: 1,
            quantity: 1,
            loanDate: 1,
            dueDate: 1
          }
        )
        .sort({ loanDate: -1 })
        .exec();

      return loans.map(loan => ({
        _id: loan._id instanceof Types.ObjectId ? loan._id.toString() : loan._id as string,
        personId: loan.personId.toString(),
        quantity: loan.quantity,
        loanDate: loan.loanDate,
        dueDate: loan.dueDate
      }));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding active loans with quantity for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * Contar préstamos activos de una persona
   */
  async countActiveByPerson(personId: string): Promise<number> {
    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        return 0;
      }

      return await this.loanModel
        .countDocuments({
          personId: new Types.ObjectId(personId),
          returnedDate: null
        })
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error counting active loans for person: ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return 0;
    }
  }

  /**
   * Buscar préstamos vencidos de una persona
   */
  async findOverdueByPerson(personId: string): Promise<LoanDocument[]> {
    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        return [];
      }

      const overdueStatus = await this.loanStatusRepository.findByName('overdue');
      if (!overdueStatus) {
        return [];
      }

      return await this.loanModel
        .find({
          personId: new Types.ObjectId(personId),
          statusId: overdueStatus._id,
          returnedDate: null
        })
        .populate([
          { 
            path: 'resourceId', 
            select: 'title isbn totalQuantity currentLoansCount available' 
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          }
        ])
        .sort({ dueDate: 1 })
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding overdue loans for person: ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * Buscar préstamos activos
   */
  async findActiveLoans(limit?: number): Promise<LoanDocument[]> {
    try {
      let query = this.loanModel
        .find({ returnedDate: null })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName fullName documentNumber grade' 
          },
          { 
            path: 'resourceId', 
            select: 'title isbn totalQuantity currentLoansCount available' 
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          }
        ])
        .sort({ loanDate: -1 });

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      return await query.exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding active loans', {
        error: errorMessage,
        stack: getErrorStack(error),
        limit
      });
      return [];
    }
  }

  /**
   * ✅ NUEVO: Actualizar stock después de préstamo o devolución
   */
  async updateResourceStock(resourceId: string, quantityChange: number): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      // Este método debería coordinarse con ResourceRepository
      // Por ahora, solo registramos la operación
      this.logger.debug(`Stock change for resource ${resourceId}: ${quantityChange}`);
      
      // La actualización real del stock se hace en ResourceRepository
      return true;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error updating resource stock: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantityChange
      });
      return false;
    }
  }

  /**
   * Actualizar múltiples préstamos
   */
  async updateManyLoans(filter: Record<string, any>, updateData: Record<string, any>): Promise<number> {
    try {
      const result = await this.loanModel.updateMany(filter, updateData).exec();
      return (result as any).modifiedCount ?? 0;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error updating multiple loans', {
        error: errorMessage,
        stack: getErrorStack(error),
        filter,
        updateData
      });
      return 0;
    }
  }
}