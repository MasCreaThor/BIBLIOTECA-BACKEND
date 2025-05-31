// src/services/bootstrap.service.ts
import { 
    Injectable, 
    ConflictException, 
    BadRequestException 
  } from '@nestjs/common';
  import { ConfigService } from '@nestjs/config';
  import { UserRepository } from '@repositories/user.repository';
  import { PersonTypeRepository } from '@repositories/person-type.repository';
  import { PasswordService } from './password.service';
  import { LoggerService } from '@common/services/logger.service';
  
  interface AdminCredentials {
    email: string;
    password: string;
  }
  
  interface BootstrapStatus {
    needsBootstrap: boolean;
    hasAdmin: boolean;
    hasPersonTypes: boolean;
    totalUsers: number;
    systemInitialized: boolean;
  }
  
  /**
   * Servicio para inicialización segura del sistema
   */
  @Injectable()
  export class BootstrapService {
    constructor(
      private readonly userRepository: UserRepository,
      private readonly personTypeRepository: PersonTypeRepository,
      private readonly passwordService: PasswordService,
      private readonly configService: ConfigService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('BootstrapService');
    }
  
    /**
     * Verificar si el sistema necesita inicialización
     */
    async needsBootstrap(): Promise<boolean> {
      const hasAdmin = await this.userRepository.hasAdminUser();
      return !hasAdmin;
    }
  
    /**
     * Obtener estado completo de inicialización
     */
    async getBootstrapStatus(): Promise<BootstrapStatus> {
      const [hasAdmin, hasPersonTypes, totalUsers] = await Promise.all([
        this.userRepository.hasAdminUser(),
        this.hasPersonTypes(),
        this.userRepository.count({}),
      ]);
  
      return {
        needsBootstrap: !hasAdmin,
        hasAdmin,
        hasPersonTypes,
        totalUsers,
        systemInitialized: hasAdmin && hasPersonTypes,
      };
    }
  
    /**
     * Crear el primer administrador del sistema
     */
    async createFirstAdmin(credentials: AdminCredentials): Promise<{
      message: string;
      adminEmail: string;
    }> {
      const { email, password } = credentials;
  
      try {
        // Verificar que el sistema necesite inicialización
        const needsBootstrap = await this.needsBootstrap();
        if (!needsBootstrap) {
          throw new BadRequestException('El sistema ya está inicializado');
        }
  
        // Verificar si el email ya existe (por seguridad extra)
        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
          throw new ConflictException('El email ya está registrado');
        }
  
        // Validar fortaleza de la contraseña
        const passwordValidation = this.passwordService.validatePasswordStrength(password);
        if (!passwordValidation.isValid) {
          throw new BadRequestException(
            `La contraseña no cumple los requisitos:\n${passwordValidation.errors.join('\n')}`
          );
        }
  
        // Crear tipos de persona si no existen
        await this.ensurePersonTypes();
  
        // Encriptar contraseña
        const hashedPassword = await this.passwordService.hashPassword(password);
  
        // Crear administrador
        const adminData = {
          email: email.toLowerCase().trim(),
          password: hashedPassword,
          role: 'admin' as const,
          active: true,
        };
  
        await this.userRepository.create(adminData);
  
        this.logger.log(`First admin user created via CLI: ${email}`);
  
        return {
          message: 'Primer administrador creado exitosamente',
          adminEmail: email,
        };
  
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException
        ) {
          throw error;
        }
  
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
        this.logger.error(`Error creating first admin: ${email}`, error);
        throw new BadRequestException('Error al crear el administrador');
      }
    }
  
    /**
     * Verificar si un email ya está registrado
     */
    async isEmailTaken(email: string): Promise<boolean> {
      const existingUser = await this.userRepository.findByEmail(email);
      return !!existingUser;
    }
  
    /**
     * Validar fortaleza de contraseña
     */
    validatePassword(password: string): { isValid: boolean; errors: string[] } {
      return this.passwordService.validatePasswordStrength(password);
    }
  
    /**
     * Verificar si existen los tipos de persona básicos
     */
    private async hasPersonTypes(): Promise<boolean> {
      const personTypes = await this.personTypeRepository.findAllActive();
      return personTypes.length >= 2; // student y teacher
    }
  
    /**
     * Asegurar que existan los tipos de persona básicos
     */
    private async ensurePersonTypes(): Promise<void> {
      const studentType = await this.personTypeRepository.findByName('student');
      if (!studentType) {
        await this.personTypeRepository.create({
          name: 'student',
          description: 'Estudiante de la institución educativa',
          active: true,
        });
        this.logger.log('Student person type created');
      }
  
      const teacherType = await this.personTypeRepository.findByName('teacher');
      if (!teacherType) {
        await this.personTypeRepository.create({
          name: 'teacher',
          description: 'Docente de la institución educativa',
          active: true,
        });
        this.logger.log('Teacher person type created');
      }
    }
  }