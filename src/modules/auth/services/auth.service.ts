import { Injectable, UnauthorizedException, BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from "@modules/user/repositories";
import { PasswordService } from "@shared/services/password.service";
import { EmailService } from '@shared/services/email.service';
import { LoggerService } from '@shared/services/logger.service';
import { LoginDto, LoginResponseDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from "@modules/auth/dto";
import { UserDocument } from "@modules/user/models/user.model";
import { JwtUser } from '@shared/decorators/auth.decorators';
import { UserRole } from '@shared/guards/roles.guard';
import { PasswordResetTokenRepository } from '../repositories/password-reset-token.repository';
import { randomBytes } from 'crypto';

/**
 * Servicio de autenticación
 */

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
    private readonly passwordService: PasswordService,
    private readonly emailService: EmailService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthService');
  }

  /**
   * Autenticar usuario con email y contraseña
   */
  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const { email, password } = loginDto;

    try {
      // Buscar usuario por email incluyendo password
      const user = await this.userRepository.findByEmailWithPassword(email);

      if (!user) {
        this.logger.warn(`Login attempt failed for email: ${email} - User not found`);
        throw new UnauthorizedException('Credenciales inválidas');
      }

      if (!user.active) {
        this.logger.warn(`Login attempt failed for email: ${email} - User inactive`);
        throw new UnauthorizedException('Usuario inactivo');
      }

      // Verificar contraseña
      const isPasswordValid = await this.passwordService.verifyPassword(password, user.password);

      if (!isPasswordValid) {
        this.logger.warn(`Login attempt failed for email: ${email} - Invalid password`);
        throw new UnauthorizedException('Credenciales inválidas');
      }

      // Actualizar último login - CORREGIDO: Simplificado
      const userId = (user as any)._id.toString();
      await this.userRepository.updateLastLogin(userId);

      // Generar JWT - CORREGIDO: Simplificado
      const payload: JwtUser = {
        sub: userId,
        id: userId,
        email: user.email,
        role: user.role === 'admin' ? UserRole.ADMIN : UserRole.LIBRARIAN,
      };

      const accessToken = await this.jwtService.signAsync(payload);

      this.logger.log(`User ${email} logged in successfully`);

      return {
        access_token: accessToken,
        user: {
          id: userId,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          lastLogin: new Date(),
        },
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Login error for email: ${email}`, error);
      throw new UnauthorizedException('Error en el proceso de autenticación');
    }
  }

  /**
   * Validar token JWT y obtener usuario
   */
  async validateToken(token: string): Promise<JwtUser> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtUser>(token);

      // Verificar que el usuario aún existe y está activo
      const user = await this.userRepository.findById(payload.sub || payload.id);

      if (!user || !user.active) {
        throw new UnauthorizedException('Usuario inválido o inactivo');
      }

      return payload;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Token validation failed: ${errorMessage}`);
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /**
   * Obtener información del usuario actual
   */
  async getCurrentUser(userId: string): Promise<Partial<UserDocument>> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    // Excluir password de la respuesta
    const { password, ...userWithoutPassword } = user.toObject();
    
    // Log simple para debug
    this.logger.debug(`User data for ID ${userId}: firstName=${userWithoutPassword.firstName}, lastName=${userWithoutPassword.lastName}`);
    
    return userWithoutPassword;
  }

  /**
   * Solicitar recuperación de contraseña
   */
  async forgotPassword(forgotPasswordDto: ForgotPasswordDto): Promise<void> {
    const { email } = forgotPasswordDto;

    try {
      // Buscar usuario
      const user = await this.userRepository.findByEmail(email);

      if (!user || !user.active) {
        // No revelar si el usuario existe o no por seguridad
        this.logger.debug(`Password reset requested for non-existent or inactive user: ${email}`);
        return;
      }

      // Generar token único
      const token = randomBytes(32).toString('hex');

      // Eliminar tokens anteriores del usuario
      await this.passwordResetTokenRepository.deleteUserTokens((user._id as any).toString());

      // Crear nuevo token
      await this.passwordResetTokenRepository.createToken((user._id as any).toString(), token);

      // Generar enlace de recuperación
      const frontendUrl = this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3001';
      const resetLink = `${frontendUrl}/reset-password?token=${token}`;

      // Generar template de email
      const htmlContent = this.emailService.generatePasswordResetTemplate(
        user.firstName || user.email.split('@')[0],
        resetLink
      );

      // Enviar email
      const emailSent = await this.emailService.sendEmail({
        to: user.email,
        subject: 'Recuperación de Contraseña - Biblioteca Escolar',
        html: htmlContent,
      });

      if (emailSent) {
        this.logger.log(`Password reset email sent to: ${email}`);
      } else {
        this.logger.error(`Failed to send password reset email to: ${email}`);
        throw new BadRequestException('Error al enviar el email de recuperación');
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error in forgot password for email: ${email}`, error);
      throw new BadRequestException('Error en el proceso de recuperación');
    }
  }

  /**
   * Restablecer contraseña con token
   */
  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    try {
      // Buscar token válido
      const resetToken = await this.passwordResetTokenRepository.findByToken(token);

      if (!resetToken) {
        throw new BadRequestException('Token inválido o expirado');
      }

      // Buscar usuario
      const user = await this.userRepository.findById(resetToken.userId.toString());

      if (!user || !user.active) {
        throw new BadRequestException('Usuario no encontrado o inactivo');
      }

      // Validar nueva contraseña
      const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new BadRequestException(passwordValidation.errors.join('. '));
      }

      // Verificar que la nueva contraseña sea diferente a la actual
      const userWithPassword = await this.userRepository.findByEmailWithPassword(user.email);
      if (userWithPassword) {
        const isSamePassword = await this.passwordService.verifyPassword(newPassword, userWithPassword.password);
        if (isSamePassword) {
          throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
        }
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await this.passwordService.hashPassword(newPassword);

      // Actualizar contraseña
      await this.userRepository.updatePassword((user._id as any).toString(), hashedNewPassword);

      // Marcar token como usado
      await this.passwordResetTokenRepository.markAsUsed(token);

      this.logger.log(`Password reset successfully for user: ${user.email}`);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error in reset password with token: ${token}`, error);
      throw new BadRequestException('Error al restablecer la contraseña');
    }
  }

  /**
   * Actualizar perfil del usuario actual
   */
  async updateProfile(userId: string, updateData: { firstName?: string; lastName?: string; email?: string }): Promise<Partial<UserDocument>> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    try {
      const updateFields: any = {};

      // Actualizar firstName si se proporciona
      if (updateData.firstName) {
        updateFields.firstName = updateData.firstName.trim();
      }

      // Actualizar lastName si se proporciona
      if (updateData.lastName) {
        updateFields.lastName = updateData.lastName.trim();
      }

      // Actualizar email si se proporciona
      if (updateData.email && updateData.email !== user.email) {
        const emailExists = await this.userRepository.findByEmail(updateData.email);
        if (emailExists) {
          throw new ConflictException('El email ya está registrado');
        }
        updateFields.email = updateData.email.toLowerCase().trim();
      }

      // Solo actualizar si hay campos para actualizar
      if (Object.keys(updateFields).length > 0) {
        const updatedUser = await this.userRepository.update(userId, updateFields);
        if (!updatedUser) {
          throw new UnauthorizedException('Error al actualizar el perfil');
        }

        // Excluir password de la respuesta
        const { password, ...userWithoutPassword } = updatedUser.toObject();
        return userWithoutPassword;
      }

      // Si no hay campos para actualizar, retornar usuario actual
      const { password, ...userWithoutPassword } = user.toObject();
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      this.logger.error(`Error updating profile for user: ${userId}`, error);
      throw new BadRequestException('Error al actualizar el perfil');
    }
  }

  /**
   * Cambiar contraseña del usuario
   */
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    try {
      // Buscar usuario con password
      const user = await this.userRepository.findByEmailWithPassword(
        (await this.userRepository.findById(userId))?.email || '',
      );

      if (!user) {
        throw new UnauthorizedException('Usuario no encontrado');
      }

      // Verificar contraseña actual
      const isCurrentPasswordValid = await this.passwordService.verifyPassword(
        currentPassword,
        user.password,
      );

      if (!isCurrentPasswordValid) {
        throw new BadRequestException('La contraseña actual es incorrecta');
      }

      // Validar nueva contraseña
      const passwordValidation = this.passwordService.validatePasswordStrength(newPassword);
      if (!passwordValidation.isValid) {
        throw new BadRequestException(passwordValidation.errors.join('. '));
      }

      // Verificar que la nueva contraseña sea diferente
      const isSamePassword = await this.passwordService.verifyPassword(newPassword, user.password);
      if (isSamePassword) {
        throw new BadRequestException('La nueva contraseña debe ser diferente a la actual');
      }

      // Encriptar nueva contraseña
      const hashedNewPassword = await this.passwordService.hashPassword(newPassword);

      // Actualizar contraseña
      await this.userRepository.updatePassword(userId, hashedNewPassword);

      this.logger.log(`Password changed successfully for user: ${user.email}`);
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.error(`Error changing password for user: ${userId}`, error);
      throw new BadRequestException('Error al cambiar la contraseña');
    }
  }

  /**
   * Logout (invalidar token - para implementación futura con blacklist)
   */
  async logout(userId: string): Promise<void> {
    // Actualizar información de logout si es necesario
    this.logger.log(`User ${userId} logged out`);

    // Aquí se podría implementar una blacklist de tokens
    // o marcar el último logout en la base de datos
  }

  /**
   * Refresh token (para implementación futura)
   */
  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    // Implementación futura para refresh tokens
    throw new BadRequestException('Refresh token functionality not implemented yet');
  }

  /**
   * Verificar si un usuario puede acceder a un recurso específico
   */
  async canAccess(userId: string, requiredRole: UserRole): Promise<boolean> {
    const user = await this.userRepository.findById(userId);

    if (!user || !user.active) {
      return false;
    }

    // Admin puede acceder a todo
    if (user.role === 'admin') {
      return true;
    }

    const userRole = UserRole.LIBRARIAN;

    return userRole === requiredRole;
  }
}