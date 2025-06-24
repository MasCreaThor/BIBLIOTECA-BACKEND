import { Controller, Post, Body, Get, Put, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from '@modules/auth/services';
import { LoggerService } from '@shared/services/logger.service';
import { LoginDto, LoginResponseDto, ChangePasswordDto, ForgotPasswordDto, ResetPasswordDto } from '@modules/auth/dto';
import { ApiResponseDto } from '@shared/dto/base.dto';
import { Public, CurrentUser, CurrentUserId } from '@shared/decorators/auth.decorators';
import { JwtUser } from '@shared/decorators/auth.decorators';

/**
 * Controlador de autenticación
 */

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('AuthController');
  }

  /**
   * Iniciar sesión
   * POST /api/auth/login
   */
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto): Promise<ApiResponseDto<LoginResponseDto>> {
    try {
      this.logger.log(`Login attempt for email: ${loginDto.email}`);

      const result = await this.authService.login(loginDto);

      return ApiResponseDto.success(result, 'Inicio de sesión exitoso', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Login failed for email: ${loginDto.email}`, error);
      throw error;
    }
  }

  /**
   * Obtener información del usuario actual
   * GET /api/auth/me
   */
  @Get('me')
  async getCurrentUser(@CurrentUserId() userId: string): Promise<ApiResponseDto<any>> {
    try {
      this.logger.debug(`Getting current user info for ID: ${userId}`);

      const user = await this.authService.getCurrentUser(userId);

      return ApiResponseDto.success(user, 'Usuario obtenido exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error getting current user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Solicitar recuperación de contraseña
   * POST /api/auth/forgot-password
   */
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<ApiResponseDto<any>> {
    try {
      this.logger.debug(`Password reset requested for email: ${forgotPasswordDto.email}`);

      await this.authService.forgotPassword(forgotPasswordDto);

      return ApiResponseDto.success(
        null, 
        'Si el email existe en nuestro sistema, recibirás un enlace de recuperación', 
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error(`Error in forgot password for email: ${forgotPasswordDto.email}`, error);
      throw error;
    }
  }

  /**
   * Restablecer contraseña con token
   * POST /api/auth/reset-password
   */
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<ApiResponseDto<any>> {
    try {
      this.logger.debug(`Password reset attempt with token: ${resetPasswordDto.token}`);

      await this.authService.resetPassword(resetPasswordDto);

      return ApiResponseDto.success(
        null, 
        'Contraseña restablecida exitosamente', 
        HttpStatus.OK
      );
    } catch (error) {
      this.logger.error(`Error in reset password with token: ${resetPasswordDto.token}`, error);
      throw error;
    }
  }

  /**
   * Cambiar contraseña
   * PUT /api/auth/change-password
   */
  @Put('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUserId() userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<ApiResponseDto<null>> {
    try {
      this.logger.log(`Password change request for user: ${userId}`);

      await this.authService.changePassword(userId, changePasswordDto);

      return ApiResponseDto.success(null, 'Contraseña cambiada exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error changing password for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Actualizar perfil del usuario actual
   * PUT /api/auth/profile
   */
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentUserId() userId: string,
    @Body() updateProfileDto: { firstName?: string; lastName?: string; email?: string },
  ): Promise<ApiResponseDto<any>> {
    try {
      this.logger.log(`Profile update request for user: ${userId}`);

      const updatedUser = await this.authService.updateProfile(userId, updateProfileDto);

      return ApiResponseDto.success(updatedUser, 'Perfil actualizado exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error updating profile for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Cerrar sesión
   * POST /api/auth/logout
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@CurrentUserId() userId: string): Promise<ApiResponseDto<null>> {
    try {
      this.logger.log(`Logout request for user: ${userId}`);

      await this.authService.logout(userId);

      return ApiResponseDto.success(null, 'Sesión cerrada exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error during logout for user: ${userId}`, error);
      throw error;
    }
  }

  /**
   * Validar token (para verificar si el token sigue siendo válido)
   * POST /api/auth/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateToken(@CurrentUser() user: JwtUser): Promise<ApiResponseDto<JwtUser>> {
    try {
      this.logger.debug(`Token validation for user: ${user.email}`);

      // Si llegamos aquí, el token es válido (gracias al AuthGuard)
      return ApiResponseDto.success(user, 'Token válido', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Token validation error for user: ${user.email}`, error);
      throw error;
    }
  }

  /**
   * Renovar token (para implementación futura)
   * POST /api/auth/refresh
   */
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refreshToken(
    @Body() body: { refreshToken: string },
  ): Promise<ApiResponseDto<{ access_token: string }>> {
    try {
      this.logger.log('Token refresh request');

      const result = await this.authService.refreshToken(body.refreshToken);

      return ApiResponseDto.success(result, 'Token renovado exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error refreshing token', error);
      throw error;
    }
  }
}
