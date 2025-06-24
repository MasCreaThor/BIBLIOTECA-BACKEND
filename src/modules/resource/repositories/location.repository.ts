// src/modules/resource/repositories/location.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';

// ✅ INTERFACE PARA FILTROS DE BÚSQUEDA
interface LocationFilters {
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
export class LocationRepository extends BaseRepositoryImpl<LocationDocument> {
  constructor(@InjectModel(Location.name) private locationModel: Model<LocationDocument>) {
    super(locationModel);
  }

  async findByName(name: string): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  async findByCode(code: string): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      active: true 
    }).exec();
  }

  async findAllActive(): Promise<LocationDocument[]> {
    return this.locationModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  // ✅ NUEVO MÉTODO: Buscar ubicaciones con filtros y paginación
  async findWithFilters(filters: LocationFilters = {}): Promise<PaginatedResult<LocationDocument>> {
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

    // Filtro de búsqueda por nombre o código
    if (search.trim()) {
      queryFilter.$or = [
        { name: { $regex: new RegExp(search.trim(), 'i') } },
        { code: { $regex: new RegExp(search.trim(), 'i') } }
      ];
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
      this.locationModel
        .find(queryFilter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.locationModel.countDocuments(queryFilter).exec()
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

  async deactivate(locationId: string): Promise<LocationDocument | null> {
    return this.locationModel
      .findByIdAndUpdate(locationId, { active: false }, { new: true })
      .exec();
  }

  async activate(locationId: string): Promise<LocationDocument | null> {
    return this.locationModel
      .findByIdAndUpdate(locationId, { active: true }, { new: true })
      .exec();
  }
}