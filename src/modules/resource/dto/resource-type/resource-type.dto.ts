// src/modules/resource/dto/resource-type/resource-type.dto.ts
import { IsString, IsOptional, IsBoolean, IsEnum, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateResourceTypeDto {
  @IsEnum(['book', 'game', 'map', 'bible'], { 
    message: 'El tipo debe ser: book, game, map o bible' 
  })
  name!: 'book' | 'game' | 'map' | 'bible';

  @IsString({ message: 'La descripción es requerida' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description!: string;
}

export class UpdateResourceTypeDto {
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un string' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;
}

export class ResourceTypeResponseDto {
  _id!: string;
  name!: string;
  description!: string;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}