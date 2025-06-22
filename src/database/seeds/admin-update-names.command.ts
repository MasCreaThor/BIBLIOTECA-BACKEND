// src/database/seeds/admin-update-names.command.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { BootstrapService } from '@modules/auth/services/bootstrap.service';
import { LoggerService } from '@shared/services/logger.service';

/**
 * Comando CLI para actualizar usuarios existentes con firstName y lastName
 * 
 * Uso: npm run admin:update-names
 */
export class AdminUpdateNamesCommand {
  private bootstrapService!: BootstrapService;
  private logger!: LoggerService;

  async execute(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    this.bootstrapService = app.get(BootstrapService);
    this.logger = app.get(LoggerService);
    this.logger.setContext('AdminUpdateNames');

    try {
      console.log('\n🔄 ACTUALIZACIÓN DE NOMBRES DE USUARIOS');
      console.log('========================================\n');

      console.log('ℹ️  Actualizando usuarios existentes con firstName y lastName...');
      
      await this.bootstrapService.updateExistingUsers();
      
      console.log('\n✅ ¡Actualización completada exitosamente!');
      console.log('   Los usuarios ahora tienen nombres configurados.');
      console.log('   Puedes iniciar sesión nuevamente para ver los cambios.\n');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('\n❌ Error durante la actualización:', errorMessage);
      this.logger.error('Admin update names failed', error);
    } finally {
      await app.close();
    }
  }
}

// Función principal
async function updateNames() {
  try {
    const command = new AdminUpdateNamesCommand();
    await command.execute();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('\n❌ Error ejecutando el comando:', errorMessage);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  updateNames();
} 