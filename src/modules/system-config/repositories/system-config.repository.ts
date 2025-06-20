import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SystemConfig, SystemConfigDocument } from '@modules/system-config/models';
import { BaseRepositoryImpl } from '@shared/repositories';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class SystemConfigRepository extends BaseRepositoryImpl<SystemConfigDocument> {
  constructor(
    @InjectModel(SystemConfig.name) private systemConfigModel: Model<SystemConfigDocument>,
    private readonly logger: LoggerService,
  ) {
    super(systemConfigModel);
    this.logger.setContext('SystemConfigRepository');
  }

  /**
   * Obtener la configuración activa del sistema
   */
  async findActiveConfig(): Promise<SystemConfigDocument | null> {
    try {
      return await this.systemConfigModel
        .findOne({ active: true })
        .sort({ updatedAt: -1 })
        .exec();
    } catch (error) {
      this.logger.error('Error finding active system config', error);
      throw error;
    }
  }

  /**
   * Crear o actualizar la configuración activa
   */
  async createOrUpdateActiveConfig(configData: Partial<SystemConfig>): Promise<SystemConfigDocument> {
    try {
      // Buscar configuración activa existente
      let activeConfig = await this.systemConfigModel.findOne({ active: true });
      
      if (activeConfig) {
        // Actualizar configuración existente
        const result = await this.systemConfigModel.findByIdAndUpdate(
          activeConfig._id,
          {
            ...configData,
            active: true,
            lastUpdated: new Date(),
          },
          {
            new: true,
            runValidators: true,
          }
        );

        if (!result) {
          throw new Error('Failed to update system config');
        }

        return result;
      } else {
        // Crear nueva configuración si no existe ninguna activa
        const newConfig = new this.systemConfigModel({
          ...configData,
          active: true,
          lastUpdated: new Date(),
        });

        return await newConfig.save();
      }
    } catch (error) {
      this.logger.error('Error creating/updating active system config', error);
      throw error;
    }
  }

  /**
   * Obtener historial de configuraciones
   */
  async findConfigHistory(limit: number = 10): Promise<SystemConfigDocument[]> {
    try {
      return await this.systemConfigModel
        .find()
        .sort({ updatedAt: -1 })
        .limit(limit)
        .exec();
    } catch (error) {
      this.logger.error('Error finding system config history', error);
      throw error;
    }
  }

  /**
   * Restaurar configuración anterior
   */
  async restoreConfig(configId: string): Promise<SystemConfigDocument | null> {
    try {
      const configToRestore = await this.systemConfigModel.findById(configId);
      if (!configToRestore) {
        return null;
      }

      // Desactivar configuración actual
      await this.systemConfigModel.updateMany(
        { active: true },
        { active: false }
      );

      // Activar configuración seleccionada
      configToRestore.active = true;
      configToRestore.lastUpdated = new Date();
      return await configToRestore.save();
    } catch (error) {
      this.logger.error('Error restoring system config', error);
      throw error;
    }
  }

  /**
   * Verificar si existe configuración activa
   */
  async hasActiveConfig(): Promise<boolean> {
    try {
      const count = await this.systemConfigModel.countDocuments({ active: true });
      return count > 0;
    } catch (error) {
      this.logger.error('Error checking active system config', error);
      throw error;
    }
  }

  /**
   * Limpiar registros duplicados y mantener solo uno activo
   */
  async cleanupDuplicateConfigs(): Promise<void> {
    try {
      // Obtener todas las configuraciones activas
      const activeConfigs = await this.systemConfigModel.find({ active: true }).sort({ updatedAt: -1 });
      
      if (activeConfigs.length > 1) {
        // Mantener solo la más reciente como activa
        const [latestConfig, ...oldConfigs] = activeConfigs;
        
        // Desactivar las configuraciones antiguas
        const oldIds = oldConfigs.map(config => config._id);
        await this.systemConfigModel.updateMany(
          { _id: { $in: oldIds } },
          { active: false }
        );
        
        this.logger.log(`Cleaned up ${oldConfigs.length} duplicate configs, kept ${latestConfig._id} as active`);
      }
    } catch (error) {
      this.logger.error('Error cleaning up duplicate configs', error);
      throw error;
    }
  }
} 