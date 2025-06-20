import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Servicios compartidos
import { LoggerService } from './services/logger.service';
import { PasswordService } from './services/password.service';
import { AppInitializationService } from './services/app-initialization.service';

// Importar modelos necesarios para inicialización
import { LoanStatus, LoanStatusSchema } from '@modules/loan/models';
import { 
  ResourceType, 
  ResourceTypeSchema,
  ResourceState, 
  ResourceStateSchema,
  Category, 
  CategorySchema,
  Location, 
  LocationSchema 
} from '@modules/resource/models';

// Importar repositorios necesarios
import { LoanStatusRepository } from '@modules/loan/repositories';
import { LoanSeedService } from '@modules/loan/seeds/loan-seed.service';
import { 
  ResourceTypeRepository,
  ResourceStateRepository,
  CategoryRepository,
  LocationRepository 
} from '@modules/resource/repositories';
import { ResourceSeedService } from '@modules/resource/seeds/resource-seed.service';

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
      { name: ResourceType.name, schema: ResourceTypeSchema },
      { name: ResourceState.name, schema: ResourceStateSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Location.name, schema: LocationSchema },
    ]),
  ],
  providers: [
    // Servicios básicos
    LoggerService,
    PasswordService,
    
    // Servicios de inicialización
    AppInitializationService,
    LoanStatusRepository,
    LoanSeedService,
    ResourceTypeRepository,
    ResourceStateRepository,
    CategoryRepository,
    LocationRepository,
    ResourceSeedService,
  ],
  exports: [
    // Exportar servicios básicos para uso global
    LoggerService,
    PasswordService,
    
    // Exportar servicio de inicialización
    AppInitializationService,
  ],
})
export class SharedModule {}