import { Model, FilterQuery, UpdateQuery, QueryOptions as MongooseQueryOptions } from 'mongoose';
import { BaseRepository, BaseDocument, QueryOptions } from '@common/interfaces/base.interfaces';

/**
 * Implementación base para repositorios con operaciones CRUD comunes
 * Compatible con tipos nativos de Mongoose - Versión corregida
 */
export abstract class BaseRepositoryImpl<T extends BaseDocument> implements BaseRepository<T> {
  constructor(protected readonly model: Model<T>) {}

  /**
   * Crear un nuevo documento
   */
  async create(createDto: Partial<T>): Promise<T> {
    const createdDocument = new this.model(createDto);
    return createdDocument.save();
  }

  /**
   * Encontrar todos los documentos con filtros opcionales
   */
  async findAll(filter: Record<string, any> = {}, options: QueryOptions = {}): Promise<T[]> {
    const { limit, skip, sort, populate } = options;

    let query = this.model.find(filter as FilterQuery<T>);

    if (limit) query = query.limit(limit);
    if (skip) query = query.skip(skip);
    if (sort) query = query.sort(sort);

    if (populate) {
      if (Array.isArray(populate)) {
        for (const path of populate) {
          query = query.populate(path);
        }
      } else {
        query = query.populate(populate);
      }
    }

    return query.exec();
  }

  /**
   * Encontrar un documento por ID
   */
  async findById(id: string): Promise<T | null> {
    return this.model.findById(id).exec();
  }

  /**
   * Encontrar un documento por filtro
   */
  async findOne(filter: Record<string, any>): Promise<T | null> {
    return this.model.findOne(filter as FilterQuery<T>).exec();
  }

  /**
   * Actualizar un documento por ID
   */
  async update(id: string, updateDto: Partial<T>): Promise<T | null> {
    return this.model
      .findByIdAndUpdate(id, updateDto as UpdateQuery<T>, { new: true, runValidators: true })
      .exec();
  }

  /**
   * Eliminar un documento por ID
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.model.findByIdAndDelete(id).exec();
    return !!result;
  }

  /**
   * Contar documentos que coincidan con el filtro
   */
  async count(filter: Record<string, any> = {}): Promise<number> {
    return this.model.countDocuments(filter as FilterQuery<T>).exec();
  }

  /**
   * Verificar si existe un documento
   */
  async exists(filter: Record<string, any>): Promise<boolean> {
    const count = await this.count(filter);
    return count > 0;
  }

  /**
   * Encontrar documentos con paginación
   */
  async findWithPagination(
    filter: Record<string, any> = {},
    page: number = 1,
    limit: number = 10,
    sort: Record<string, 1 | -1> = { createdAt: -1 },
  ): Promise<{ data: T[]; total: number; page: number; totalPages: number }> {
    const skip = (page - 1) * limit;
    const total = await this.count(filter);
    const totalPages = Math.ceil(total / limit);

    const data = await this.findAll(filter, { limit, skip, sort });

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Búsqueda con texto (para implementar en repositorios específicos)
   */
  protected async searchByText(
    searchTerm: string,
    searchFields: string[],
    additionalFilter: Record<string, any> = {},
    options: QueryOptions = {},
  ): Promise<T[]> {
    const searchQuery = {
      $or: searchFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
      ...additionalFilter,
    } as FilterQuery<T>;

    return this.findAll(searchQuery as Record<string, any>, options);
  }

  /**
   * Operaciones en lote - CORREGIDO
   */
  async bulkCreate(createDtos: Partial<T>[]): Promise<T[]> {
    try {
      const result = await this.model.insertMany(createDtos);
      // Conversión segura que maneja los tipos complejos de Mongoose
      return result.map(doc => {
        if (doc && typeof doc.toObject === 'function') {
          return doc.toObject() as T;
        }
        return doc as unknown as T;
      });
    } catch (error) {
      // Fallback: crear documentos uno por uno si insertMany falla
      const createdDocuments: T[] = [];
      for (const dto of createDtos) {
        const created = await this.create(dto);
        createdDocuments.push(created);
      }
      return createdDocuments;
    }
  }

  /**
   * Actualización en lote simplificada
   */
  async bulkUpdate(
    updates: Array<{ filter: Record<string, any>; update: Partial<T> }>,
  ): Promise<void> {
    for (const { filter, update } of updates) {
      await this.model.updateMany(filter as FilterQuery<T>, update as UpdateQuery<T>).exec();
    }
  }

  /**
   * Eliminación en lote
   */
  async bulkDelete(filter: Record<string, any>): Promise<number> {
    const result = await this.model.deleteMany(filter as FilterQuery<T>).exec();
    return result.deletedCount || 0;
  }

  /**
   * Métodos adicionales para operaciones avanzadas
   */

  /**
   * Buscar con agregación simple
   */
  async findWithAggregation(pipeline: any[]): Promise<any[]> {
    return this.model.aggregate(pipeline).exec();
  }

  /**
   * Obtener documentos únicos por campo
   */
  async findDistinct(field: string, filter: Record<string, any> = {}): Promise<unknown[]> {
    return this.model.distinct(field, filter as FilterQuery<T>).exec();
  }

  /**
   * Actualizar múltiples documentos
   */
  async updateMany(filter: Record<string, any>, update: Partial<T>): Promise<number> {
    const result = await this.model
      .updateMany(filter as FilterQuery<T>, update as UpdateQuery<T>)
      .exec();
    return result.modifiedCount || 0;
  }

  /**
   * Encontrar y actualizar con opciones avanzadas
   */
  async findOneAndUpdate(
    filter: Record<string, any>,
    update: Partial<T>,
    options: MongooseQueryOptions = {},
  ): Promise<T | null> {
    return this.model
      .findOneAndUpdate(filter as FilterQuery<T>, update as UpdateQuery<T>, {
        new: true,
        runValidators: true,
        ...options,
      })
      .exec();
  }

  /**
   * Crear múltiples documentos de forma segura (alternativa a bulkCreate)
   */
  async createMany(createDtos: Partial<T>[]): Promise<T[]> {
    const createdDocuments: T[] = [];

    for (const dto of createDtos) {
      const created = await this.create(dto);
      createdDocuments.push(created);
    }

    return createdDocuments;
  }

  /**
   * Obtener el último documento creado
   */
  async findLatest(filter: Record<string, any> = {}): Promise<T | null> {
    return this.model
      .findOne(filter as FilterQuery<T>)
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Verificar y obtener documento por ID con validación
   */
  async findByIdAndValidate(id: string): Promise<T> {
    const document = await this.findById(id);
    if (!document) {
      throw new Error(`Document with id ${id} not found`);
    }
    return document;
  }
}