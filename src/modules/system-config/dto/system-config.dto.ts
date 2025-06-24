import { IsString, IsOptional, IsBoolean, IsUrl, IsNotEmpty, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSystemConfigDto {
  @ApiProperty({
    description: 'Título del sidebar',
    example: 'Biblioteca Escolar',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sidebarTitle!: string;

  @ApiProperty({
    description: 'Subtítulo del sidebar',
    example: 'Sistema de Biblioteca',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sidebarSubtitle!: string;

  @ApiProperty({
    description: 'Nombre del icono de react-icons/fi',
    example: 'FiBook',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  sidebarIcon!: string;

  @ApiPropertyOptional({
    description: 'URL de imagen personalizada para el icono',
    example: 'https://example.com/icon.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.sidebarIconUrl !== '' && o.sidebarIconUrl !== null && o.sidebarIconUrl !== undefined)
  @IsUrl()
  @MaxLength(500)
  sidebarIconUrl?: string;

  @ApiPropertyOptional({
    description: 'Versión del sistema (se maneja automáticamente si no se proporciona)',
    example: '1.1.5',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la configuración',
    example: 'Configuración principal del sistema',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Imagen del icono/logo en base64 (data URL)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsOptional()
  @IsString()
  sidebarIconImage?: string;
}

export class UpdateSystemConfigDto {
  @ApiPropertyOptional({
    description: 'Título del sidebar',
    example: 'Biblioteca Escolar',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sidebarTitle?: string;

  @ApiPropertyOptional({
    description: 'Subtítulo del sidebar',
    example: 'Sistema de Biblioteca',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sidebarSubtitle?: string;

  @ApiPropertyOptional({
    description: 'Nombre del icono de react-icons/fi',
    example: 'FiBook',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  sidebarIcon?: string;

  @ApiPropertyOptional({
    description: 'URL de imagen personalizada para el icono',
    example: 'https://example.com/icon.png',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.sidebarIconUrl !== '' && o.sidebarIconUrl !== null && o.sidebarIconUrl !== undefined)
  @IsUrl()
  @MaxLength(500)
  sidebarIconUrl?: string;

  @ApiPropertyOptional({
    description: 'Versión del sistema (solo para desarrolladores)',
    example: '1.0.0',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  version?: string;

  @ApiPropertyOptional({
    description: 'Descripción de la configuración',
    example: 'Configuración principal del sistema',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @ApiPropertyOptional({
    description: 'Estado activo de la configuración',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Imagen del icono/logo en base64 (data URL)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  @IsOptional()
  @IsString()
  sidebarIconImage?: string;
}

export class SystemConfigResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  sidebarTitle!: string;

  @ApiProperty()
  sidebarSubtitle!: string;

  @ApiProperty()
  sidebarIcon!: string;

  @ApiPropertyOptional()
  sidebarIconUrl?: string;

  @ApiProperty()
  version!: string;

  @ApiProperty()
  active!: boolean;

  @ApiPropertyOptional()
  description?: string;

  @ApiProperty()
  lastUpdated!: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'Imagen del icono/logo en base64 (data URL)',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  sidebarIconImage?: string;
} 