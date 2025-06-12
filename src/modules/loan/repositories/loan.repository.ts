// src/modules/loan/repositories/loan.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Loan, LoanDocument } from '@modules/loan/models';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class LoanRepository extends BaseRepositoryImpl<LoanDocument> {
  constructor(@InjectModel(Loan.name) private loanModel: Model<LoanDocument>) {
    super(loanModel);
  }

  /**
   * Buscar préstamos activos de una persona
   */
  async findActiveByPerson(personId: string): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ 
        personId: new Types.ObjectId(personId),
        returnedDate: null
      })
      .populate(['personId', 'resourceId', 'statusId'])
      .sort({ loanDate: -1 })
      .exec();
  }

  /**
   * Buscar préstamos activos de un recurso
   */
  async findActiveByResource(resourceId: string): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ 
        resourceId: new Types.ObjectId(resourceId),
        returnedDate: null
      })
      .populate(['personId', 'resourceId', 'statusId'])
      .sort({ loanDate: -1 })
      .exec();
  }

  /**
   * Verificar si un recurso está disponible
   */
  async isResourceAvailable(resourceId: string): Promise<boolean> {
    const activeLoans = await this.loanModel
      .countDocuments({
        resourceId: new Types.ObjectId(resourceId),
        returnedDate: null
      })
      .exec();

    return activeLoans === 0;
  }

  /**
   * Contar préstamos activos de una persona
   */
  async countActiveByPerson(personId: string): Promise<number> {
    return this.loanModel
      .countDocuments({
        personId: new Types.ObjectId(personId),
        returnedDate: null
      })
      .exec();
  }

  /**
   * Buscar préstamos vencidos
   */
  async findOverdueLoans(): Promise<LoanDocument[]> {
    const today = new Date();
    
    return this.loanModel
      .find({
        returnedDate: null,
        dueDate: { $lt: today }
      })
      .populate(['personId', 'resourceId', 'statusId'])
      .sort({ dueDate: 1 })
      .exec();
  }

  /**
   * Buscar préstamos con filtros avanzados
   */
  async findWithFilters(
    filters: {
      personId?: string;
      resourceId?: string;
      statusId?: string;
      isOverdue?: boolean;
      dateFrom?: Date;
      dateTo?: Date;
      search?: string;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: LoanDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {};

    if (filters.personId) {
      query.personId = new Types.ObjectId(filters.personId);
    }

    if (filters.resourceId) {
      query.resourceId = new Types.ObjectId(filters.resourceId);
    }

    if (filters.statusId) {
      query.statusId = new Types.ObjectId(filters.statusId);
    }

    if (filters.isOverdue === true) {
      query.returnedDate = null;
      query.dueDate = { $lt: new Date() };
    }

    if (filters.dateFrom || filters.dateTo) {
      query.loanDate = {};
      if (filters.dateFrom) {
        query.loanDate.$gte = filters.dateFrom;
      }
      if (filters.dateTo) {
        query.loanDate.$lte = filters.dateTo;
      }
    }

    const skip = (page - 1) * limit;
    const total = await this.loanModel
      .countDocuments(query as FilterQuery<LoanDocument>)
      .exec();
    const totalPages = Math.ceil(total / limit);

    let queryBuilder = this.loanModel
      .find(query as FilterQuery<LoanDocument>)
      .populate(['personId', 'resourceId', 'statusId', 'loanedBy', 'returnedBy'])
      .sort({ loanDate: -1 })
      .skip(skip)
      .limit(limit);

    // Si hay búsqueda por texto, necesitamos hacer populate primero y luego filtrar
    let data = await queryBuilder.exec();

    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      data = data.filter((loan: any) => {
        const person = loan.personId;
        const resource = loan.resourceId;
        
        return (
          person?.firstName?.toLowerCase().includes(searchLower) ||
          person?.lastName?.toLowerCase().includes(searchLower) ||
          person?.documentNumber?.toLowerCase().includes(searchLower) ||
          resource?.title?.toLowerCase().includes(searchLower)
        );
      });
    }

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Buscar historial de préstamos de una persona
   */
  async findHistoryByPerson(personId: string, limit: number = 50): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ personId: new Types.ObjectId(personId) })
      .populate(['personId', 'resourceId', 'statusId'])
      .sort({ loanDate: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Buscar historial de préstamos de un recurso
   */
  async findHistoryByResource(resourceId: string, limit: number = 50): Promise<LoanDocument[]> {
    return this.loanModel
      .find({ resourceId: new Types.ObjectId(resourceId) })
      .populate(['personId', 'resourceId', 'statusId'])
      .sort({ loanDate: -1 })
      .limit(limit)
      .exec();
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
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const [
      totalLoans,
      activeLoans,
      overdueLoans,
      returnedThisMonth,
      mostBorrowedResources
    ] = await Promise.all([
      this.loanModel.countDocuments().exec(),
      this.loanModel.countDocuments({ returnedDate: null }).exec(),
      this.loanModel.countDocuments({ 
        returnedDate: null, 
        dueDate: { $lt: today } 
      }).exec(),
      this.loanModel.countDocuments({ 
        returnedDate: { $gte: firstDayOfMonth } 
      }).exec(),
      this.loanModel.aggregate([
        { $group: { _id: '$resourceId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $project: { resourceId: '$_id', count: 1, _id: 0 } }
      ]).exec()
    ]);

    return {
      totalLoans,
      activeLoans,
      overdueLoans,
      returnedThisMonth,
      mostBorrowedResources,
    };
  }

  /**
   * Actualizar estado de préstamos vencidos
   */
  async updateOverdueStatus(overdueStatusId: string): Promise<number> {
    const today = new Date();
    
    const result = await this.loanModel
      .updateMany(
        {
          returnedDate: null,
          dueDate: { $lt: today },
          statusId: { $ne: new Types.ObjectId(overdueStatusId) }
        },
        {
          statusId: new Types.ObjectId(overdueStatusId)
        }
      )
      .exec();

    return result.modifiedCount || 0;
  }

  /**
   * Buscar préstamos próximos a vencer (dentro de X días)
   */
  async findLoansNearDue(daysUntilDue: number = 3): Promise<LoanDocument[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysUntilDue);

    return this.loanModel
      .find({
        returnedDate: null,
        dueDate: { 
          $gte: today,
          $lte: futureDate
        }
      })
      .populate(['personId', 'resourceId', 'statusId'])
      .sort({ dueDate: 1 })
      .exec();
  }
}