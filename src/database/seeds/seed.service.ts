// src/database/seeds/seed.service.ts - ACTUALIZADO con préstamos
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '@modules/user/repositories';
import { PersonRepository, PersonTypeRepository } from '@modules/person/repositories';
import { ResourceSeedService } from '@modules/resource/seeds/resource-seed.service';
import { LoanSeedService } from '@modules/loan/seeds/loan-seed.service'; // NUEVO
import { PasswordService } from '@shared/services';
import { LoggerService } from '@shared/services/logger.service';
import { Types } from 'mongoose';

/**
 * Servicio para sembrar datos iniciales - ACTUALIZADO
 * Ruta: src/database/seeds/seed.service.ts
 */

@Injectable()
export class SeedService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personRepository: PersonRepository,
    private readonly personTypeRepository: PersonTypeRepository,
    private readonly resourceSeedService: ResourceSeedService,
    private readonly loanSeedService: LoanSeedService, // NUEVO
    private readonly passwordService: PasswordService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('SeedService');
  }

  /**
   * Ejecutar todas las siembras iniciales
   */
  async seedAll(): Promise<void> {
    this.logger.log('Starting database seeding...');

    try {
      // Orden de siembra importante: dependencias primero
      await this.seedPersonTypes();
      await this.seedAdminUser();
      
      // Sembrar datos de recursos (tipos, estados, categorías, ubicaciones)
      await this.resourceSeedService.seedAll();
      
      // Sembrar datos de préstamos (estados de préstamos)
      await this.loanSeedService.seedAll(); // NUEVO

      this.logger.log('Database seeding completed successfully');
    } catch (error) {
      this.logger.error('Error during database seeding', error);
      throw error;
    }
  }

  /**
   * Sembrar tipos de persona iniciales
   */
  private async seedPersonTypes(): Promise<void> {
    this.logger.log('Seeding person types...');

    const personTypes = [
      {
        name: 'student' as const,
        description: 'Estudiante de la institución educativa',
        active: true,
      },
      {
        name: 'teacher' as const,
        description: 'Docente de la institución educativa',
        active: true,
      },
    ];

    for (const personTypeData of personTypes) {
      const existing = await this.personTypeRepository.findByName(personTypeData.name);

      if (!existing) {
        await this.personTypeRepository.create(personTypeData);
        this.logger.log(`Created person type: ${personTypeData.name}`);
      } else {
        this.logger.debug(`Person type already exists: ${personTypeData.name}`);
      }
    }

    this.logger.log('Person types seeding completed');
  }

  /**
   * Sembrar usuario administrador inicial
   */
  private async seedAdminUser(): Promise<void> {
    this.logger.log('Seeding admin user...');

    // Verificar si ya existe un administrador
    const hasAdmin = await this.userRepository.hasAdminUser();

    if (!hasAdmin) {
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL') || 'admin@biblioteca.edu.co';
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD') || 'Admin123!';

      const hashedPassword = await this.passwordService.hashPassword(adminPassword);

      const adminData = {
        email: adminEmail,
        password: hashedPassword,
        role: 'admin' as const,
        active: true,
      };

      await this.userRepository.create(adminData);

      this.logger.log(`Admin user created with email: ${adminEmail}`);
      this.logger.warn(
        `Default admin password: ${adminPassword} - Please change this immediately!`,
      );
    } else {
      this.logger.debug('Admin user already exists');
    }

    this.logger.log('Admin user seeding completed');
  }

  /**
   * Sembrar datos de desarrollo/prueba
   */
  async seedDevelopmentData(): Promise<void> {
    const environment = this.configService.get<string>('app.environment');

    if (environment !== 'development') {
      this.logger.warn('Development data seeding skipped - not in development environment');
      return;
    }

    this.logger.log('Seeding development data...');

    try {
      await this.seedTestUsers();
      await this.seedTestPeople();

      this.logger.log('Development data seeding completed');
    } catch (error) {
      this.logger.error('Error seeding development data', error);
      throw error;
    }
  }

  /**
   * Sembrar usuarios de prueba
   */
  private async seedTestUsers(): Promise<void> {
    const testUsers = [
      {
        email: 'bibliotecario@test.com',
        password: 'Test123!',
        role: 'librarian' as const,
      },
    ];

    for (const userData of testUsers) {
      const existing = await this.userRepository.findByEmail(userData.email);

      if (!existing) {
        const hashedPassword = await this.passwordService.hashPassword(userData.password);

        await this.userRepository.create({
          ...userData,
          password: hashedPassword,
          active: true,
        });

        this.logger.log(`Created test user: ${userData.email}`);
      }
    }
  }

  /**
   * Sembrar personas de prueba
   */
  private async seedTestPeople(): Promise<void> {
    const studentType = await this.personTypeRepository.getStudentType();
    const teacherType = await this.personTypeRepository.getTeacherType();

    if (!studentType || !teacherType) {
      this.logger.error('Person types not found, skipping test people seeding');
      return;
    }

    const testPeople = [
      {
        firstName: 'Juan',
        lastName: 'Pérez',
        documentNumber: '1000123456',
        grade: '10A',
        personTypeId: studentType._id,
      },
      {
        firstName: 'María',
        lastName: 'González',
        documentNumber: '1000654321',
        grade: '11B',
        personTypeId: studentType._id,
      },
      {
        firstName: 'Carlos',
        lastName: 'Rodríguez',
        documentNumber: '12345678',
        personTypeId: teacherType._id,
      },
      {
        firstName: 'Ana',
        lastName: 'Martínez',
        documentNumber: '87654321',
        personTypeId: teacherType._id,
      },
    ];

    for (const personData of testPeople) {
      const existing = personData.documentNumber
        ? await this.personRepository.findByDocumentNumber(personData.documentNumber)
        : null;

      if (!existing) {
        await this.personRepository.create({
          ...personData,
          active: true,
          personTypeId: new Types.ObjectId(),
        });

        this.logger.log(`Created test person: ${personData.firstName} ${personData.lastName}`);
      }
    }
  }

  /**
   * Limpiar todos los datos (solo para desarrollo/testing)
   */
  async clearAll(): Promise<void> {
    const environment = this.configService.get<string>('app.environment');

    if (environment === 'production') {
      throw new Error('Clear all data is not allowed in production environment');
    }

    this.logger.warn('Clearing all data...');

    try {
      // Orden de limpieza: dependientes primero
      await this.loanSeedService.clearLoanData(); // NUEVO
      await this.resourceSeedService.clearResourceData();
      await this.userRepository.bulkDelete({});
      await this.personRepository.bulkDelete({});
      await this.personTypeRepository.bulkDelete({});

      this.logger.log('All data cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing data', error);
      throw error;
    }
  }

  /**
   * Verificar la integridad de los datos básicos - ACTUALIZADO
   */
  async verifyDataIntegrity(): Promise<{
    hasAdmin: boolean;
    hasPersonTypes: boolean;
    hasResourceData: boolean;
    hasLoanData: boolean;
    personTypesCount: number;
    usersCount: number;
    peopleCount: number;
    resourceTypesCount: number;
    loanStatusesCount: number;
  }> {
    const [
      hasAdmin, 
      personTypes, 
      usersCount, 
      peopleCount,
      resourceIntegrity,
      loanIntegrity
    ] = await Promise.all([
      this.userRepository.hasAdminUser(),
      this.personTypeRepository.findAllActive(),
      this.userRepository.count({ active: true }),
      this.personRepository.count({ active: true }),
      this.resourceSeedService.verifyResourceDataIntegrity(),
      this.loanSeedService.verifyLoanDataIntegrity(), // NUEVO
    ]);

    return {
      hasAdmin,
      hasPersonTypes: personTypes.length >= 2,
      hasResourceData: resourceIntegrity.hasResourceTypes && resourceIntegrity.hasResourceStates,
      hasLoanData: loanIntegrity.hasLoanStatuses, // NUEVO
      personTypesCount: personTypes.length,
      usersCount,
      peopleCount,
      resourceTypesCount: resourceIntegrity.resourceTypesCount,
      loanStatusesCount: loanIntegrity.loanStatusesCount, // NUEVO
    };
  }
}