// src/modules/resource/repositories/category.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';

// ✅ INTERFACE PARA FILTROS DE BÚSQUEDA
interface CategoryFilters {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ✅ INTERFACE PARA RESPUESTA PAGINADA
interface PaginatedResult<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class CategoryRepository extends BaseRepositoryImpl<CategoryDocument> {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {
    super(categoryModel);
  }

  async findByName(name: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  async findAllActive(): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  // ✅ NUEVO MÉTODO: Buscar categorías con filtros y paginación
  async findWithFilters(filters: CategoryFilters = {}): Promise<PaginatedResult<CategoryDocument>> {
    const {
      search = '',
      active,
      page = 1,
      limit = 20,
      sortBy = 'name',
      sortOrder = 'asc'
    } = filters;

    // Construir filtros de consulta
    const queryFilter: any = {};

    // Filtro de búsqueda por nombre
    if (search.trim()) {
      queryFilter.name = { $regex: new RegExp(search.trim(), 'i') };
    }

    // Filtro de estado activo/inactivo
    if (active !== undefined) {
      queryFilter.active = active;
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Construir ordenamiento
    const sort: any = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Ejecutar consulta con paginación
    const [data, total] = await Promise.all([
      this.categoryModel
        .find(queryFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.categoryModel.countDocuments(queryFilter).exec()
    ]);

    // Calcular información de paginación
    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    };
  }

  async deactivate(categoryId: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { active: false }, { new: true })
      .exec();
  }

  async activate(categoryId: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { active: true }, { new: true })
      .exec();
  }
}



