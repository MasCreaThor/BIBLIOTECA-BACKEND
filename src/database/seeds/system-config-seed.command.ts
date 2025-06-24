import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { SystemConfigService } from '@modules/system-config/services';
import { LoggerService } from '@shared/services/logger.service';

interface SystemConfigSeedOptions {
  title?: string;
  subtitle?: string;
  icon?: string;
  version?: string;
  description?: string;
}

@Injectable()
@Command({
  name: 'system-config:seed',
  description: 'Inicializar configuración del sistema',
  options: {
    isDefault: true,
  },
})
export class SystemConfigSeedCommand extends CommandRunner {
  constructor(
    private readonly systemConfigService: SystemConfigService,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext('SystemConfigSeedCommand');
  }

  async run(passedParams: string[], options?: SystemConfigSeedOptions): Promise<void> {
    try {
      this.logger.log('🌱 Iniciando seed de configuración del sistema...');

      const defaultConfig = {
        sidebarTitle: options?.title || 'Biblioteca Escolar',
        sidebarSubtitle: options?.subtitle || 'Sistema de Biblioteca',
        sidebarIcon: options?.icon || 'FiBook',
        version: options?.version || '1.1.5',
        description: options?.description || 'Configuración inicial del sistema',
      };

      this.logger.log('📝 Creando configuración por defecto:', defaultConfig);

      const config = await this.systemConfigService.createConfig(defaultConfig);

      this.logger.log('✅ Configuración del sistema creada exitosamente:', {
        id: config.id,
        title: config.sidebarTitle,
        version: config.version,
        active: config.active,
      });

      this.logger.log('🎉 Seed de configuración del sistema completado');
    } catch (error) {
      this.logger.error('❌ Error durante el seed de configuración del sistema:', error);
      throw error;
    }
  }
} 