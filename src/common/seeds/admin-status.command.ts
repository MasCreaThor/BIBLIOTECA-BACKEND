// src/common/seeds/admin-status.command.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UserRepository } from '@repositories/user.repository';
import { PersonTypeRepository } from '@repositories/person-type.repository';
import { LoggerService } from '@common/services/logger.service';

/**
 * Comando simplificado para verificar el estado de inicialización del sistema
 * No requiere BootstrapModule
 * 
 * Uso: npm run admin:status
 */
async function checkBootstrapStatus() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const userRepository = app.get(UserRepository);
  const personTypeRepository = app.get(PersonTypeRepository);
  const logger = app.get(LoggerService);
  logger.setContext('AdminStatus');

  try {
    console.log('\n📊 ESTADO DEL SISTEMA DE BIBLIOTECA ESCOLAR');
    console.log('============================================\n');

    // Verificar estado manualmente
    const [hasAdmin, personTypes, totalUsers] = await Promise.all([
      userRepository.hasAdminUser(),
      personTypeRepository.findAllActive(),
      userRepository.count({}),
    ]);

    const hasPersonTypes = personTypes.length >= 2;
    const systemInitialized = hasAdmin && hasPersonTypes;
    const needsBootstrap = !hasAdmin;

    // Estado del administrador
    console.log(`🔐 Administrador:`);
    if (hasAdmin) {
      console.log(`   ✅ Configurado - Ya existe al menos un administrador`);
    } else {
      console.log(`   ❌ No configurado - No hay administradores en el sistema`);
    }

    // Estado de tipos de persona
    console.log(`\n👥 Tipos de persona (estudiante/docente):`);
    if (hasPersonTypes) {
      console.log(`   ✅ Configurados - Los tipos básicos están creados`);
    } else {
      console.log(`   ❌ No configurados - Faltan tipos de persona básicos`);
    }

    // Estadísticas generales
    console.log(`\n📊 Estadísticas:`);
    console.log(`   Total de usuarios del sistema: ${totalUsers}`);

    // Estado general del sistema
    console.log(`\n🚀 Estado general del sistema:`);
    if (systemInitialized) {
      console.log(`   ✅ Sistema inicializado y listo para usar`);
    } else {
      console.log(`   ❌ Sistema NO inicializado`);
    }

    // Acciones recomendadas
    console.log(`\n💡 Acciones recomendadas:`);
    if (needsBootstrap) {
      console.log(`   ⚠️  EL SISTEMA NECESITA INICIALIZACIÓN`);
      console.log(`   `);
      console.log(`   Opciones para crear el primer administrador:`);
      console.log(`   1. Comando interactivo: npm run admin:init`);
      console.log(`   2. Configurar variables ADMIN_EMAIL y ADMIN_PASSWORD en .env y ejecutar: npm run db:seed`);
      console.log(`   `);
      console.log(`   ⚡ Recomendado: npm run admin:init`);
    } else {
      console.log(`   ✅ El sistema está correctamente inicializado`);
      console.log(`   ✅ Puedes iniciar el servidor con: npm run start:dev`);
      console.log(`   ✅ Accede al sistema con las credenciales del administrador`);
      
      if (totalUsers === 1) {
        console.log(`   💡 Considera crear un usuario bibliotecario adicional desde el panel de administración`);
      }
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