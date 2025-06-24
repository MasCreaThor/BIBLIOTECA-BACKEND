import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { SystemConfigRepository } from '@modules/system-config/repositories';
import { CreateSystemConfigDto, UpdateSystemConfigDto, SystemConfigResponseDto } from '@modules/system-config/dto';
import { SystemConfig, SystemConfigDocument } from '@modules/system-config/models';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
export class SystemConfigService {
  constructor(
    private readonly systemConfigRepository: SystemConfigRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SystemConfigService');
  }

  /**
   * Obtener la configuración activa del sistema
   */
  async getActiveConfig(): Promise<SystemConfigResponseDto> {
    try {
      // Limpiar registros duplicados antes de obtener la configuración
      await this.systemConfigRepository.cleanupDuplicateConfigs();
      
      const config = await this.systemConfigRepository.findActiveConfig();
      
      if (!config) {
        // Crear configuración por defecto si no existe
        return await this.createDefaultConfig();
      }

      return this.mapToResponseDto(config);
    } catch (error) {
      this.logger.error('Error getting active system config', error);
      throw error;
    }
  }

  /**
   * Crear nueva configuración del sistema
   */
  async createConfig(createDto: CreateSystemConfigDto): Promise<SystemConfigResponseDto> {
    try {
      this.logger.log('Creating new system configuration', { data: createDto });

      // Asignar versión automáticamente si no se proporciona
      const configData = {
        ...createDto,
        version: createDto.version || this.getDefaultVersion(),
      };

      const config = await this.systemConfigRepository.createOrUpdateActiveConfig(configData);
      return this.mapToResponseDto(config);
    } catch (error) {
      this.logger.error('Error creating system config', error);
      throw error;
    }
  }

  /**
   * Actualizar configuración del sistema
   */
  async updateConfig(updateDto: UpdateSystemConfigDto): Promise<SystemConfigResponseDto> {
    try {
      this.logger.log('Updating system configuration', { data: updateDto });

      const currentConfig = await this.systemConfigRepository.findActiveConfig();
      if (!currentConfig) {
        throw new NotFoundException('No se encontró configuración activa del sistema');
      }

      // Filtrar propiedades undefined y manejar valores vacíos
      const filteredData: any = {};
      
      Object.entries(updateDto).forEach(([key, value]) => {
        if (value !== undefined) {
          // Manejar valores vacíos para campos específicos
          if (key === 'sidebarIconUrl' || key === 'sidebarIconImage') {
            // Si el valor es una cadena vacía, establecer como null para limpiar el campo
            filteredData[key] = value === '' ? null : value;
          } else {
            filteredData[key] = value;
          }
        }
      });

      // Lógica para manejar transiciones entre tipos de iconos
      if (filteredData.sidebarIconUrl !== undefined) {
        // Si se está configurando una URL, limpiar la imagen subida
        if (filteredData.sidebarIconUrl) {
          this.logger.log('Configurando URL de imagen, limpiando imagen subida');
          filteredData.sidebarIconImage = null;
          // Asegurar que sidebarIcon tenga un valor por defecto cuando se usa URL
          if (!filteredData.sidebarIcon || filteredData.sidebarIcon.trim() === '') {
            filteredData.sidebarIcon = 'FiImage';
          }
        }
      }
      
      if (filteredData.sidebarIconImage !== undefined) {
        // Si se está configurando una imagen subida, limpiar la URL
        if (filteredData.sidebarIconImage) {
          this.logger.log('Configurando imagen subida, limpiando URL');
          filteredData.sidebarIconUrl = null;
          // Asegurar que sidebarIcon tenga un valor por defecto cuando se usa imagen
          if (!filteredData.sidebarIcon || filteredData.sidebarIcon.trim() === '') {
            filteredData.sidebarIcon = 'FiImage';
          }
        }
      }

      // Asegurar que sidebarIcon siempre tenga un valor válido
      if (!filteredData.sidebarIcon || filteredData.sidebarIcon.trim() === '') {
        filteredData.sidebarIcon = currentConfig.sidebarIcon || 'FiBook';
      }

      // Preparar datos para actualización
      const configData = {
        ...filteredData,
        version: updateDto.version || currentConfig.version,
        lastUpdated: new Date(),
      };

      this.logger.log('Filtered config data for update', { configData });

      const updatedConfig = await this.systemConfigRepository.createOrUpdateActiveConfig(configData);

      return this.mapToResponseDto(updatedConfig);
    } catch (error) {
      this.logger.error('Error updating system config', error);
      throw error;
    }
  }

