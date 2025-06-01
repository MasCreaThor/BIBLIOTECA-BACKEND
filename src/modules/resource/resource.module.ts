// src/modules/resource/resource.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controladores
import {
  ResourceController,
  CategoryController,
  LocationController,
  AuthorController,
  PublisherController,
  GoogleBooksController,
} from './controllers';

// Servicios
import {
  ResourceService,
  CategoryService,
  LocationService,
  AuthorService,
  PublisherService,
  GoogleBooksService,
} from './services';

// Repositorios
import {
  ResourceRepository,
  CategoryRepository,
  LocationRepository,
  AuthorRepository,
  PublisherRepository,
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

/**
 * Módulo para gestión de recursos de la biblioteca
 */

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Resource.name, schema: ResourceSchema },
      { name: ResourceType.name, schema: ResourceTypeSchema },
      { name: Category.name, schema: CategorySchema },
      { name: Author.name, schema: AuthorSchema },
      { name: Publisher.name, schema: PublisherSchema },
      { name: ResourceState.name, schema: ResourceStateSchema },
      { name: Location.name, schema: LocationSchema },
    ]),
  ],
  controllers: [
    ResourceController,
    CategoryController,
    LocationController,
    AuthorController,
    PublisherController,
    GoogleBooksController,
  ],
  providers: [
    // Servicios
    ResourceService,
    CategoryService,
    LocationService,
    AuthorService,
    PublisherService,
    GoogleBooksService,

    // Repositorios
    ResourceRepository,
    CategoryRepository,
    LocationRepository,
    AuthorRepository,
    PublisherRepository,
    ResourceTypeRepository,
    ResourceStateRepository,

    // Adapters
    GoogleBooksAdapter,

    // Servicios compartidos
    LoggerService,
  ],
  exports: [
    // Servicios (para otros módulos)
    ResourceService,
    CategoryService,
    LocationService,
    AuthorService,
    PublisherService,
    GoogleBooksService,

    // Repositorios (para otros módulos)
    ResourceRepository,
    CategoryRepository,
    LocationRepository,
    AuthorRepository,
    PublisherRepository,
    ResourceTypeRepository,
    ResourceStateRepository,

    // Adapters (para otros módulos)
    GoogleBooksAdapter,
  ],
})
export class ResourceModule {}