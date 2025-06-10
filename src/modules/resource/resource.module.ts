// src/modules/resource/resource.module.ts - ACTUALIZADO
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controladores organizados por responsabilidad
import {
  // Core controllers
  ResourceController,
  
  // Management controllers
  CategoryController,
  AuthorController,
  PublisherController,
  LocationController,
  ResourceTypeController,
  ResourceStateController,
  
  // Integration controllers
  GoogleBooksController,
  GoogleBooksResourceController,
} from './controllers';

// Servicios organizados por responsabilidad
import {
  // Core services
  ResourceService,
  
  // Management services
  CategoryService,
  AuthorService,
  PublisherService,
  LocationService,
  ResourceTypeService,
  ResourceStateService,
  
  // Integration services
  GoogleBooksService,
  GoogleBooksResourceService,
} from './services';

// Repositorios simplificados
import {
  ResourceRepository,
  CategoryRepository,
  AuthorRepository,
  PublisherRepository,
  LocationRepository,
  ResourceTypeRepository,
  ResourceStateRepository,
} from './repositories';

// Modelos
import {
  Resource,
  ResourceSchema,
  ResourceType,
  ResourceTypeSchema,
  Category,
  CategorySchema,
  Author,
  AuthorSchema,
  Publisher,
  PublisherSchema,
  ResourceState,
  ResourceStateSchema,
  Location,
  LocationSchema,
} from './models';

// Adapters
import { GoogleBooksAdapter } from '@adapters/google-books.adapter';

// Servicios compartidos
import { LoggerService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([
      // Modelo principal
      { name: Resource.name, schema: ResourceSchema },
      
      // Modelos de configuración
      { name: ResourceType.name, schema: ResourceTypeSchema },
      { name: ResourceState.name, schema: ResourceStateSchema },
      
      // Modelos de gestión
      { name: Category.name, schema: CategorySchema },
      { name: Author.name, schema: AuthorSchema },
      { name: Publisher.name, schema: PublisherSchema },
      { name: Location.name, schema: LocationSchema },
    ]),
  ],
  controllers: [
    // Core controllers
    ResourceController,
    
    // Management controllers
    CategoryController,
    AuthorController,
    PublisherController,
    LocationController,
    ResourceTypeController,
    ResourceStateController,
    
    // Integration controllers
    GoogleBooksController,
  ],
  providers: [
    // Core services
    ResourceService,
    
    // Management services
    CategoryService,
    AuthorService,
    PublisherService,
    LocationService,
    ResourceTypeService,
    ResourceStateService,
    
    // Integration services
    GoogleBooksService,
    GoogleBooksResourceService,

    // Repositories
    ResourceRepository,
    CategoryRepository,
    AuthorRepository,
    PublisherRepository,
    LocationRepository,
    ResourceTypeRepository,
    ResourceStateRepository,

    // Adapters
    GoogleBooksAdapter,

    // Shared services
    LoggerService,
  ],
  exports: [
    // Core services (para otros módulos como loans)
    ResourceService,
    
    // Management services (útiles para otros módulos)
    CategoryService,
    AuthorService,
    PublisherService,
    LocationService,
    ResourceTypeService,
    ResourceStateService,
    
    // Integration services
    GoogleBooksService,
    GoogleBooksResourceService,

    // Repositories (para casos específicos)
    ResourceRepository,
    CategoryRepository,
    AuthorRepository,
    PublisherRepository,
    LocationRepository,
    ResourceTypeRepository,
    ResourceStateRepository,

    // Adapters (para otros módulos)
    GoogleBooksAdapter,
  ],
})
export class ResourceModule {}