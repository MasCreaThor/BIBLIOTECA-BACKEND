// src/modules/resource/dto/location/location.dto.ts
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';
export class CreateLocationDto {
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
    @IsString({ message: 'El código debe ser un string' })
    @MaxLength(20, { message: 'El código no debe exceder 20 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    code?: string;
  }
  
  export class UpdateLocationDto {
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
    @IsString({ message: 'El código debe ser un string' })
    @MaxLength(20, { message: 'El código no debe exceder 20 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    code?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'El estado activo debe ser un booleano' })
    active?: boolean;
  }
  
  export class LocationResponseDto {
    _id!: string;
    name!: string;
    description!: string;
    code?: string;
    active!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
  }