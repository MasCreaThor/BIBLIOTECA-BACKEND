// src/modules/resource/seeds/resource-seed.service.ts
import { Injectable } from '@nestjs/common';
import { 
  ResourceTypeRepository, 
  ResourceStateRepository, 
  CategoryRepository, 
  LocationRepository 
} from '../repositories';
import { LoggerService } from '../../../shared/services/logger.service';

/**
 * Servicio para sembrar datos iniciales de recursos
 */

@Injectable()
export class ResourceSeedService {
  constructor(
    private readonly resourceTypeRepository: ResourceTypeRepository,
    private readonly resourceStateRepository: ResourceStateRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly locationRepository: LocationRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ResourceSeedService');
  }

  /**
   * Ejecutar todas las siembras de recursos
   */
  async seedAll(): Promise<void> {
    this.logger.log('Starting resource data seeding...');

    try {
      await this.seedResourceTypes();
      await this.seedResourceStates();
      await this.seedBasicCategories();
      await this.seedBasicLocations();

      this.logger.log('Resource data seeding completed successfully');
    } catch (error) {
      this.logger.error('Error during resource data seeding', error);
      throw error;
    }
  }

  /**
   * Sembrar tipos de recursos iniciales
   */
  private async seedResourceTypes(): Promise<void> {
    this.logger.log('Seeding resource types...');

    const resourceTypes = [
      {
        name: 'book' as const,
        description: 'Libros de texto, literatura y referencia',
        active: true,
      },
      {
        name: 'game' as const,
        description: 'Juegos educativos y didácticos',
        active: true,
      },
      {
        name: 'map' as const,
        description: 'Mapas geográficos, políticos y temáticos',
        active: true,
      },
      {
        name: 'bible' as const,
        description: 'Biblias y textos religiosos',
        active: true,
      },
    ];

    for (const resourceTypeData of resourceTypes) {
      const existing = await this.resourceTypeRepository.findByName(resourceTypeData.name);

      if (!existing) {
        await this.resourceTypeRepository.create(resourceTypeData);
        this.logger.log(`Created resource type: ${resourceTypeData.name}`);
      } else {
        this.logger.debug(`Resource type already exists: ${resourceTypeData.name}`);
      }
    }

    this.logger.log('Resource types seeding completed');
  }

  /**
   * Sembrar estados de recursos iniciales
   */
  private async seedResourceStates(): Promise<void> {
    this.logger.log('Seeding resource states...');

    const resourceStates = [
      {
        name: 'good' as const,
        description: 'En buen estado, sin daños visibles',
        color: '#28a745', // Verde
        active: true,
      },
      {
        name: 'deteriorated' as const,
        description: 'Con signos de desgaste pero funcional',
        color: '#ffc107', // Amarillo
        active: true,
      },
      {
        name: 'damaged' as const,
        description: 'Con daños que afectan su funcionalidad',
        color: '#fd7e14', // Naranja
        active: true,
      },
      {
        name: 'lost' as const,
        description: 'Extraviado o perdido',
        color: '#dc3545', // Rojo
        active: true,
      },
    ];

    for (const resourceStateData of resourceStates) {
      const existing = await this.resourceStateRepository.findByName(resourceStateData.name);

      if (!existing) {
        await this.resourceStateRepository.create(resourceStateData);
        this.logger.log(`Created resource state: ${resourceStateData.name}`);
      } else {
        this.logger.debug(`Resource state already exists: ${resourceStateData.name}`);
      }
    }

    this.logger.log('Resource states seeding completed');
  }

  /**
   * Sembrar categorías básicas
   */
  private async seedBasicCategories(): Promise<void> {
    this.logger.log('Seeding basic categories...');

    const basicCategories = [
      {
        name: 'Matemáticas',
        description: 'Libros y recursos de matemáticas',
        color: '#007bff', // Azul
        active: true,
      },
      {
        name: 'Ciencias Naturales',
        description: 'Recursos de biología, química y física',
        color: '#28a745', // Verde
        active: true,
      },
      {
        name: 'Ciencias Sociales',
        description: 'Historia, geografía y educación cívica',
        color: '#dc3545', // Rojo
        active: true,
      },
      {
        name: 'Lenguaje',
        description: 'Literatura, gramática y comunicación',
        color: '#6f42c1', // Púrpura
        active: true,
      },
      {
        name: 'Inglés',
        description: 'Recursos para aprendizaje del idioma inglés',
        color: '#17a2b8', // Cian
        active: true,
      },
      {
        name: 'Educación Religiosa',
        description: 'Textos y recursos religiosos',
        color: '#ffc107', // Amarillo
        active: true,
      },
      {
        name: 'Educación Física',
        description: 'Recursos para deportes y actividad física',
        color: '#fd7e14', // Naranja
        active: true,
      },
      {
        name: 'Artes',
        description: 'Recursos de educación artística y cultural',
        color: '#e83e8c', // Rosa
        active: true,
      },
      {
        name: 'Tecnología e Informática',
        description: 'Recursos de tecnología y computación',
        color: '#6c757d', // Gris
        active: true,
      },
      {
        name: 'Diccionarios',
        description: 'Diccionarios y obras de consulta',
        color: '#343a40', // Gris oscuro
        active: true,
      },
      {
        name: 'Enciclopedias',
        description: 'Enciclopedias y obras de referencia general',
        color: '#20c997', // Verde agua
        active: true,
      },
      {
        name: 'Literatura Infantil',
        description: 'Cuentos y libros para niños',
        color: '#ff6b9d', // Rosa claro
        active: true,
      },
    ];

    for (const categoryData of basicCategories) {
      const existing = await this.categoryRepository.findByName(categoryData.name);

      if (!existing) {
        await this.categoryRepository.create(categoryData);
        this.logger.log(`Created category: ${categoryData.name}`);
      } else {
        this.logger.debug(`Category already exists: ${categoryData.name}`);
      }
    }

    this.logger.log('Basic categories seeding completed');
  }

