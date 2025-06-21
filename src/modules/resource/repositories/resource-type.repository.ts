// src/modules/resource/repositories/resource-type.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourceType, ResourceTypeDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para tipos de recursos
 */

@Injectable()
export class ResourceTypeRepository extends BaseRepositoryImpl<ResourceTypeDocument> {
  constructor(@InjectModel(ResourceType.name) private resourceTypeModel: Model<ResourceTypeDocument>) {
    super(resourceTypeModel);
  }

  /**
   * Buscar tipo de recurso por nombre
   */
  async findByName(name: string): Promise<ResourceTypeDocument | null> {
    return this.resourceTypeModel.findOne({ name: name.toLowerCase(), active: true }).exec();
  }

  /**
   * Buscar tipo de recurso por nombre (incluyendo inactivos)
   */
  async findByNameIncludeInactive(name: string): Promise<ResourceTypeDocument | null> {
    return this.resourceTypeModel.findOne({ name: name.toLowerCase() }).exec();
  }

  /**
   * Obtener todos los tipos de recursos activos
   */
  async findAllActive(): Promise<ResourceTypeDocument[]> {
    return this.resourceTypeModel.find({ active: true }).sort({ isSystem: -1, name: 1 }).exec();
  }

  /**
   * Obtener tipos del sistema (predefinidos)
   */
  async findSystemTypes(): Promise<ResourceTypeDocument[]> {
    return this.resourceTypeModel.find({ isSystem: true, active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Obtener tipos personalizados (no del sistema)
   */
  async findCustomTypes(): Promise<ResourceTypeDocument[]> {
    return this.resourceTypeModel.find({ isSystem: false, active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe un tipo por nombre
   */
  async existsByName(name: string): Promise<boolean> {
    const count = await this.resourceTypeModel.countDocuments({ name: name.toLowerCase() }).exec();
    return count > 0;
  }

  /**
   * Verificar si un tipo es del sistema
   */
  async isSystemType(name: string): Promise<boolean> {
    const resourceType = await this.resourceTypeModel.findOne({ name: name.toLowerCase() }).exec();
    return resourceType?.isSystem || false;
  }

  /**
   * Desactivar tipo de recurso
   */
  async deactivate(resourceTypeId: string): Promise<ResourceTypeDocument | null> {
    return this.resourceTypeModel
      .findByIdAndUpdate(resourceTypeId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar tipo de recurso
   */
  async activate(resourceTypeId: string): Promise<ResourceTypeDocument | null> {
    return this.resourceTypeModel
      .findByIdAndUpdate(resourceTypeId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Obtener tipo de recurso para libros
   */
  async getBookType(): Promise<ResourceTypeDocument | null> {
    return this.findByName('book');
  }

  /**
   * Obtener tipo de recurso para juegos
   */
  async getGameType(): Promise<ResourceTypeDocument | null> {
    return this.findByName('game');
  }

  /**
   * Obtener tipo de recurso para mapas
   */
  async getMapType(): Promise<ResourceTypeDocument | null> {
    return this.findByName('map');
  }

  /**
   * Obtener tipo de recurso para biblias
   */
  async getBibleType(): Promise<ResourceTypeDocument | null> {
    return this.findByName('bible');
  }
}