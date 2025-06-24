// src/modules/resource/dto/resource-type/resource-type.dto.ts
import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResourceTypeDto {
  @IsString({ message: 'El nombre del tipo es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no debe exceder 50 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  name!: string;

  @IsString({ message: 'La descripción es requerida' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description!: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano' })
  active?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado del sistema debe ser un valor booleano' })
  isSystem?: boolean;
}

export class UpdateResourceTypeDto {
  @IsOptional()
  @IsString({ message: 'El nombre del tipo debe ser un string' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(50, { message: 'El nombre no debe exceder 50 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  name?: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un string' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un valor booleano' })
  active?: boolean;

  @IsOptional()
  @IsBoolean({ message: 'El estado del sistema debe ser un valor booleano' })
  isSystem?: boolean;
}

export class ResourceTypeResponseDto {
  _id!: string;
  name!: string;
  description!: string;
  active!: boolean;
  isSystem!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}