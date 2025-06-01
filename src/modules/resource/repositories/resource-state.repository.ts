// src/modules/resource/repositories/resource-state.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ResourceState, ResourceStateDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '../../../shared/repositories';

/**
 * Repositorio para estados de recursos
 */

@Injectable()
export class ResourceStateRepository extends BaseRepositoryImpl<ResourceStateDocument> {
  constructor(@InjectModel(ResourceState.name) private resourceStateModel: Model<ResourceStateDocument>) {
    super(resourceStateModel);
  }

  /**
   * Buscar estado de recurso por nombre
   */
  async findByName(name: 'good' | 'deteriorated' | 'damaged' | 'lost'): Promise<ResourceStateDocument | null> {
    return this.resourceStateModel.findOne({ name, active: true }).exec();
  }

  /**
   * Buscar todos los estados activos
   */
  async findAllActive(): Promise<ResourceStateDocument[]> {
    return this.resourceStateModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Verificar si existe un estado por nombre
   */
  async existsByName(name: 'good' | 'deteriorated' | 'damaged' | 'lost'): Promise<boolean> {
    const count = await this.resourceStateModel.countDocuments({ name }).exec();
    return count > 0;
  }

  /**
   * Desactivar estado de recurso
   */
  async deactivate(resourceStateId: string): Promise<ResourceStateDocument | null> {
    return this.resourceStateModel
      .findByIdAndUpdate(resourceStateId, { active: false }, { new: true })
      .exec();
  }

  /**
   * Activar estado de recurso
   */
  async activate(resourceStateId: string): Promise<ResourceStateDocument | null> {
    return this.resourceStateModel
      .findByIdAndUpdate(resourceStateId, { active: true }, { new: true })
      .exec();
  }

  /**
   * Obtener estado "bueno"
   */
  async getGoodState(): Promise<ResourceStateDocument | null> {
    return this.findByName('good');
  }

  /**
   * Obtener estado "deteriorado"
   */
  async getDeterioratedState(): Promise<ResourceStateDocument | null> {
    return this.findByName('deteriorated');
  }

  /**
   * Obtener estado "dañado"
   */
  async getDamagedState(): Promise<ResourceStateDocument | null> {
    return this.findByName('damaged');
  }

  /**
   * Obtener estado "perdido"
   */
  async getLostState(): Promise<ResourceStateDocument | null> {
    return this.findByName('lost');
  }
}