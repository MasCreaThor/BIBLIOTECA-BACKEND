// src/modules/resource/dto/resource-state/resource-state.dto.ts
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResourceStateDto {
  @IsEnum(['good', 'deteriorated', 'damaged', 'lost'], { 
    message: 'El estado debe ser: good, deteriorated, damaged o lost' 
  })
  name!: 'good' | 'deteriorated' | 'damaged' | 'lost';

  @IsString({ message: 'La descripción es requerida' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description!: string;

  @IsOptional()
  @IsString({ message: 'El color debe ser un string' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'El color debe ser un código hexadecimal válido'
  })
  color?: string;
}

export class UpdateResourceStateDto {
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un string' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsString({ message: 'El color debe ser un string' })
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'El color debe ser un código hexadecimal válido'
  })
  color?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;
}

export class ResourceStateResponseDto {
  _id!: string;
  name!: string;
  description!: string;
  color!: string;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}