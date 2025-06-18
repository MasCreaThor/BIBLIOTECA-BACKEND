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
  async findWithCompletePopulate(filter: Record<string, any> = {}): Promise<any[]> {
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
            select: 'title isbn author totalQuantity currentLoansCount available typeId categoryId stateId locationId',
            populate: {
              path: 'locationId',
              select: 'name description code'
            }
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

      // ✅ CORRECCIÓN: Mapear la estructura para que coincida con el método de búsqueda por texto
      return loans.map(loan => {
        const loanObj = loan.toObject();
        
        // Agregar fullName calculado
        if (loanObj.personId && typeof loanObj.personId === 'object') {
          const person = loanObj.personId as any;
          person.fullName = `${person.firstName} ${person.lastName}`;
        }
        
        // ✅ CORRECCIÓN: Mapear campos para mantener compatibilidad con el frontend
        return {
          ...loanObj,
          // Mantener los ObjectId originales
          personId: loanObj.personId,
          resourceId: loanObj.resourceId,
          statusId: loanObj.statusId,
          loanedBy: loanObj.loanedBy,
          returnedBy: loanObj.returnedBy,
          renewedBy: loanObj.renewedBy,
          // Agregar campos poblados con nombres compatibles
          person: loanObj.personId,
          resource: loanObj.resourceId,
          status: loanObj.statusId,
          loanedByUser: loanObj.loanedBy,
          returnedByUser: loanObj.returnedBy,
          renewedByUser: loanObj.renewedBy
        };
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
  async findByIdWithPopulate(id: string): Promise<any | null> {
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
            select: 'title isbn author totalQuantity currentLoansCount available typeId categoryId stateId locationId',
            populate: {
              path: 'locationId',
              select: 'name description code'
            }
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

      // ✅ CORRECCIÓN: Agregar fullName calculado y mapear estructura
      const loanObj = loan.toObject();
      if (loanObj.personId && typeof loanObj.personId === 'object') {
        const person = loanObj.personId as any;
        person.fullName = `${person.firstName} ${person.lastName}`;
      }
      
      // ✅ CORRECCIÓN: Mapear campos para mantener compatibilidad con el frontend
      return {
        ...loanObj,
        // Mantener los ObjectId originales
        personId: loanObj.personId,
        resourceId: loanObj.resourceId,
        statusId: loanObj.statusId,
        loanedBy: loanObj.loanedBy,
        returnedBy: loanObj.returnedBy,
        renewedBy: loanObj.renewedBy,
        // Agregar campos poblados con nombres compatibles
        person: loanObj.personId,
        resource: loanObj.resourceId,
        status: loanObj.statusId,
        loanedByUser: loanObj.loanedBy,
        returnedByUser: loanObj.returnedBy,
        renewedByUser: loanObj.renewedBy
      };
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
  async update(id: string, updateData: Partial<Loan>): Promise<any | null> {
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
            select: 'title isbn author totalQuantity currentLoansCount available typeId categoryId stateId locationId',
            populate: {
              path: 'locationId',
              select: 'name description code'
            }
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

      // ✅ CORRECCIÓN: Agregar fullName calculado y mapear estructura
      const loanObj = loan.toObject();
      if (loanObj.personId && typeof loanObj.personId === 'object') {
        const person = loanObj.personId as any;
        person.fullName = `${person.firstName} ${person.lastName}`;
      }
      
      // ✅ CORRECCIÓN: Mapear campos para mantener compatibilidad con el frontend
      return {
        ...loanObj,
        // Mantener los ObjectId originales
        personId: loanObj.personId,
        resourceId: loanObj.resourceId,
        statusId: loanObj.statusId,
        loanedBy: loanObj.loanedBy,
        returnedBy: loanObj.returnedBy,
        renewedBy: loanObj.renewedBy,
        // Agregar campos poblados con nombres compatibles
        person: loanObj.personId,
        resource: loanObj.resourceId,
        status: loanObj.statusId,
        loanedByUser: loanObj.loanedBy,
        returnedByUser: loanObj.returnedBy,
        renewedByUser: loanObj.renewedBy
      };
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
            select: 'title isbn totalQuantity currentLoansCount available typeId categoryId stateId locationId',
            populate: {
              path: 'locationId',
              select: 'name description code'
            }
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
            select: 'title isbn author totalQuantity currentLoansCount available typeId categoryId stateId locationId',
            populate: {
              path: 'locationId',
              select: 'name description code'
            }
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
            select: 'title isbn author totalQuantity currentLoansCount available typeId categoryId stateId locationId',
            populate: {
              path: 'locationId',
              select: 'name description code'
            }
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

  /**
   * ✅ NUEVO: Buscar préstamos con búsqueda por texto
   */
  async findWithTextSearch(
    searchTerm: string, 
    additionalFilter: Record<string, any> = {}
  ): Promise<LoanDocument[]> {
    try {
      this.logger.debug(`Searching loans with text: ${searchTerm}`);

      // Crear filtro de búsqueda por texto usando agregación
      const pipeline: any[] = [
        // Populate de todas las relaciones necesarias
        {
          $lookup: {
            from: 'people',
            localField: 'personId',
            foreignField: '_id',
            as: 'person'
          }
        },
        {
          $lookup: {
            from: 'resources',
            localField: 'resourceId',
            foreignField: '_id',
            as: 'resource'
          }
        },
        {
          $lookup: {
            from: 'loanstatuses',
            localField: 'statusId',
            foreignField: '_id',
            as: 'status'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'loanedBy',
            foreignField: '_id',
            as: 'loanedByUser'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'returnedBy',
            foreignField: '_id',
            as: 'returnedByUser'
          }
        },
        {
          $lookup: {
            from: 'users',
            localField: 'renewedBy',
            foreignField: '_id',
            as: 'renewedByUser'
          }
        },
        // Descomponer arrays para facilitar la búsqueda
        {
          $unwind: {
            path: '$person',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$resource',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$status',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$loanedByUser',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$returnedByUser',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $unwind: {
            path: '$renewedByUser',
            preserveNullAndEmptyArrays: true
          }
        },
        // Agregar fullName calculado
        {
          $addFields: {
            'person.fullName': {
              $concat: [
                { $ifNull: ['$person.firstName', ''] },
                ' ',
                { $ifNull: ['$person.lastName', ''] }
              ]
            }
          }
        },
        // Filtro de búsqueda por texto
        {
          $match: {
            $or: [
              // Búsqueda por nombre de persona
              {
                'person.fullName': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              {
                'person.firstName': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              {
                'person.lastName': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              // Búsqueda por número de documento
              {
                'person.documentNumber': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              // Búsqueda por título de recurso
              {
                'resource.title': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              // Búsqueda por autor del recurso
              {
                'resource.author': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              // Búsqueda por ISBN
              {
                'resource.isbn': {
                  $regex: searchTerm,
                  $options: 'i'
                }
              },
              // Búsqueda por observaciones
              {
                observations: {
                  $regex: searchTerm,
                  $options: 'i'
                }
              }
            ],
            ...additionalFilter
          }
        },
        // Ordenar por fecha de préstamo (más recientes primero)
        {
          $sort: { loanDate: -1 }
        },
        // ✅ CORRECCIÓN: Preservar los ObjectId originales y agregar datos poblados
        {
          $addFields: {
            // Preservar los ObjectId originales
            originalPersonId: '$personId',
            originalResourceId: '$resourceId',
            originalStatusId: '$statusId'
          }
        },
        // ✅ CORRECCIÓN: Proyectar la estructura correcta para el frontend
        {
          $project: {
            _id: 1,
            personId: '$originalPersonId',
            resourceId: '$originalResourceId',
            statusId: '$originalStatusId',
            quantity: 1,
            loanDate: 1,
            dueDate: 1,
            returnedDate: 1,
            observations: 1,
            loanedBy: 1,
            returnedBy: 1,
            renewedBy: 1,
            renewedAt: 1,
            createdAt: 1,
            updatedAt: 1,
            // Mapear los campos poblados a la estructura esperada
            person: '$person',
            resource: '$resource',
            status: '$status',
            loanedByUser: '$loanedByUser',
            returnedByUser: '$returnedByUser',
            renewedByUser: '$renewedByUser'
          }
        }
      ];

      const loans = await this.loanModel.aggregate(pipeline).exec();

      this.logger.debug(`Found ${loans.length} loans matching search term: ${searchTerm}`);
      return loans;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error searching loans with text', {
        error: errorMessage,
        stack: getErrorStack(error),
        searchTerm,
        additionalFilter
      });
      return [];
    }
  }
}