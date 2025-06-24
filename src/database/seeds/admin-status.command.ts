// src/database/seeds/admin-status.command.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UserRepository } from '@modules/user/repositories';
import { PersonTypeRepository } from '@modules/person/repositories';
import { ResourceSeedService } from '@modules/resource/seeds/resource-seed.service';
import { LoanSeedService } from '@modules/loan/seeds/loan-seed.service'; // NUEVO
import { LoggerService } from '@shared/services/logger.service';
import { BootstrapService } from '@modules/auth/services/bootstrap.service';

/**
 * Comando actualizado para verificar el estado de inicialización del sistema
 * Incluye verificación del sistema de préstamos
 * 
 * Uso: npm run admin:status
 */
async function checkBootstrapStatus() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const userRepository = app.get(UserRepository);
  const personTypeRepository = app.get(PersonTypeRepository);
  const resourceSeedService = app.get(ResourceSeedService);
  const loanSeedService = app.get(LoanSeedService); // NUEVO
  const logger = app.get(LoggerService);
  logger.setContext('AdminStatus');

  try {
    console.log('\n📊 ESTADO DEL SISTEMA DE BIBLIOTECA ESCOLAR');
    console.log('============================================\n');

    // Verificar estado básico del sistema
    const [
      hasAdmin, 
      personTypes, 
      totalUsers,
      resourceIntegrity,
      loanIntegrity
    ] = await Promise.all([
      userRepository.hasAdminUser(),
      personTypeRepository.findAllActive(),
      userRepository.count({}),
      resourceSeedService.verifyResourceDataIntegrity(),
      loanSeedService.verifyLoanDataIntegrity(), // NUEVO
    ]);

    const hasPersonTypes = personTypes.length >= 2;
    const systemInitialized = hasAdmin && hasPersonTypes && resourceIntegrity.hasResourceTypes && resourceIntegrity.hasResourceStates && loanIntegrity.hasLoanStatuses;
    const needsBootstrap = !hasAdmin;

    // === ESTADO DEL ADMINISTRADOR ===
    console.log(`🔐 Administrador:`);
    if (hasAdmin) {
      console.log(`   ✅ Configurado - Ya existe al menos un administrador`);
    } else {
      console.log(`   ❌ No configurado - No hay administradores en el sistema`);
    }

    // === ESTADO DE TIPOS DE PERSONA ===
    console.log(`\n👥 Tipos de persona (estudiante/docente):`);
    if (hasPersonTypes) {
      console.log(`   ✅ Configurados - Los tipos básicos están creados (${personTypes.length})`);
    } else {
      console.log(`   ❌ No configurados - Faltan tipos de persona básicos`);
    }

    // === ESTADO DE DATOS DE RECURSOS === NUEVO
    console.log(`\n📚 Datos de recursos:`);
    console.log(`   Tipos de recursos: ${resourceIntegrity.hasResourceTypes ? '✅' : '❌'} (${resourceIntegrity.resourceTypesCount})`);
    console.log(`   Estados de recursos: ${resourceIntegrity.hasResourceStates ? '✅' : '❌'} (${resourceIntegrity.resourceStatesCount})`);
    console.log(`   Categorías: ${resourceIntegrity.hasBasicCategories ? '✅' : '❌'} (${resourceIntegrity.categoriesCount})`);
    console.log(`   Ubicaciones: ${resourceIntegrity.hasBasicLocations ? '✅' : '❌'} (${resourceIntegrity.locationsCount})`);

    // === ESTADO DE DATOS DE PRÉSTAMOS === NUEVO
    console.log(`\n🔄 Sistema de préstamos:`);
    console.log(`   Estados de préstamos: ${loanIntegrity.hasLoanStatuses ? '✅' : '❌'} (${loanIntegrity.loanStatusesCount})`);
    
    if (loanIntegrity.hasLoanStatuses) {
      console.log(`   ✅ Sistema de préstamos listo para usar`);
    } else {
      console.log(`   ❌ Sistema de préstamos no configurado`);
    }

    // === ESTADÍSTICAS GENERALES ===
    console.log(`\n📊 Estadísticas:`);
    console.log(`   Total de usuarios del sistema: ${totalUsers}`);

    // === ESTADO GENERAL DEL SISTEMA ===
    console.log(`\n🚀 Estado general del sistema:`);
    if (systemInitialized) {
      console.log(`   ✅ Sistema completamente inicializado y listo para usar`);
      console.log(`   ✅ Todos los módulos están configurados correctamente`);
    } else {
      console.log(`   ❌ Sistema NO completamente inicializado`);
      
      if (!hasAdmin) {
        console.log(`   ⚠️  Falta: Administrador inicial`);
      }
      if (!hasPersonTypes) {
        console.log(`   ⚠️  Falta: Tipos de persona`);
      }
      if (!resourceIntegrity.hasResourceTypes || !resourceIntegrity.hasResourceStates) {
        console.log(`   ⚠️  Falta: Configuración de recursos`);
      }
      if (!loanIntegrity.hasLoanStatuses) {
        console.log(`   ⚠️  Falta: Configuración de préstamos`);
      }
    }

    // === ACCIONES RECOMENDADAS ===
    console.log(`\n💡 Acciones recomendadas:`);
    if (needsBootstrap) {
      console.log(`   ⚠️  EL SISTEMA NECESITA INICIALIZACIÓN`);
      console.log(`   `);
      console.log(`   Opciones para inicializar:`);
      console.log(`   1. Comando interactivo: npm run admin:init`);
      console.log(`   2. Configurar variables ADMIN_EMAIL y ADMIN_PASSWORD en .env y ejecutar: npm run db:seed`);
      console.log(`   `);
      console.log(`   ⚡ Recomendado: npm run admin:init`);
    } else if (!systemInitialized) {
      console.log(`   ⚠️  COMPLETAR INICIALIZACIÓN DEL SISTEMA`);
      console.log(`   `);
      console.log(`   Para completar la configuración:`);
      console.log(`   1. Ejecutar: npm run db:seed`);
      console.log(`   `);
      console.log(`   Esto configurará tipos de recursos, estados, categorías y sistema de préstamos`);
    } else {
      console.log(`   ✅ El sistema está correctamente inicializado`);
      console.log(`   ✅ Puedes iniciar el servidor con: npm run start:dev`);
      console.log(`   ✅ Accede al sistema con las credenciales del administrador`);
      
      if (totalUsers === 1) {
        console.log(`   💡 Considera crear un usuario bibliotecario adicional desde el panel de administración`);
      }

      console.log(`   `);
      console.log(`   🎯 Funcionalidades disponibles:`);
      console.log(`   • ✅ Gestión de usuarios del sistema`);
      console.log(`   • ✅ Gestión de personas (estudiantes/docentes)`);
      console.log(`   • ✅ Gestión de recursos (libros, juegos, mapas, biblias)`);
      console.log(`   • ✅ Sistema completo de préstamos y devoluciones`);
      console.log(`   • ✅ Seguimiento de préstamos vencidos`);
      console.log(`   • ✅ Integración con Google Books API`);
    }

    console.log('');

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('\n❌ Error verificando estado del sistema:', errorMessage);
    logger.error('Status check failed', error);
    
    console.log('\n🔧 Posibles causas:');
    console.log('   - MongoDB no está ejecutándose');
    console.log('   - Error en la configuración de la base de datos');
    console.log('   - Variables de entorno incorrectas\n');
    
    console.log('🔍 Verificaciones recomendadas:');
    console.log('   1. Verifica que MongoDB esté ejecutándose');
    console.log('   2. Revisa la variable MONGODB_URI en tu archivo .env');
    console.log('   3. Ejecuta: npm run start:dev para ver errores detallados\n');
  } finally {
    await app.close();
  }
}

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
async function main() {
  try {
    await checkBootstrapStatus();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('Error:', errorMessage);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  main();
}