  /**
   * Obtener historial de configuraciones
   */
  async getConfigHistory(limit: number = 10): Promise<SystemConfigResponseDto[]> {
    try {
      const configs = await this.systemConfigRepository.findConfigHistory(limit);
      return configs.map(config => this.mapToResponseDto(config));
    } catch (error) {
      this.logger.error('Error getting system config history', error);
      throw error;
    }
  }

  /**
   * Restaurar configuración anterior
   */
  async restoreConfig(configId: string): Promise<SystemConfigResponseDto> {
    try {
      this.logger.log('Restoring system configuration', { configId });

      const restoredConfig = await this.systemConfigRepository.restoreConfig(configId);
      if (!restoredConfig) {
        throw new NotFoundException('Configuración no encontrada');
      }

      return this.mapToResponseDto(restoredConfig);
    } catch (error) {
      this.logger.error('Error restoring system config', error);
      throw error;
    }
  }

  /**
   * Subir logo/imagen del sistema
   */
  async uploadLogo(file: Express.Multer.File): Promise<SystemConfigResponseDto> {
    try {
      this.logger.log('Uploading system logo', { 
        filename: file.originalname, 
        size: file.size, 
        mimetype: file.mimetype 
      });

      // Convertir el buffer a base64
      const base64Image = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

      // Obtener la configuración actual
      const currentConfig = await this.systemConfigRepository.findActiveConfig();
      
      if (!currentConfig) {
        // Si no existe configuración, crear una nueva con la imagen
        const newConfig: CreateSystemConfigDto = {
          sidebarTitle: 'Biblioteca Escolar',
          sidebarSubtitle: 'Sistema de Biblioteca',
          sidebarIcon: 'FiImage',
          sidebarIconImage: base64Image,
          description: 'Configuración creada con logo personalizado',
        };
        
        const config = await this.systemConfigRepository.createOrUpdateActiveConfig(newConfig);
        return this.mapToResponseDto(config);
      }

      // Actualizar la configuración existente con la nueva imagen
      const updateData = {
        sidebarIconImage: base64Image,
        sidebarIcon: 'FiImage', // Cambiar a icono de imagen
        sidebarIconUrl: undefined, // Limpiar URL si existía
        lastUpdated: new Date(),
      };

      const updatedConfig = await this.systemConfigRepository.createOrUpdateActiveConfig(updateData);

      return this.mapToResponseDto(updatedConfig);
    } catch (error) {
      this.logger.error('Error uploading system logo', error);
      throw error;
    }
  }

  /**
   * Validar URL de imagen personalizada
   */
  async validateImageUrl(url: string): Promise<boolean> {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      const contentType = response.headers.get('content-type');
      
      if (!contentType) {
        return false;
      }

      // Verificar que sea una imagen
      return contentType.startsWith('image/');
    } catch (error) {
      this.logger.warn('Invalid image URL', { url, error });
      return false;
    }
  }

  /**
   * Obtener versión por defecto del sistema
   */
  private getDefaultVersion(): string {
    // Aquí podrías leer la versión desde package.json o un archivo de configuración
    return '1.1.5';
  }

  /**
   * Crear configuración por defecto
   */
  private async createDefaultConfig(): Promise<SystemConfigResponseDto> {
    try {
      this.logger.log('Creating default system configuration');

      const defaultConfig: CreateSystemConfigDto = {
        sidebarTitle: 'Biblioteca Escolar',
        sidebarSubtitle: 'Sistema de Biblioteca',
        sidebarIcon: 'FiBook',
        version: this.getDefaultVersion(),
        description: 'Configuración por defecto del sistema',
      };

      const config = await this.systemConfigRepository.createOrUpdateActiveConfig(defaultConfig);
      return this.mapToResponseDto(config);
    } catch (error) {
      this.logger.error('Error creating default system config', error);
      throw error;
    }
  }

  /**
   * Mapear documento a DTO de respuesta
   */
  private mapToResponseDto(config: SystemConfigDocument): SystemConfigResponseDto {
    return {
      id: config._id?.toString() || '',
      sidebarTitle: config.sidebarTitle,
      sidebarSubtitle: config.sidebarSubtitle,
      sidebarIcon: config.sidebarIcon,
      sidebarIconUrl: config.sidebarIconUrl,
      sidebarIconImage: config.sidebarIconImage,
      version: config.version,
      active: config.active,
      description: config.description,
      lastUpdated: config.lastUpdated,
      createdAt: (config as any).createdAt || new Date(),
      updatedAt: (config as any).updatedAt || new Date(),
    };
  }

  /**
   * Limpiar configuraciones duplicadas
   */
  async cleanupDuplicateConfigs(): Promise<void> {
    try {
      await this.systemConfigRepository.cleanupDuplicateConfigs();
    } catch (error) {
      this.logger.error('Error cleaning up duplicate configs', error);
      throw error;
    }
  }
} 