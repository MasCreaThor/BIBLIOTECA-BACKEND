// src/common/seeds/admin-bootstrap.command.ts
import { NestFactory } from '@nestjs/core';
import { createInterface } from 'readline';
import { AppModule } from '../../app.module';
import { UserRepository } from '@modules/user/repositories';
import { PersonTypeRepository } from '@modules/person/repositories';
import { PasswordService } from '@shared/services';
import { LoggerService } from '@shared/services/logger.service';
import { ValidationUtils } from '@shared/utils';

interface AdminCredentials {
  email: string;
  password: string;
}

/**
 * Comando CLI simplificado para crear el primer administrador del sistema
 * No requiere BootstrapModule
 * 
 * Uso: npm run admin:init
 */
export class AdminBootstrapSimpleCommand {
  private userRepository!: UserRepository;
  private personTypeRepository!: PersonTypeRepository;
  private passwordService!: PasswordService;
  private logger!: LoggerService;

  async execute(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });

    this.userRepository = app.get(UserRepository);
    this.personTypeRepository = app.get(PersonTypeRepository);
    this.passwordService = app.get(PasswordService);
    this.logger = app.get(LoggerService);
    this.logger.setContext('AdminBootstrap');

    try {
      console.log('\n🔐 INICIALIZACIÓN DE ADMINISTRADOR DEL SISTEMA');
      console.log('===============================================\n');

      // Verificar si ya existe un administrador
      const hasAdmin = await this.userRepository.hasAdminUser();
      
      if (hasAdmin) {
        console.log('❌ Ya existe un administrador en el sistema.');
        console.log('   Si necesitas crear otro administrador, usa el panel de administración.');
        console.log('   O elimina todos los administradores de la base de datos.\n');
        await app.close();
        return;
      }

      console.log('ℹ️  No se encontró ningún administrador en el sistema.');
      console.log('   Vamos a crear el primer administrador.\n');

      const credentials = await this.promptForCredentials();
      
      if (await this.confirmCreation(credentials)) {
        await this.createAdminUser(credentials);
        console.log('\n✅ ¡Administrador creado exitosamente!');
        console.log(`   Email: ${credentials.email}`);
        console.log('   Ya puedes iniciar sesión en el sistema.\n');
        console.log('   Para iniciar el servidor ejecuta: npm run start:dev\n');
      } else {
        console.log('\n❌ Operación cancelada.\n');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('\n❌ Error durante la inicialización:', errorMessage);
      this.logger.error('Admin bootstrap failed', error);
    } finally {
      await app.close();
    }
  }

  private async promptForCredentials(): Promise<AdminCredentials> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (prompt: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(prompt, resolve);
      });
    };

    try {
      // Solicitar email
      let email: string;
      while (true) {
        email = await question('📧 Ingresa el email del administrador: ');
        
        if (!email.trim()) {
          console.log('❌ El email es requerido.\n');
          continue;
        }

        if (!ValidationUtils.isValidEmail(email)) {
          console.log('❌ El email no tiene un formato válido.\n');
          continue;
        }

        const existingUser = await this.userRepository.findByEmail(email);
        if (existingUser) {
          console.log('❌ Ya existe un usuario con este email.\n');
          continue;
        }

        break;
      }

      // Solicitar contraseña
      let password: string;
      while (true) {
        console.log('\n🔑 Ingresa la contraseña del administrador:');
        console.log('   Requisitos:');
        console.log('   - Mínimo 8 caracteres');
        console.log('   - Al menos una mayúscula (A-Z)');
        console.log('   - Al menos una minúscula (a-z)');
        console.log('   - Al menos un número (0-9)');
        console.log('   - Al menos un carácter especial (!@#$%^&*)\n');
        
        password = await question('Contraseña: ');
        
        if (!password.trim()) {
          console.log('❌ La contraseña es requerida.\n');
          continue;
        }

        const validation = this.passwordService.validatePasswordStrength(password);
        if (!validation.isValid) {
          console.log('❌ La contraseña no cumple los requisitos:');
          validation.errors.forEach((error: string) => console.log(`   - ${error}`));
          console.log('');
          continue;
        }

        const confirmPassword = await question('Confirmar contraseña: ');
        if (password !== confirmPassword) {
          console.log('❌ Las contraseñas no coinciden.\n');
          continue;
        }

        break;
      }

      return { email: email.trim(), password };

    } finally {
      rl.close();
    }
  }

  private async confirmCreation(credentials: AdminCredentials): Promise<boolean> {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    console.log('\n📋 RESUMEN DE LA CONFIGURACIÓN:');
    console.log(`   Email: ${credentials.email}`);
    console.log(`   Rol: Administrador`);
    console.log(`   Estado: Activo`);

    return new Promise((resolve) => {
      rl.question('\n¿Confirmas la creación del administrador? (s/N): ', (answer) => {
        rl.close();
        const confirmed = answer.toLowerCase() === 's' || answer.toLowerCase() === 'si' || answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
        resolve(confirmed);
      });
    });
  }

  private async createAdminUser(credentials: AdminCredentials): Promise<void> {
    console.log('\n⏳ Creando administrador...');
    
    // Crear tipos de persona si no existen
    await this.ensurePersonTypes();
    
    // Encriptar contraseña
    const hashedPassword = await this.passwordService.hashPassword(credentials.password);

    // Crear administrador
    const adminData = {
      email: credentials.email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'admin' as const,
      active: true,
    };

    await this.userRepository.create(adminData);
    
    // Log seguro (sin contraseña)
    this.logger.log(`First admin user created via CLI: ${credentials.email}`);
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

// Función principal
async function bootstrap() {
  try {
    const command = new AdminBootstrapSimpleCommand();
    await command.execute();
    process.exit(0);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    console.error('\n❌ Error ejecutando el comando:', errorMessage);
    process.exit(1);
  }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  bootstrap();
}