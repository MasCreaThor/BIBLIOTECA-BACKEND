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
  async findByName(name: 'book' | 'game' | 'map' | 'bible'): Promise<ResourceTypeDocument | null> {
    return this.resourceTypeModel.findOne({ name, active: true }).exec();
  }

  /**
   * Buscar todos los tipos activos
   */
  async findAllActive(): Promise<ResourceTypeDocument[]> {
    return this.resourceTypeModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe un tipo por nombre
   */
  async existsByName(name: 'book' | 'game' | 'map' | 'bible'): Promise<boolean> {
    const count = await this.resourceTypeModel.countDocuments({ name }).exec();
    return count > 0;
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