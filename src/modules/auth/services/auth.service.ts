import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserRepository } from "@modules/user/repositories";
import { PasswordService } from "@shared/services";
import { LoggerService } from '@shared/services/logger.service';
import { LoginDto, LoginResponseDto, ChangePasswordDto } from "@modules/auth/dto";
import { UserDocument } from "@modules/user/models";
import { JwtUser } from '@shared/decorators/auth.decorators';
import { UserRole } from '@shared/guards/roles.guard';

/**
 * Servicio de autenticación
 */

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
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
    return userWithoutPassword;
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