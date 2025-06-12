// src/modules/resource/index.ts

// Module
export { ResourceModule } from './resource.module';

// DTOs organized by domain
export * from './dto';

// Models
export * from './models';

// Core services (main functionality)
export { ResourceService } from './services/core';

// Management services (auxiliary entities)
export { 
  CategoryService, 
  AuthorService, 
  PublisherService, 
  LocationService 
} from './services/management';

// Integration services (external APIs)
export { 
  GoogleBooksService, 
  GoogleBooksResourceService 
} from './services/integration';

// Core repositories (if needed by other modules)
export { 
  ResourceRepository,
  CategoryRepository,
  AuthorRepository,
  PublisherRepository,
  LocationRepository,
  ResourceTypeRepository,
  ResourceStateRepository,
} from './repositories';