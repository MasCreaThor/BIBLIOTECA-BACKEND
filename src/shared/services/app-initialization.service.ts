// ============================================================================
// 1. CREAR: src/shared/services/app-initialization.service.ts
// ============================================================================

import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/services/logger.service';
import { LoanSeedService } from '@modules/loan/seeds/loan-seed.service';
import { ResourceSeedService } from '@modules/resource/seeds/resource-seed.service';

@Injectable()
export class AppInitializationService implements OnModuleInit {
  constructor(
    private readonly loanSeedService: LoanSeedService,
    private readonly resourceSeedService: ResourceSeedService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AppInitialization');
  }

  /**
   * Se ejecuta automáticamente cuando el módulo se inicializa
   */
  async onModuleInit(): Promise<void> {
    // Solo ejecutar en desarrollo y producción, no en testing
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    
    if (nodeEnv === 'test') {
      this.logger.debug('Skipping auto-initialization in test environment');
      return;
    }

    this.logger.log('🚀 Starting automatic system initialization...');

    try {
      await this.initializeResourceSystem();
      await this.initializeLoanSystem();
      this.logger.log('✅ System initialization completed successfully');
    } catch (error) {
      this.logger.error('❌ Error during system initialization:', error);
      // No lanzar error para evitar que falle el arranque del servidor
      // Solo logear el error
    }
  }

  /**
   * Inicializar sistema de recursos (tipos, estados, categorías, ubicaciones)
   */
  private async initializeResourceSystem(): Promise<void> {
    this.logger.log('📚 Initializing resource system...');

    try {
      // Verificar integridad de datos de recursos
      const integrity = await this.resourceSeedService.verifyResourceDataIntegrity();

      if (integrity.hasResourceStates && integrity.hasResourceTypes && integrity.hasBasicCategories && integrity.hasBasicLocations) {
        this.logger.log(`✅ Resource system already initialized:`);
        this.logger.log(`   - Resource types: ${integrity.resourceTypesCount}`);
        this.logger.log(`   - Resource states: ${integrity.resourceStatesCount}`);
        this.logger.log(`   - Categories: ${integrity.categoriesCount}`);
        this.logger.log(`   - Locations: ${integrity.locationsCount}`);
        return;
      }

      this.logger.log('📦 Creating resource data...');
      await this.resourceSeedService.seedAll();
      
      // Verificar creación
      const newIntegrity = await this.resourceSeedService.verifyResourceDataIntegrity();
      this.logger.log(`✅ Resource system initialized successfully:`);
      this.logger.log(`   - Resource types: ${newIntegrity.resourceTypesCount}`);
      this.logger.log(`   - Resource states: ${newIntegrity.resourceStatesCount}`);
      this.logger.log(`   - Categories: ${newIntegrity.categoriesCount}`);
      this.logger.log(`   - Locations: ${newIntegrity.locationsCount}`);

    } catch (error) {
      this.logger.error('❌ Error initializing resource system:', error);
      throw error;
    }
  }

  /**
   * Inicializar sistema de préstamos
   */
  private async initializeLoanSystem(): Promise<void> {
    this.logger.log('🔧 Initializing loan system...');

    try {
      // Verificar integridad de datos de préstamos
      const integrity = await this.loanSeedService.verifyLoanDataIntegrity();

      if (integrity.hasLoanStatuses) {
        this.logger.log(`✅ Loan statuses already exist (${integrity.loanStatusesCount} statuses)`);
        return;
      }

      this.logger.log('📦 Creating loan statuses...');
      await this.loanSeedService.seedAll();
      
      // Verificar creación
      const newIntegrity = await this.loanSeedService.verifyLoanDataIntegrity();
      this.logger.log(`✅ Loan system initialized with ${newIntegrity.loanStatusesCount} statuses`);

    } catch (error) {
      this.logger.error('❌ Error initializing loan system:', error);
      throw error;
    }
  }
}