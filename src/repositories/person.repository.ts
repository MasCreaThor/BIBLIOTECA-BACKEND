import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { Person, PersonDocument } from '@models/person.model';
import { BaseRepositoryImpl } from './base.repository';

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
    return this.personModel.findOne({ documentNumber, active: true }).populate('personType').exec();
  }

  /**
   * Buscar personas por tipo
   */
  async findByPersonType(personTypeId: string): Promise<PersonDocument[]> {
    return this.personModel
      .find({ personTypeId: new Types.ObjectId(personTypeId), active: true })
      .populate('personType')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Buscar personas por grado
   */
  async findByGrade(grade: string): Promise<PersonDocument[]> {
    return this.personModel
      .find({ grade, active: true })
      .populate('personType')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Buscar personas activas
   */
  async findActive(): Promise<PersonDocument[]> {
    return this.personModel
      .find({ active: true })
      .populate('personType')
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
      .populate('personType')
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
      .populate('personType')
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
      .populate('personType')
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
   * Obtener estadísticas de personas
   */
  async getStatistics(): Promise<{
    total: number;
    students: number;
    teachers: number;
    byGrade: Array<{ grade: string; count: number }>;
  }> {
    const [total, students, teachers, byGrade] = await Promise.all([
      this.personModel.countDocuments({ active: true }).exec(),
      this.personModel
        .countDocuments({
          active: true,
          personTypeId: { $exists: true },
        })
        .populate({
          path: 'personTypeId',
          match: { name: 'student' },
        })
        .exec(),
      this.personModel
        .countDocuments({
          active: true,
          personTypeId: { $exists: true },
        })
        .populate({
          path: 'personTypeId',
          match: { name: 'teacher' },
        })
        .exec(),
      this.personModel
        .aggregate([
          { $match: { active: true, grade: { $exists: true, $ne: null } } },
          { $group: { _id: '$grade', count: { $sum: 1 } } },
          { $project: { grade: '$_id', count: 1, _id: 0 } },
          { $sort: { grade: 1 } },
        ])
        .exec(),
    ]);

    return {
      total,
      students,
      teachers,
      byGrade,
    };
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
}
