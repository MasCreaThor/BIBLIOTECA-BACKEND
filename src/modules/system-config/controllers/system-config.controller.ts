import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiConsumes,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { SystemConfigService } from '@modules/system-config/services';
import {
  CreateSystemConfigDto,
  UpdateSystemConfigDto,
  SystemConfigResponseDto,
} from '@modules/system-config/dto';
import { AuthGuard } from '@shared/guards/auth.guard';
import { RolesGuard } from '@shared/guards/roles.guard';
import { Roles } from '@shared/decorators/auth.decorators';
import { UserRole } from '@shared/guards/roles.guard';

@ApiTags('System Configuration')
@Controller('system-config')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class SystemConfigController {
  constructor(private readonly systemConfigService: SystemConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener configuración activa del sistema',
    description: 'Retorna la configuración activa del sistema para el sidebar',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración obtenida exitosamente',
    type: SystemConfigResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró configuración activa',
  })
  async getActiveConfig(): Promise<SystemConfigResponseDto> {
    return this.systemConfigService.getActiveConfig();
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Crear nueva configuración del sistema',
    description: 'Crea una nueva configuración del sistema y la activa',
  })
  @ApiResponse({
    status: 201,
    description: 'Configuración creada exitosamente',
    type: SystemConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requieren permisos de administrador',
  })
  async createConfig(
    @Body() createDto: CreateSystemConfigDto,
  ): Promise<SystemConfigResponseDto> {
    return this.systemConfigService.createConfig(createDto);
  }

  @Post('upload-logo')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('logo'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Subir logo/imagen del sistema',
    description: 'Sube una imagen para usar como logo del sistema (máx 2MB, sugerido 100x100px)',
  })
  @ApiResponse({
    status: 200,
    description: 'Logo subido exitosamente',
    type: SystemConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Archivo inválido o demasiado grande',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requieren permisos de administrador',
  })
  async uploadLogo(@UploadedFile() file: Express.Multer.File): Promise<SystemConfigResponseDto> {
    if (!file) {
      throw new BadRequestException('No se proporcionó ningún archivo');
    }

    // Validar tipo de archivo
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Solo se permiten archivos de imagen (JPEG, PNG, GIF, WebP)');
    }

    // Validar tamaño (2MB = 2 * 1024 * 1024 bytes)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('El archivo es demasiado grande. Máximo 2MB permitido');
    }

    return this.systemConfigService.uploadLogo(file);
  }

  @Put()
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Actualizar configuración del sistema',
    description: 'Actualiza la configuración activa del sistema',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración actualizada exitosamente',
    type: SystemConfigResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Datos de entrada inválidos',
  })
  @ApiResponse({
    status: 404,
    description: 'No se encontró configuración activa',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requieren permisos de administrador',
  })
  async updateConfig(
    @Body() updateDto: UpdateSystemConfigDto,
  ): Promise<SystemConfigResponseDto> {
    return this.systemConfigService.updateConfig(updateDto);
  }

  @Get('history')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Obtener historial de configuraciones',
    description: 'Retorna el historial de configuraciones del sistema',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Número máximo de configuraciones a retornar (por defecto: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Historial obtenido exitosamente',
    type: [SystemConfigResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requieren permisos de administrador',
  })
  async getConfigHistory(
    @Query('limit') limit?: number,
  ): Promise<SystemConfigResponseDto[]> {
    return this.systemConfigService.getConfigHistory(limit);
  }

  @Post('restore/:id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Restaurar configuración anterior',
    description: 'Restaura una configuración anterior como la configuración activa',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuración restaurada exitosamente',
    type: SystemConfigResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Configuración no encontrada',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requieren permisos de administrador',
  })
  async restoreConfig(
    @Param('id') configId: string,
  ): Promise<SystemConfigResponseDto> {
    return this.systemConfigService.restoreConfig(configId);
  }

  @Post('cleanup')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Limpiar configuraciones duplicadas',
    description: 'Limpia registros duplicados y mantiene solo una configuración activa',
  })
  @ApiResponse({
    status: 200,
    description: 'Configuraciones duplicadas limpiadas exitosamente',
  })
  @ApiResponse({
    status: 403,
    description: 'Acceso denegado - Se requieren permisos de administrador',
  })
  async cleanupDuplicateConfigs(): Promise<{ message: string }> {
    await this.systemConfigService.cleanupDuplicateConfigs();
    return { message: 'Configuraciones duplicadas limpiadas exitosamente' };
  }
} 