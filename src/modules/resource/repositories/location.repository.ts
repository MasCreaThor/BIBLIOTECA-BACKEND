// src/modules/resource/repositories/location.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para ubicaciones/estantes de recursos
 */

@Injectable()
export class LocationRepository extends BaseRepositoryImpl<LocationDocument> {
  constructor(@InjectModel(Location.name) private locationModel: Model<LocationDocument>) {
    super(locationModel);
  }

  /**
   * Buscar ubicación por nombre
   */
  async findByName(name: string): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  /**
   * Buscar ubicación por código
   */
  async findByCode(code: string): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      active: true 
    }).exec();
  }

  /**
   * Buscar todas las ubicaciones activas
   */
  async findAllActive(): Promise<LocationDocument[]> {
    return this.locationModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe una ubicación por nombre
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.locationModel.countDocuments({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).exec();
    return count > 0;
  }

  /**
   * Verificar si existe una ubicación por código
   */
  async existsByCode(code: string): Promise<boolean> {
    const count = await this.locationModel.countDocuments({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') }
    }).exec();
    return count > 0;
  }

  /**
   * Desactivar ubicación
   */
  async deactivate(locationId: string): Promise<LocationDocument | null> {
    return this.locationModel
      .findByIdAndUpdate(locationId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar ubicación
   */
  async activate(locationId: string): Promise<LocationDocument | null> {
    return this.locationModel
      .findByIdAndUpdate(locationId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Buscar ubicaciones con filtros y paginación
   */
  async findWithFilters(
    filters: {
      search?: string;
      active?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: LocationDocument[];
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
        { code: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.locationModel.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.locationModel
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
   * Contar recursos por ubicación
   */
  async countResourcesByLocation(locationId: string): Promise<number> {
    const result = await this.locationModel.aggregate([
      { $match: { _id: locationId } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'locationId',
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
   * Obtener ubicaciones más utilizadas
   */
  async getMostUsedLocations(limit: number = 10): Promise<Array<{
    _id: string;
    name: string;
    description: string;
    code?: string;
    resourceCount: number;
  }>> {
    return this.locationModel.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'locationId',
          as: 'resources'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          code: 1,
          resourceCount: { $size: '$resources' }
        }
      },
      { $sort: { resourceCount: -1 } },
      { $limit: limit }
    ]).exec();
  }

  /**
   * Obtener estadísticas de ubicaciones
   */
  async getLocationStatistics(): Promise<{
    total: number;
    active: number;
    withResources: number;
    averageResourcesPerLocation: number;
  }> {
    const [total, active, locationStats] = await Promise.all([
      this.locationModel.countDocuments({}).exec(),
      this.locationModel.countDocuments({ active: true }).exec(),
      this.locationModel.aggregate([
        {
          $lookup: {
            from: 'resources',
            localField: '_id',
            foreignField: 'locationId',
            as: 'resources'
          }
        },
        {
          $project: {
            resourceCount: { $size: '$resources' }
          }
        },
        {
          $group: {
            _id: null,
            locationsWithResources: {
              $sum: { $cond: [{ $gt: ['$resourceCount', 0] }, 1, 0] }
            },
            totalResources: { $sum: '$resourceCount' },
            totalLocations: { $sum: 1 }
          }
        }
      ]).exec()
    ]);

    const stats = locationStats[0] || { locationsWithResources: 0, totalResources: 0, totalLocations: 0 };

    return {
      total,
      active,
      withResources: stats.locationsWithResources,
      averageResourcesPerLocation: stats.totalLocations > 0 ? stats.totalResources / stats.totalLocations : 0,
    };
  }
}