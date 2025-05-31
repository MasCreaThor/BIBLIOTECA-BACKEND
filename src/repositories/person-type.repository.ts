import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PersonType, PersonTypeDocument } from '@models/person-type.model';
import { BaseRepositoryImpl } from './base.repository';

/**
 * Repositorio para tipos de persona
 * Ruta: src/repositories/person-type.repository.ts
 */

@Injectable()
export class PersonTypeRepository extends BaseRepositoryImpl<PersonTypeDocument> {
  constructor(@InjectModel(PersonType.name) private personTypeModel: Model<PersonTypeDocument>) {
    super(personTypeModel);
  }

  /**
   * Buscar tipo de persona por nombre
   */
  async findByName(name: 'student' | 'teacher'): Promise<PersonTypeDocument | null> {
    return this.personTypeModel.findOne({ name, active: true }).exec();
  }

  /**
   * Buscar todos los tipos activos
   */
  async findAllActive(): Promise<PersonTypeDocument[]> {
    return this.personTypeModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe un tipo por nombre
   */
  async existsByName(name: 'student' | 'teacher'): Promise<boolean> {
    const count = await this.personTypeModel.countDocuments({ name }).exec();
    return count > 0;
  }

  /**
   * Desactivar tipo de persona
   */
  async deactivate(personTypeId: string): Promise<PersonTypeDocument | null> {
    return this.personTypeModel
      .findByIdAndUpdate(personTypeId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar tipo de persona
   */
  async activate(personTypeId: string): Promise<PersonTypeDocument | null> {
    return this.personTypeModel
      .findByIdAndUpdate(personTypeId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Obtener tipo de persona para estudiantes
   */
  async getStudentType(): Promise<PersonTypeDocument | null> {
    return this.findByName('student');
  }

  /**
   * Obtener tipo de persona para docentes
   */
  async getTeacherType(): Promise<PersonTypeDocument | null> {
    return this.findByName('teacher');
  }
}
