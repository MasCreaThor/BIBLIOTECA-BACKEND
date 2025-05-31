import {
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
  MinLength,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SearchDto } from './base.dto';

/**
 * DTOs para personas (estudiantes y docentes)
 * Ruta: src/common/dto/person.dto.ts
 */

export class CreatePersonDto {
  @IsString({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName!: string;

  @IsString({ message: 'El apellido es requerido' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El apellido no debe exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName!: string;

  @IsOptional()
  @IsString({ message: 'El número de documento debe ser un string' })
  @MaxLength(20, { message: 'El número de documento no debe exceder 20 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  documentNumber?: string;

  @IsOptional()
  @IsString({ message: 'El grado debe ser un string' })
  @MaxLength(50, { message: 'El grado no debe exceder 50 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  grade?: string;

  @IsMongoId({ message: 'El tipo de persona debe ser un ID válido' })
  personTypeId!: string;
}

export class UpdatePersonDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un string' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  firstName?: string;

  @IsOptional()
  @IsString({ message: 'El apellido debe ser un string' })
  @MinLength(2, { message: 'El apellido debe tener al menos 2 caracteres' })
  @MaxLength(100, { message: 'El apellido no debe exceder 100 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  lastName?: string;

  @IsOptional()
  @IsString({ message: 'El número de documento debe ser un string' })
  @MaxLength(20, { message: 'El número de documento no debe exceder 20 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  documentNumber?: string;

  @IsOptional()
  @IsString({ message: 'El grado debe ser un string' })
  @MaxLength(50, { message: 'El grado no debe exceder 50 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  grade?: string;

  @IsOptional()
  @IsMongoId({ message: 'El tipo de persona debe ser un ID válido' })
  personTypeId?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;
}

export class PersonSearchDto extends SearchDto {
  @IsOptional()
  @IsEnum(['student', 'teacher'], { message: 'El tipo debe ser student o teacher' })
  personType?: 'student' | 'teacher';

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  grade?: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }: { value: string }) => value?.trim())
  documentNumber?: string;
}

export class CreatePersonTypeDto {
  @IsEnum(['student', 'teacher'], { message: 'El nombre debe ser student o teacher' })
  name!: 'student' | 'teacher';

  @IsString({ message: 'La descripción es requerida' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description!: string;
}

export class UpdatePersonTypeDto {
  @IsOptional()
  @IsString({ message: 'La descripción debe ser un string' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  description?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;
}

export class PersonResponseDto {
  _id!: string;
  firstName!: string;
  lastName!: string;
  fullName!: string;
  documentNumber?: string;
  grade?: string;
  personTypeId!: string;
  personType?: {
    _id: string;
    name: string;
    description: string;
  };
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PersonTypeResponseDto {
  _id!: string;
  name!: string;
  description!: string;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
