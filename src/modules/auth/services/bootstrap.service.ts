// src/modules/auth/services/bootstrap.service.ts
import { Injectable } from '@nestjs/common';
import { UserRepository } from '@modules/user/repositories';
import { LoggerService } from '@shared/services/logger.service';

/**
 * Servicio para migración de usuarios existentes
 */
@Injectable()
export class BootstrapService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('BootstrapService');
  }

  /**
   * Actualizar usuarios existentes con campos firstName y lastName
   */
  async updateExistingUsers(): Promise<void> {
    try {
      this.logger.log('Iniciando actualización de usuarios existentes...');

      // Obtener todos los usuarios
      const users = await this.userRepository.findAll();
      
      let updatedCount = 0;

      for (const user of users) {
        // Verificar si el usuario ya tiene firstName y lastName
        if (!user.firstName || !user.lastName) {
          // Extraer nombre del email como fallback
          const emailParts = user.email.split('@')[0].split('.');
          const firstName = emailParts[0] || 'Usuario';
          const lastName = emailParts[1] || 'Sistema';

          // Actualizar usuario
          await this.userRepository.update((user._id as any).toString(), {
            firstName: firstName.charAt(0).toUpperCase() + firstName.slice(1),
            lastName: lastName.charAt(0).toUpperCase() + lastName.slice(1),
          });

          updatedCount++;
          this.logger.log(`Usuario actualizado: ${user.email} -> ${firstName} ${lastName}`);
        }
      }

      this.logger.log(`Actualización completada. ${updatedCount} usuarios actualizados.`);
    } catch (error) {
      this.logger.error('Error actualizando usuarios existentes:', error);
      throw error;
    }
  }

  /**
   * Actualizar un usuario específico con firstName y lastName
   */
  async updateUserWithNames(userId: string, firstName: string, lastName: string): Promise<void> {
    try {
      await this.userRepository.update(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      
      this.logger.log(`Usuario ${userId} actualizado con nombres: ${firstName} ${lastName}`);
    } catch (error) {
      this.logger.error(`Error actualizando usuario ${userId}:`, error);
      throw error;
    }
  }
}