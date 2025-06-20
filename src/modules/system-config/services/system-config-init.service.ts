import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { SystemConfigService } from './system-config.service';

@Injectable()
export class SystemConfigInitService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SystemConfigInitService.name);

  constructor(private readonly systemConfigService: SystemConfigService) {}

  async onApplicationBootstrap() {
    try {
      this.logger.log('🔍 Verificando configuración del sistema...');
      
      // Intentar obtener la configuración activa
      const config = await this.systemConfigService.getActiveConfig().catch(() => null);
      
      if (!config) {
        this.logger.log('📝 No existe configuración del sistema. Creando configuración por defecto...');
        
        // Crear configuración por defecto (solo campos editables por la bibliotecaria)
        await this.systemConfigService.createConfig({
          sidebarTitle: 'Biblioteca Escolar',
          sidebarSubtitle: 'Sistema de Biblioteca',
          sidebarIcon: 'FiBook',
          description: 'Configuración inicial automática del sistema',
          // La versión se maneja automáticamente por el sistema
        });
        
        this.logger.log('✅ Configuración del sistema creada correctamente.');
      } else {
        this.logger.log('✅ Configuración del sistema ya existe. No se realiza ninguna acción.');
        this.logger.debug(`Configuración actual: ${config.sidebarTitle} v${config.version}`);
      }
    } catch (error) {
      this.logger.error('❌ Error durante la inicialización de la configuración del sistema:', error);
      // No lanzar el error para evitar que falle el inicio de la aplicación
    }
  }
} 