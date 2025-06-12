// src/modules/resource/repositories/resource.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Resource, ResourceDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';


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
        title: { $regex: title, $options: 'i' },
        available: true 
      })
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
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
   * Buscar con filtros básicos y paginación
   */
  async findWithFilters(
    filters: {
      search?: string;
      categoryId?: string;
      locationId?: string;
      availability?: 'available' | 'borrowed';
      authorId?: string;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: ResourceDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    // Filtro por búsqueda de texto
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { isbn: { $regex: filters.search, $options: 'i' } },
      ];
    }

    // Filtros por IDs
    if (filters.categoryId) {
      query.categoryId = new Types.ObjectId(filters.categoryId);
    }

    if (filters.locationId) {
      query.locationId = new Types.ObjectId(filters.locationId);
    }

    if (filters.authorId) {
      query.authorIds = new Types.ObjectId(filters.authorId);
    }

    // Filtro por disponibilidad
    if (filters.availability) {
      query.available = filters.availability === 'available';
    }

    const skip = (page - 1) * limit;
    const total = await this.resourceModel
      .countDocuments(query as FilterQuery<ResourceDocument>)
      .exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.resourceModel
      .find(query as FilterQuery<ResourceDocument>)
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .sort({ title: 1 })
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
   * Buscar con populate completo
   */
  async findByIdWithPopulate(id: string): Promise<ResourceDocument | null> {
    return this.resourceModel
      .findById(id)
      .populate(['typeId', 'categoryId', 'authorIds', 'publisherId', 'stateId', 'locationId'])
      .exec();
  }

  /**
   * Contar recursos por categoría
   */
  async countByCategory(categoryId: string): Promise<number> {
    return this.resourceModel.countDocuments({ categoryId: new Types.ObjectId(categoryId) }).exec();
  }

  /**
   * Contar recursos por ubicación
   */
  async countByLocation(locationId: string): Promise<number> {
    return this.resourceModel.countDocuments({ locationId: new Types.ObjectId(locationId) }).exec();
  }

  /**
   * Contar recursos por autor
   */
  async countByAuthor(authorId: string): Promise<number> {
    return this.resourceModel.countDocuments({ authorIds: new Types.ObjectId(authorId) }).exec();
  }
}