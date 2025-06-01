// src/modules/resource/repositories/resource.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Resource, ResourceDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para recursos de la biblioteca
 */

@Injectable()
export class ResourceRepository extends BaseRepositoryImpl<ResourceDocument> {
  constructor(@InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>) {
    super(resourceModel);
  }

  /**
   * Buscar recursos por título (búsqueda de texto)
   */
  async findByTitle(title: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ 
        $text: { $search: title },
        available: true 
      })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ score: { $meta: 'textScore' } })
      .exec();
  }

  /**
   * Buscar recursos por ISBN
   */
  async findByISBN(isbn: string): Promise<ResourceDocument | null> {
    return this.resourceModel
      .findOne({ isbn })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .exec();
  }

  /**
   * Buscar recursos por Google Books ID
   */
  async findByGoogleBooksId(googleBooksId: string): Promise<ResourceDocument | null> {
    return this.resourceModel
      .findOne({ googleBooksId })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .exec();
  }

  /**
   * Buscar recursos por tipo
   */
  async findByType(typeId: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ typeId: new Types.ObjectId(typeId) })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos por categoría
   */
  async findByCategory(categoryId: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ categoryId: new Types.ObjectId(categoryId) })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos por autor
   */
  async findByAuthor(authorId: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ authorIds: new Types.ObjectId(authorId) })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos por editorial
   */
  async findByPublisher(publisherId: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ publisherId: new Types.ObjectId(publisherId) })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos por ubicación
   */
  async findByLocation(locationId: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ locationId: new Types.ObjectId(locationId) })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos por estado
   */
  async findByState(stateId: string): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ stateId: new Types.ObjectId(stateId) })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos disponibles
   */
  async findAvailable(): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ available: true })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar recursos prestados
   */
  async findBorrowed(): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({ available: false })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
      .exec();
  }

  /**
   * Buscar con filtros avanzados y paginación
   */
  async findWithAdvancedFilters(
    filters: {
      search?: string;
      resourceType?: string;
      categoryId?: string;
      locationId?: string;
      stateId?: string;
      availability?: 'available' | 'borrowed';
      isbn?: string;
      authorId?: string;
      publisherId?: string;
    },
    page: number = 1,
    limit: number = 20,
    sortBy: string = 'title',
    sortOrder: 'asc' | 'desc' = 'asc',
  ): Promise<{
    data: ResourceDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    // Filtro por búsqueda de texto
    if (filters.search) {
      query.$text = { $search: filters.search };
    }

    // Filtro por tipo de recurso
    if (filters.resourceType) {
      // Necesitamos hacer una consulta adicional para obtener el ID del tipo
      const resourceTypeDoc = await this.resourceModel.db.collection('resource_types')
        .findOne({ name: filters.resourceType });
      if (resourceTypeDoc) {
        query.typeId = resourceTypeDoc._id;
      }
    }

    // Filtros por IDs
    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }

    if (filters.locationId) {
      query.locationId = new Types.ObjectId(filters.locationId);
    }

    if (filters.stateId) {
      query.stateId = new Types.ObjectId(filters.stateId);
    }

    if (filters.authorId) {
      query.authorIds = new Types.ObjectId(filters.authorId);
    }

    if (filters.publisherId) {
      query.publisherId = new Types.ObjectId(filters.publisherId);
    }

    // Filtro por disponibilidad
    if (filters.availability) {
      query.available = filters.availability === 'available';
    }

    // Filtro por ISBN
    if (filters.isbn) {
      query.isbn = { $regex: filters.isbn, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const total = await this.resourceModel
      .countDocuments(query as FilterQuery<ResourceDocument>)
      .exec();
    const totalPages = Math.ceil(total / limit);

    // Configurar ordenamiento
    const sort: any = {};
    if (filters.search && !sortBy) {
      // Si hay búsqueda de texto, ordenar por relevancia por defecto
      sort.score = { $meta: 'textScore' };
    } else {
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    }

    const data = await this.resourceModel
      .find(query as FilterQuery<ResourceDocument>)
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .exec();

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Obtener recursos más prestados
   */
  async getMostBorrowedResources(limit: number = 10): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({})
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ totalLoans: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Obtener recursos menos prestados
   */
  async getLeastBorrowedResources(limit: number = 10): Promise<ResourceDocument[]> {
    return this.resourceModel
      .find({})
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ totalLoans: 1 })
      .limit(limit)
      .exec();
  }

  /**
   * Actualizar disponibilidad del recurso
   */
  async updateAvailability(resourceId: string, available: boolean): Promise<ResourceDocument | null> {
    return this.resourceModel
      .findByIdAndUpdate(
        resourceId,
        { available },
        { new: true }
      )
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .exec();
  }

  /**
   * Incrementar contador de préstamos
   */
  async incrementLoanCount(resourceId: string): Promise<ResourceDocument | null> {
    return this.resourceModel
      .findByIdAndUpdate(
        resourceId,
        { 
          $inc: { totalLoans: 1 },
          lastLoanDate: new Date()
        },
        { new: true }
      )
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .exec();
  }

  /**
   * Buscar con populate completo
   */
  async findByIdWithFullPopulate(id: string): Promise<ResourceDocument | null> {
    return this.resourceModel
      .findById(id)
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .exec();
  }

  /**
   * Obtener estadísticas generales de recursos
   */
  async getResourceStatistics(): Promise<{
    total: number;
    available: number;
    borrowed: number;
    byType: Array<{ type: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
    byState: Array<{ state: string; count: number }>;
  }> {
    const [total, available, byType, byCategory, byState] = await Promise.all([
      this.resourceModel.countDocuments({}).exec(),
      this.resourceModel.countDocuments({ available: true }).exec(),
      this.resourceModel.aggregate([
        {
          $lookup: {
            from: 'resource_types',
            localField: 'typeId',
            foreignField: '_id',
            as: 'type'
          }
        },
        { $unwind: '$type' },
        {
          $group: {
            _id: '$type.name',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            type: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]).exec(),
      this.resourceModel.aggregate([
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: '$category' },
        {
          $group: {
            _id: '$category.name',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            category: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]).exec(),
      this.resourceModel.aggregate([
        {
          $lookup: {
            from: 'resource_states',
            localField: 'stateId',
            foreignField: '_id',
            as: 'state'
          }
        },
        { $unwind: '$state' },
        {
          $group: {
            _id: '$state.name',
            count: { $sum: 1 }
          }
        },
        {
          $project: {
            state: '$_id',
            count: 1,
            _id: 0
          }
        }
      ]).exec()
    ]);

    return {
      total,
      available,
      borrowed: total - available,
      byType,
      byCategory,
      byState,
    };
  }
}