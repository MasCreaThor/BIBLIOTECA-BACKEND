// src/modules/loan/repositories/loan.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Loan, LoanDocument } from '@modules/loan/models';
import { LoggerService } from '@shared/services/logger.service';
import { MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';
import { LoanStatusRepository } from '@modules/loan/repositories/loan-status.repository';

@Injectable()
export class LoanRepository {
  constructor(
    @InjectModel(Loan.name) private readonly loanModel: Model<LoanDocument>,
    private readonly logger: LoggerService,
    private readonly loanStatusRepository: LoanStatusRepository
  ) {
    this.logger.setContext('LoanRepository');
  }

  /**
   * Crear un nuevo préstamo
   */
  async create(loanData: Partial<Loan>): Promise<LoanDocument> {
    try {
      const loan = new this.loanModel(loanData);
      const savedLoan = await loan.save();
      
      // Populate automáticamente después de crear
      const result = await this.loanModel
        .findById(savedLoan._id)
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .exec();
      return result!;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error creating loan', {
        error: errorMessage,
        stack: getErrorStack(error),
        loanData
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Buscar préstamo por ID
   */
  async findById(id: string): Promise<LoanDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      return await this.loanModel
        .findById(id)
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
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
   * Actualizar préstamo
   */
  async update(id: string, updateData: Partial<Loan>): Promise<LoanDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      return await this.loanModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName' 
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available' 
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
            select: 'title isbn author' 
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
      return false; // En caso de error, asumir que no está disponible
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
            select: 'title isbn author' 
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
      const activeStatus = await this.loanStatusRepository.findByName('active');
      if (!activeStatus) {
        return [];
      }

      const query = this.loanModel
        .find({
          statusId: activeStatus._id,
          returnedDate: null
        })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .sort({ loanDate: -1 });

      if (limit) {
        query.limit(limit);
      }

      return await query.exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding active loans', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * Buscar préstamos vencidos
   */
  async findOverdue(): Promise<LoanDocument[]> {
    try {
      const today = new Date();
      return await this.loanModel
        .find({
          dueDate: { $lt: today },
          returnedDate: null
        })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .sort({ dueDate: 1 })
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding overdue loans', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * Actualizar préstamos vencidos
   */
  async updateOverdueLoans(overdueStatusId: Types.ObjectId, currentDate: Date): Promise<number> {
    try {
      const result = await this.loanModel.updateMany(
        {
          returnedDate: null,
          dueDate: { $lt: currentDate },
          statusId: { $ne: overdueStatusId }
        },
        {
          $set: {
            statusId: overdueStatusId,
            isOverdue: true,
            updatedAt: new Date()
          }
        }
      );

      return result.modifiedCount;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error updating overdue loans', {
        error: errorMessage,
        stack: getErrorStack(error),
        overdueStatusId,
        currentDate
      });
      return 0;
    }
  }

  /**
   * Buscar con filtros y paginación
   */
  async findWithFilters(
    filters: any, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{
    data: LoanDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    try {
      const skip = (page - 1) * limit;
      const total = await this.loanModel.countDocuments(filters);
      const totalPages = Math.ceil(total / limit);

      const data = await this.loanModel
        .find(filters)
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
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
        .sort({ loanDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec();

      return {
        data,
        total,
        page,
        totalPages,
      };
    } catch (error: unknown) {
      this.handleError(error, 'finding loans with filters');
      return {
        data: [],
        total: 0,
        page,
        totalPages: 0,
      };
    }
  }

  /**
   * Buscar historial de préstamos de una persona
   */
  async findHistoryByPerson(personId: string, limit: number = 50): Promise<LoanDocument[]> {
    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        return [];
      }

      return await this.loanModel
        .find({ personId: new Types.ObjectId(personId) })
        .populate([
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
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
        .sort({ loanDate: -1 })
        .limit(limit)
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan history for person: ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        limit
      });
      return [];
    }
  }

  /**
   * Buscar historial de préstamos de un recurso
   */
  async findHistoryByResource(resourceId: string, limit: number = 50): Promise<LoanDocument[]> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return [];
      }

      return await this.loanModel
        .find({ resourceId: new Types.ObjectId(resourceId) })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
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
        .sort({ loanDate: -1 })
        .limit(limit)
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan history for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        limit
      });
      return [];
    }
  }

  /**
   * Obtener estadísticas de préstamos
   */
  async getStatistics(): Promise<{
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    returnedThisMonth: number;
    mostBorrowedResources: Array<{ resourceId: string; count: number }>;
  }> {
    try {
      const activeStatus = await this.loanStatusRepository.findByName('active');
      const overdueStatus = await this.loanStatusRepository.findByName('overdue');
      const returnedStatus = await this.loanStatusRepository.findByName('returned');

      if (!activeStatus || !overdueStatus || !returnedStatus) {
        throw new Error('Estados de préstamo no encontrados');
      }

      // Obtener total de préstamos
      const totalLoans = await this.loanModel.countDocuments();

      // Obtener préstamos activos
      const activeLoans = await this.loanModel.countDocuments({
        statusId: activeStatus._id,
        returnedDate: null
      });

      // Obtener préstamos vencidos
      const overdueLoans = await this.loanModel.countDocuments({
        statusId: overdueStatus._id,
        returnedDate: null
      });

      // Obtener préstamos devueltos este mes
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const returnedThisMonth = await this.loanModel.countDocuments({
        statusId: returnedStatus._id,
        returnedDate: { $gte: startOfMonth }
      });

      // Obtener recursos más prestados
      const mostBorrowedResources = await this.getMostBorrowedResources();

      return {
        totalLoans,
        activeLoans,
        overdueLoans,
        returnedThisMonth,
        mostBorrowedResources
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting loan statistics', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return {
        totalLoans: 0,
        activeLoans: 0,
        overdueLoans: 0,
        returnedThisMonth: 0,
        mostBorrowedResources: []
      };
    }
  }

  /**
   * Obtener recursos más prestados
   */
  private async getMostBorrowedResources(): Promise<Array<{ resourceId: string; count: number }>> {
    try {
      const result = await this.loanModel.aggregate([
        {
          $group: {
            _id: '$resourceId',
            count: { $sum: 1 }
          }
        },
        {
          $sort: { count: -1 }
        },
        {
          $limit: 10
        },
        {
          $project: {
            _id: 0,
            resourceId: '$_id',
            count: 1
          }
        }
      ]);

      return result.map(item => ({
        resourceId: item.resourceId.toString(),
        count: item.count
      }));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting most borrowed resources', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * Buscar préstamos con datos inconsistentes
   */
  async findInconsistentLoans(): Promise<LoanDocument[]> {
    try {
      // Buscar préstamos que tienen fecha de devolución pero estado activo
      return await this.loanModel
        .find({
          $or: [
            // Préstamos devueltos pero con estado activo
            {
              returnedDate: { $ne: null },
              statusId: { $exists: true }
            }
            // Agregar más criterios de inconsistencia según sea necesario
          ]
        })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber' 
          },
          { 
            path: 'resourceId', 
            select: 'title isbn' 
          },
          { 
            path: 'statusId', 
            select: 'name description' 
          }
        ])
        .exec();
    } catch (error) {
      this.logger.error('Error finding inconsistent loans', error);
      return [];
    }
  }

  /**
   * Contar total de préstamos
   */
  async count(): Promise<number> {
    try {
      return await this.loanModel.countDocuments();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error counting loans', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return 0;
    }
  }

  /**
   * Eliminar préstamo
   */
  async delete(id: string): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return false;
      }

      const result = await this.loanModel.findByIdAndDelete(id);
      return result !== null;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error deleting loan: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return false;
    }
  }

  /**
   * Contar préstamos por rango de fechas
   */
  async countByDateRange(startDate: Date, endDate: Date): Promise<number> {
    try {
      return await this.loanModel.countDocuments({
        loanDate: {
          $gte: startDate,
          $lte: endDate
        }
      });
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error counting loans by date range', {
        error: errorMessage,
        stack: getErrorStack(error),
        dateRange: { startDate, endDate }
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Buscar préstamos por rango de fechas
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ): Promise<{
    data: LoanDocument[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const { page = 1, limit = 20, search, status } = options;
      const skip = (page - 1) * limit;

      // Construir el filtro base
      const filter: any = {
        loanDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      // Agregar filtro de estado si se proporciona
      if (status) {
        const statusDoc = await this.loanStatusRepository.findByName(status);
        if (statusDoc) {
          filter.statusId = statusDoc._id;
        }
      }

      // Agregar búsqueda por texto si se proporciona
      if (search) {
        filter.$or = [
          { 'personId.firstName': { $regex: search, $options: 'i' } },
          { 'personId.lastName': { $regex: search, $options: 'i' } },
          { 'resourceId.title': { $regex: search, $options: 'i' } },
          { 'resourceId.isbn': { $regex: search, $options: 'i' } }
        ];
      }

      // Ejecutar la consulta con paginación
      const [data, total] = await Promise.all([
        this.loanModel
          .find(filter)
          .populate([
            { 
              path: 'personId', 
              select: 'firstName lastName documentNumber grade fullName',
              populate: { path: 'personType', select: 'name description' }
            },
            { 
              path: 'resourceId', 
              select: 'title isbn author available',
              populate: { path: 'state', select: 'name description color' }
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
          .sort({ loanDate: -1 })
          .skip(skip)
          .limit(limit)
          .exec(),
        this.loanModel.countDocuments(filter)
      ]);

      return {
        data,
        total,
        page,
        limit
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding loans by date range', {
        error: errorMessage,
        stack: getErrorStack(error),
        startDate,
        endDate,
        options
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Buscar préstamos próximos a vencer
   */
  async findLoansNearDue(daysUntilDue: number = 3): Promise<LoanDocument[]> {
    try {
      const today = new Date();
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + daysUntilDue);

      return await this.loanModel
        .find({
          dueDate: {
            $gte: today,
            $lte: dueDate
          },
          returnedDate: null
        })
        .populate([
          { 
            path: 'personId', 
            select: 'firstName lastName documentNumber grade fullName',
            populate: { path: 'personType', select: 'name description' }
          },
          { 
            path: 'resourceId', 
            select: 'title isbn author available',
            populate: { path: 'state', select: 'name description color' }
          },
          { 
            path: 'statusId', 
            select: 'name description color' 
          },
          { 
            path: 'loanedBy', 
            select: 'firstName lastName username' 
          }
        ])
        .sort({ dueDate: 1 })
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding loans near due date', {
        error: errorMessage,
        stack: getErrorStack(error),
        daysUntilDue
      });
      return [];
    }
  }

  private handleError(error: unknown, context: string): void {
    if (error instanceof Error) {
      this.logger.error(`Error in loan repository: ${error.message}`, {
        context,
        error: error.message,
        stack: error.stack
      });
    } else {
      this.logger.error(`Error in loan repository: ${String(error)}`, {
        context,
        error: String(error)
      });
    }
  }
}