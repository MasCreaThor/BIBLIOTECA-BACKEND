import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from '@repositories/user.repository';
import { PersonRepository } from '@repositories/person.repository';
import { PersonTypeRepository } from '@repositories/person-type.repository';
import { PasswordService } from '@services/password.service';
import { LoggerService } from '@common/services/logger.service';
import { Types } from 'mongoose';

/**
 * Servicio para sembrar datos iniciales
 * Ruta: src/common/seeds/seed.service.ts
 */

@Injectable()
export class SeedService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly personRepository: PersonRepository,
    private readonly personTypeRepository: PersonTypeRepository,
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
      await this.seedPersonTypes();
      await this.seedAdminUser();

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
      const adminEmail = this.configService.get<string>('ADMIN_EMAIL');
      const adminPassword = this.configService.get<string>('ADMIN_PASSWORD');

      // Solo crear admin si están configuradas las variables de entorno
      if (adminEmail && adminPassword) {
        try {
          // Importar BootstrapService dinámicamente para evitar dependencias circulares
          const { BootstrapService } = await import('@services/bootstrap.service');
          const bootstrapService = new BootstrapService(
            this.userRepository,
            this.personTypeRepository,
            this.passwordService,
            this.configService,
            this.logger
          );

          await bootstrapService.createFirstAdmin({
            email: adminEmail,
            password: adminPassword
          });

          this.logger.log(`Admin user created with email: ${adminEmail}`);
          this.logger.warn('Please change the default admin password immediately!');
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
          this.logger.error(`Error creating admin user: ${errorMessage}`);
          this.logger.warn('Admin user creation skipped due to validation errors');
        }
      } else {
        this.logger.log('Admin credentials not configured in environment variables');
        this.logger.log('Use: npm run admin:init to create the first administrator');
      }
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
      // Por ahora solo seedear usuarios de prueba si es necesario
      // await this.seedTestUsers();
      
      // Comentado temporalmente - no necesitamos datos de personas de prueba
      // await this.seedTestPeople();

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
    const studentType = await this.personTypeRepository.getStudentType() as { _id: Types.ObjectId };
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
        personTypeId: studentType._id.toString(),
        active: true,
      },
    ];

    for (const personData of testPeople) {
      const existing = personData.documentNumber
        ? await this.personRepository.findByDocumentNumber(personData.documentNumber)
        : null;

      if (!existing) {
        await this.personRepository.create({ ...personData, personTypeId: new Types.ObjectId(personData.personTypeId) });

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
   * Verificar la integridad de los datos básicos
   */
  async verifyDataIntegrity(): Promise<{
    hasAdmin: boolean;
    hasPersonTypes: boolean;
    personTypesCount: number;
    usersCount: number;
    peopleCount: number;
  }> {
    const [hasAdmin, personTypes, usersCount, peopleCount] = await Promise.all([
      this.userRepository.hasAdminUser(),
      this.personTypeRepository.findAllActive(),
      this.userRepository.count({ active: true }),
      this.personRepository.count({ active: true }),
    ]);

    return {
      hasAdmin,
      hasPersonTypes: personTypes.length >= 2,
      personTypesCount: personTypes.length,
      usersCount,
      peopleCount,
    };
  }
}