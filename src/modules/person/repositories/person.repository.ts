// src/modules/person/repositories/person.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Person, PersonDocument } from '@modules/person/models';
import { BaseRepositoryImpl } from '@shared/repositories';

/**
 * Repositorio para personas (estudiantes y docentes)
 */

@Injectable()
export class PersonRepository extends BaseRepositoryImpl<PersonDocument> {
  constructor(@InjectModel(Person.name) private personModel: Model<PersonDocument>) {
    super(personModel);
  }

  /**
   * Buscar persona por número de documento
   */
  async findByDocumentNumber(documentNumber: string): Promise<PersonDocument | null> {
    return this.personModel.findOne({ documentNumber, active: true }).populate('personTypeId').exec();
  }

  /**
   * Buscar personas por tipo
   */
  async findByPersonType(personTypeId: string): Promise<PersonDocument[]> {
    return this.personModel
      .find({ personTypeId: new Types.ObjectId(personTypeId), active: true })
      .populate('personTypeId')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Buscar personas por grado
   */
  async findByGrade(grade: string): Promise<PersonDocument[]> {
    return this.personModel
      .find({ grade, active: true })
      .populate('personTypeId')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Buscar personas activas
   */
  async findActive(): Promise<PersonDocument[]> {
    return this.personModel
      .find({ active: true })
      .populate('personTypeId')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Buscar con paginación y populate
   */
  async findWithPaginationAndPopulate(
    filter: Record<string, any> = {},
    page: number = 1,
    limit: number = 20,
    sort: Record<string, 1 | -1> = { firstName: 1, lastName: 1 },
  ): Promise<{
    data: PersonDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const skip = (page - 1) * limit;
    const total = await this.count(filter);
    const totalPages = Math.ceil(total / limit);

    const data = await this.personModel
      .find(filter as FilterQuery<PersonDocument>)
      .populate('personTypeId')
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
   * Buscar con filtros avanzados
   */
  async findWithFilters(
    filters: {
      search?: string;
      personType?: string;
      grade?: string;
      documentNumber?: string;
      active?: boolean;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: PersonDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: Record<string, any> = {};

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.personType) {
      query.personTypeId = new Types.ObjectId(filters.personType);
    }

    if (filters.grade) {
      query.grade = { $regex: filters.grade, $options: 'i' };
    }

    if (filters.documentNumber) {
      query.documentNumber = { $regex: filters.documentNumber, $options: 'i' };
    }

    if (filters.search) {
      query.$or = [
        { firstName: { $regex: filters.search, $options: 'i' } },
        { lastName: { $regex: filters.search, $options: 'i' } },
        { documentNumber: { $regex: filters.search, $options: 'i' } },
        { grade: { $regex: filters.search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const total = await this.personModel
      .countDocuments(query as FilterQuery<PersonDocument>)
      .exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.personModel
      .find(query as FilterQuery<PersonDocument>)
      .populate('personTypeId')
      .sort({ firstName: 1, lastName: 1 })
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
   * Buscar por nombre completo
   */
  async findByFullName(firstName: string, lastName: string): Promise<PersonDocument[]> {
    return this.personModel
      .find({
        firstName: { $regex: firstName, $options: 'i' },
        lastName: { $regex: lastName, $options: 'i' },
        active: true,
      })
      .populate('personTypeId')
      .exec();
  }

  /**
   * Contar por tipo de persona
   */
  async countByPersonType(personTypeId: string): Promise<number> {
    return this.personModel
      .countDocuments({ personTypeId: new Types.ObjectId(personTypeId), active: true })
      .exec();
  }

  /**
   * Contar por grado
   */
  async countByGrade(grade: string): Promise<number> {
    return this.personModel.countDocuments({ grade, active: true }).exec();
  }

  /**
   * Obtener estadísticas de personas - VERSIÓN CORREGIDA
   */
  async getStatistics(): Promise<{
    total: number;
    students: number;
    teachers: number;
    byGrade: Array<{ grade: string; count: number }>;
  }> {
    try {
      // Usar aggregation pipeline para obtener estadísticas correctas
      const [statisticsResult] = await this.personModel.aggregate([
        {
          $match: { active: true }
        },
        {
          $lookup: {
            from: 'person_types', // Nombre de la colección de tipos de persona
            localField: 'personTypeId',
            foreignField: '_id',
            as: 'personType'
          }
        },
        {
          $unwind: '$personType'
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            students: {
              $sum: {
                $cond: [{ $eq: ['$personType.name', 'student'] }, 1, 0]
              }
            },
            teachers: {
              $sum: {
                $cond: [{ $eq: ['$personType.name', 'teacher'] }, 1, 0]
              }
            }
          }
        }
      ]).exec();

      // Obtener estadísticas por grado
      const byGradeResult = await this.personModel.aggregate([
        {
          $match: { 
            active: true, 
            grade: { 
              $exists: true, 
              $nin: [null, '']
            }
          }
        },
        {
          $group: { 
            _id: '$grade', 
            count: { $sum: 1 } 
          }
        },
        {
          $project: { 
            grade: '$_id', 
            count: 1, 
            _id: 0 
          }
        },
        {
          $sort: { grade: 1 }
        }
      ]).exec();

      // Si no hay resultados, devolver valores por defecto
      const stats = statisticsResult || { total: 0, students: 0, teachers: 0 };

      return {
        total: stats.total || 0,
        students: stats.students || 0,
        teachers: stats.teachers || 0,
        byGrade: byGradeResult || [],
      };

    } catch (error) {
      console.error('Error al obtener estadísticas de personas:', error);
      
      // Fallback: método alternativo más simple
      const [total, byGrade] = await Promise.all([
        this.personModel.countDocuments({ active: true }).exec(),
        this.personModel.aggregate([
          { $match: { active: true, grade: { $exists: true, $nin: [null, ''] } } },
          { $group: { _id: '$grade', count: { $sum: 1 } } },
          { $project: { grade: '$_id', count: 1, _id: 0 } },
          { $sort: { grade: 1 } },
        ]).exec(),
      ]);

      // Para el fallback, obtener conteos por tipo de manera más simple
      const peopleWithTypes = await this.personModel
        .find({ active: true })
        .populate('personTypeId')
        .select('personTypeId')
        .exec();

      let students = 0;
      let teachers = 0;

      peopleWithTypes.forEach(person => {
        if (person.personTypeId && typeof person.personTypeId === 'object') {
          const personType = person.personTypeId as any;
          if (personType.name === 'student') {
            students++;
          } else if (personType.name === 'teacher') {
            teachers++;
          }
        }
      });

      return {
        total,
        students,
        teachers,
        byGrade: byGrade || [],
      };
    }
  }

  /**
   * Desactivar persona (soft delete)
   */
  async deactivate(personId: string): Promise<PersonDocument | null> {
    return this.personModel.findByIdAndUpdate(personId, { active: false }, { new: true }).exec();
  }

  /**
   * Activar persona
   */
  async activate(personId: string): Promise<PersonDocument | null> {
    return this.personModel.findByIdAndUpdate(personId, { active: true }, { new: true }).exec();
  }

  /**
   * Buscar persona por ID con populate
   */
  async findByIdWithPopulate(id: string): Promise<PersonDocument | null> {
    return this.personModel.findById(id).populate('personTypeId').exec();
  }
}