  /**
   * Sembrar ubicaciones básicas
   */
  private async seedBasicLocations(): Promise<void> {
    this.logger.log('Seeding basic locations...');

    const basicLocations = [
      {
        name: 'Estante Principal A',
        description: 'Estante principal sección A - Literatura y Lenguaje',
        code: 'EST-A',
        active: true,
      },
      {
        name: 'Estante Principal B',
        description: 'Estante principal sección B - Ciencias y Matemáticas',
        code: 'EST-B',
        active: true,
      },
      {
        name: 'Estante Principal C',
        description: 'Estante principal sección C - Ciencias Sociales',
        code: 'EST-C',
        active: true,
      },
      {
        name: 'Estante Infantil',
        description: 'Estante dedicado a literatura infantil',
        code: 'EST-INF',
        active: true,
      },
      {
        name: 'Estante de Referencia',
        description: 'Estante de diccionarios y enciclopedias',
        code: 'EST-REF',
        active: true,
      },
      {
        name: 'Estante de Juegos',
        description: 'Estante para juegos educativos y didácticos',
        code: 'EST-JUE',
        active: true,
      },
      {
        name: 'Armario de Mapas',
        description: 'Armario especial para almacenamiento de mapas',
        code: 'ARM-MAP',
        active: true,
      },
      {
        name: 'Estante Religioso',
        description: 'Estante dedicado a textos religiosos y biblias',
        code: 'EST-REL',
        active: true,
      },
      {
        name: 'Depósito',
        description: 'Área de almacenamiento temporal',
        code: 'DEP-01',
        active: true,
      },
      {
        name: 'En Reparación',
        description: 'Área para recursos en proceso de reparación',
        code: 'REP-01',
        active: true,
      },
    ];

    for (const locationData of basicLocations) {
      const existingByName = await this.locationRepository.findByName(locationData.name);
      const existingByCode = locationData.code 
        ? await this.locationRepository.findByCode(locationData.code)
        : null;

      if (!existingByName && !existingByCode) {
        await this.locationRepository.create(locationData);
        this.logger.log(`Created location: ${locationData.name}`);
      } else {
        this.logger.debug(`Location already exists: ${locationData.name}`);
      }
    }

    this.logger.log('Basic locations seeding completed');
  }

  /**
   * Verificar integridad de datos de recursos
   */
  async verifyResourceDataIntegrity(): Promise<{
    hasResourceTypes: boolean;
    hasResourceStates: boolean;
    hasBasicCategories: boolean;
    hasBasicLocations: boolean;
    resourceTypesCount: number;
    resourceStatesCount: number;
    categoriesCount: number;
    locationsCount: number;
  }> {
    const [resourceTypes, resourceStates, categories, locations] = await Promise.all([
      this.resourceTypeRepository.findAllActive(),
      this.resourceStateRepository.findAllActive(),
      this.categoryRepository.findAllActive(),
      this.locationRepository.findAllActive(),
    ]);

    return {
      hasResourceTypes: resourceTypes.length >= 4, // book, game, map, bible
      hasResourceStates: resourceStates.length >= 4, // good, deteriorated, damaged, lost
      hasBasicCategories: categories.length >= 5, // Al menos 5 categorías básicas
      hasBasicLocations: locations.length >= 3, // Al menos 3 ubicaciones básicas
      resourceTypesCount: resourceTypes.length,
      resourceStatesCount: resourceStates.length,
      categoriesCount: categories.length,
      locationsCount: locations.length,
    };
  }

  /**
   * Limpiar datos de recursos (solo para desarrollo/testing)
   */
  async clearResourceData(): Promise<void> {
    this.logger.warn('Clearing resource data...');

    try {
      await this.resourceTypeRepository.bulkDelete({});
      await this.resourceStateRepository.bulkDelete({});
      await this.categoryRepository.bulkDelete({});
      await this.locationRepository.bulkDelete({});

      this.logger.log('Resource data cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing resource data', error);
      throw error;
    }
  }
}