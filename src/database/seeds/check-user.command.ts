import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { UserRepository } from '@modules/user/repositories';

/**
 * Comando CLI para verificar los datos del usuario
 * 
 * Uso: npm run admin:check-user
 */
async function checkUser() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  const userRepository = app.get(UserRepository);

  try {
    console.log('\n👤 VERIFICACIÓN DE DATOS DE USUARIO');
    console.log('====================================\n');

    // Obtener todos los usuarios
    const users = await userRepository.findAll();
    
    console.log(`📊 Total de usuarios: ${users.length}\n`);

    for (const user of users) {
      console.log(`🔍 Usuario ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   firstName: "${user.firstName}" (tipo: ${typeof user.firstName})`);
      console.log(`   lastName: "${user.lastName}" (tipo: ${typeof user.lastName})`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Active: ${user.active}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log(`   Updated: ${user.updatedAt}`);
      console.log('');
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('\n❌ Error verificando usuario:', errorMessage);
  } finally {
    await app.close();
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  checkUser().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });
} 