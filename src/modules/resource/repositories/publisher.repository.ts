// src/modules/resource/repositories/publisher.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publisher, PublisherDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para editoriales
 */

@Injectable()
export class PublisherRepository extends BaseRepositoryImpl<PublisherDocument> {
  constructor(@InjectModel(Publisher.name) private publisherModel: Model<PublisherDocument>) {
    super(publisherModel);
  }

  /**
   * Buscar editorial por nombre
   */
  async findByName(name: string): Promise<PublisherDocument | null> {
    return this.publisherModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  /**
   * Buscar editorial por Google Books ID
   */
  async findByGoogleBooksId(googleBooksPublisherId: string): Promise<PublisherDocument | null> {
    return this.publisherModel.findOne({ 
      googleBooksPublisherId,
      active: true 
    }).exec();
  }

  /**
   * Buscar todas las editoriales activas
   */
  async findAllActive(): Promise<PublisherDocument[]> {
    return this.publisherModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe una editorial por nombre
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.publisherModel.countDocuments({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).exec();
    return count > 0;
  }

  /**
   * Desactivar editorial
   */
  async deactivate(publisherId: string): Promise<PublisherDocument | null> {
    return this.publisherModel
      .findByIdAndUpdate(publisherId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar editorial
   */
  async activate(publisherId: string): Promise<PublisherDocument | null> {
    return this.publisherModel
      .findByIdAndUpdate(publisherId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Buscar editoriales con filtros y paginación
   */
  async findWithFilters(
    filters: {
      search?: string;
      active?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PublisherDocument[];
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
    const total = await this.publisherModel.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.publisherModel
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
   * Contar recursos por editorial
   */
  async countResourcesByPublisher(publisherId: string): Promise<number> {
    const result = await this.publisherModel.aggregate([
      { $match: { _id: publisherId } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'publisherId',
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
   * Obtener editoriales con más recursos
   */
  async getMostActivePublishers(limit: number = 10): Promise<Array<{
    _id: string;
    name: string;
    description?: string;
    resourceCount: number;
  }>> {
    return this.publisherModel.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'publisherId',
          as: 'resources'
        }
      },
      {
        $project: {
          name: 1,
          description: 1,
          resourceCount: { $size: '$resources' }
        }
      },
      { $sort: { resourceCount: -1 } },
      { $limit: limit }
    ]).exec();
  }

  /**
   * Buscar editoriales por término de búsqueda (búsqueda de texto)
   */
  async searchPublishersByText(searchTerm: string, limit: number = 20): Promise<PublisherDocument[]> {
    return this.publisherModel
      .find({
        $text: { $search: searchTerm },
        active: true
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();
  }

  /**
   * Crear o encontrar editorial por nombre
   */
  async findOrCreateByName(publisherName: string): Promise<PublisherDocument> {
    const cleanName = publisherName.trim();
    
    let publisher = await this.findByName(cleanName);
    
    if (!publisher) {
      publisher = await this.create({
        name: cleanName,
        active: true,
      });
    }

    return publisher;
  }

  /**
   * Obtener estadísticas de editoriales
   */
  async getPublisherStatistics(): Promise<{
    total: number;
    active: number;
    withResources: number;
    fromGoogleBooks: number;
  }> {
    const [total, active, withGoogleBooks, publisherStats] = await Promise.all([
      this.publisherModel.countDocuments({}).exec(),
      this.publisherModel.countDocuments({ active: true }).exec(),
      this.publisherModel.countDocuments({ 
        googleBooksPublisherId: { $exists: true, $ne: null }
      }).exec(),
      this.publisherModel.aggregate([
        {
          $lookup: {
            from: 'resources',
            localField: '_id',
            foreignField: 'publisherId',
            as: 'resources'
          }
        },
        {
          $project: {
            hasResources: { $gt: [{ $size: '$resources' }, 0] }
          }
        },
        {
          $group: {
            _id: null,
            publishersWithResources: {
              $sum: { $cond: ['$hasResources', 1, 0] }
            }
          }
        }
      ]).exec()
    ]);

    const stats = publisherStats[0] || { publishersWithResources: 0 };

    return {
      total,
      active,
      withResources: stats.publishersWithResources,
      fromGoogleBooks: withGoogleBooks,
    };
  }
}