import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Servicios compartidos
import { LoggerService } from './services/logger.service';
import { PasswordService } from './services/password.service';
import { AppInitializationService } from './services/app-initialization.service'; // NUEVO

// Importar modelos necesarios para inicialización
import { LoanStatus, LoanStatusSchema } from '@modules/loan/models';

// Importar repositorios necesarios
import { LoanStatusRepository } from '@modules/loan/repositories';
import { LoanSeedService } from '@modules/loan/seeds/loan-seed.service';

/**
 * Módulo compartido global
 * 
 * Este módulo se importa como global en app.module.ts
 * y proporciona servicios básicos a toda la aplicación
 */
@Global()
@Module({
  imports: [
    // Modelos necesarios para inicialización
    MongooseModule.forFeature([
      { name: LoanStatus.name, schema: LoanStatusSchema },
    ]),
  ],
  providers: [
    // Servicios básicos
    LoggerService,
    PasswordService,
    
    // Servicios de inicialización
    AppInitializationService, // NUEVO
    LoanStatusRepository,
    LoanSeedService,
  ],
  exports: [
    // Exportar servicios básicos para uso global
    LoggerService,
    PasswordService,
    
    // Exportar servicio de inicialización
    AppInitializationService, // NUEVO
  ],
})
export class SharedModule {}