// src/modules/resource/repositories/category.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para categorías de recursos
 */

@Injectable()
export class CategoryRepository extends BaseRepositoryImpl<CategoryDocument> {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {
    super(categoryModel);
  }

  /**
   * Buscar categoría por nombre
   */
  async findByName(name: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  /**
   * Buscar todas las categorías activas
   */
  async findAllActive(): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe una categoría por nombre
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.categoryModel.countDocuments({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).exec();
    return count > 0;
  }

  /**
   * Desactivar categoría
   */
  async deactivate(categoryId: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar categoría
   */
  async activate(categoryId: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Buscar categorías con filtros y paginación
   */
  async findWithFilters(
    filters: {
      search?: string;
      active?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: CategoryDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { description: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.categoryModel.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.categoryModel
      .find(query)
      .sort({ name: 1 })
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
   * Contar recursos por categoría
   */
  async countResourcesByCategory(categoryId: string): Promise<number> {
    // Esta consulta se podría optimizar con una referencia directa al ResourceModel
    // Por ahora usamos agregación
    const result = await this.categoryModel.aggregate([
      { $match: { _id: categoryId } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'resources'
        }
      },
      {
        $project: {
          resourceCount: { $size: '$resources' }
        }
      }
    ]).exec();

    return result.length > 0 ? result[0].resourceCount : 0;
  }

  /**
   * Obtener categorías más utilizadas
   */
  async getMostUsedCategories(limit: number = 10): Promise<Array<{
    _id: string;
    name: string;
    description: string;
    color: string;
    resourceCount: number;
  }>> {
    return this.categoryModel.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'categoryId',
          as: 'resources'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          color: 1,
          resourceCount: { $size: '$resources' }
        }
      },
      { $sort: { resourceCount: -1 } },
      { $limit: limit }
    ]).exec();
  }
}