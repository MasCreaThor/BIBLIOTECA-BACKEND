// src/modules/resource/dto/publisher/publisher.dto.ts
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreatePublisherDto {
    @IsString({ message: 'El nombre es requerido' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name!: string;
  
    @IsOptional()
    @IsString({ message: 'La descripción debe ser un string' })
    @MaxLength(300, { message: 'La descripción no debe exceder 300 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description?: string;
  }
  
  export class UpdatePublisherDto {
    @IsOptional()
    @IsString({ message: 'El nombre debe ser un string' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name?: string;
  
    @IsOptional()
    @IsString({ message: 'La descripción debe ser un string' })
    @MaxLength(300, { message: 'La descripción no debe exceder 300 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'El estado activo debe ser un booleano' })
    active?: boolean;
  }
  
  export class PublisherResponseDto {
    _id!: string;
    name!: string;
    description?: string;
    active!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
  }
  