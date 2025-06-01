// src/modules/resource/repositories/author.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Author, AuthorDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para autores de recursos
 */

@Injectable()
export class AuthorRepository extends BaseRepositoryImpl<AuthorDocument> {
  constructor(@InjectModel(Author.name) private authorModel: Model<AuthorDocument>) {
    super(authorModel);
  }

  /**
   * Buscar autor por nombre
   */
  async findByName(name: string): Promise<AuthorDocument | null> {
    return this.authorModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  /**
   * Buscar autor por Google Books ID
   */
  async findByGoogleBooksId(googleBooksAuthorId: string): Promise<AuthorDocument | null> {
    return this.authorModel.findOne({ 
      googleBooksAuthorId,
      active: true 
    }).exec();
  }

  /**
   * Buscar todos los autores activos
   */
  async findAllActive(): Promise<AuthorDocument[]> {
    return this.authorModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe un autor por nombre
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.authorModel.countDocuments({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    }).exec();
    return count > 0;
  }

  /**
   * Desactivar autor
   */
  async deactivate(authorId: string): Promise<AuthorDocument | null> {
    return this.authorModel
      .findByIdAndUpdate(authorId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar autor
   */
  async activate(authorId: string): Promise<AuthorDocument | null> {
    return this.authorModel
      .findByIdAndUpdate(authorId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Buscar autores con filtros y paginación
   */
  async findWithFilters(
    filters: {
      search?: string;
      active?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: AuthorDocument[];
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
        { biography: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.authorModel.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.authorModel
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
   * Contar recursos por autor
   */
  async countResourcesByAuthor(authorId: string): Promise<number> {
    const result = await this.authorModel.aggregate([
      { $match: { _id: authorId } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'authorIds',
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
   * Obtener autores más prolíficos (con más recursos)
   */
  async getMostProlificAuthors(limit: number = 10): Promise<Array<{
    _id: string;
    name: string;
    biography?: string;
    resourceCount: number;
  }>> {
    return this.authorModel.aggregate([
      { $match: { active: true } },
      {
        $lookup: {
          from: 'resources',
          localField: '_id',
          foreignField: 'authorIds',
          as: 'resources'
        }
      },
      {
        $project: {
          name: 1,
          biography: 1,
          resourceCount: { $size: '$resources' }
        }
      },
      { $sort: { resourceCount: -1 } },
      { $limit: limit }
    ]).exec();
  }

  /**
   * Buscar autores por término de búsqueda (búsqueda de texto)
   */
  async searchAuthorsByText(searchTerm: string, limit: number = 20): Promise<AuthorDocument[]> {
    return this.authorModel
      .find({
        $text: { $search: searchTerm },
        active: true
      })
      .sort({ score: { $meta: 'textScore' } })
      .limit(limit)
      .exec();
  }

  /**
   * Crear o encontrar autores por nombres
   */
  async findOrCreateByNames(authorNames: string[]): Promise<AuthorDocument[]> {
    const authors: AuthorDocument[] = [];

    for (const name of authorNames) {
      const cleanName = name.trim();
      
      if (!cleanName) continue;

      let author = await this.findByName(cleanName);
      
      if (!author) {
        author = await this.create({
          name: cleanName,
          active: true,
        });
      }

      authors.push(author);
    }

    return authors;
  }

  /**
   * Obtener estadísticas de autores
   */
  async getAuthorStatistics(): Promise<{
    total: number;
    active: number;
    withResources: number;
    fromGoogleBooks: number;
  }> {
    const [total, active, withGoogleBooks, authorStats] = await Promise.all([
      this.authorModel.countDocuments({}).exec(),
      this.authorModel.countDocuments({ active: true }).exec(),
      this.authorModel.countDocuments({ 
        googleBooksAuthorId: { $exists: true, $ne: null }
      }).exec(),
      this.authorModel.aggregate([
        {
          $lookup: {
            from: 'resources',
            localField: '_id',
            foreignField: 'authorIds',
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
            authorsWithResources: {
              $sum: { $cond: ['$hasResources', 1, 0] }
            }
          }
        }
      ]).exec()
    ]);

    const stats = authorStats[0] || { authorsWithResources: 0 };

    return {
      total,
      active,
      withResources: stats.authorsWithResources,
      fromGoogleBooks: withGoogleBooks,
    };
  }
}