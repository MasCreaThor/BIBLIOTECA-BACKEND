import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { SeedService } from './seed.service';
import { LoggerService } from '@common/services/logger.service';

/**
 * Comando para ejecutar semillas de datos
 *
 * Uso:
 * npm run db:seed - Sembrar datos básicos
 * npm run db:seed:dev - Sembrar datos de desarrollo
 * npm run db:seed:clear - Limpiar todos los datos (solo desarrollo)
 */

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // Usar nuestro logger personalizado
    });

    const seedService = app.get(SeedService);
    const logger = app.get(LoggerService);
    logger.setContext('SeedCommand');

    const command = process.argv[2] || 'seed';

    logger.log(`Executing seed command: ${command}`);

    switch (command) {
      case 'seed':
        await seedService.seedAll();
        break;

      case 'seed:dev':
        await seedService.seedAll();
        await seedService.seedDevelopmentData();
        break;

      case 'seed:clear':
        await seedService.clearAll();
        logger.warn('All data has been cleared');
        break;

      case 'verify':
        const integrity = await seedService.verifyDataIntegrity();
        logger.log('Data integrity check:');
        logger.log(`- Has admin user: ${integrity.hasAdmin}`);
        logger.log(`- Has person types: ${integrity.hasPersonTypes}`);
        logger.log(`- Person types count: ${integrity.personTypesCount}`);
        logger.log(`- Users count: ${integrity.usersCount}`);
        logger.log(`- People count: ${integrity.peopleCount}`);
        break;

      default:
        logger.error(`Unknown command: ${command}`);
        logger.log('Available commands:');
        logger.log('- seed: Seed basic data');
        logger.log('- seed:dev: Seed basic + development data');
        logger.log('- seed:clear: Clear all data (development only)');
        logger.log('- verify: Verify data integrity');
        process.exit(1);
    }

    logger.log('Seed command completed successfully');
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Seed command failed:', error);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  bootstrap();
}
