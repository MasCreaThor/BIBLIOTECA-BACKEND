// src/modules/resource/dto/category/category.dto.ts
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength, Matches } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateCategoryDto {
  @IsString({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

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

export class UpdateCategoryDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un string' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

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

export class CategoryResponseDto {
  _id!: string;
  name!: string;
  description!: string;
  color!: string;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}