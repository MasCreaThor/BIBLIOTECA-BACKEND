// ================================================================
// src/modules/loan/dto/loan.dto.ts - DTOs PRINCIPALES DE PRÉSTAMOS
// ================================================================

import {
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
  IsNumber,
  Min,
  Max,
  IsDateString,
  IsBoolean,
  IsEnum,
  ValidateNested,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SearchDto } from '@shared/dto';

/**
 * DTO para crear un nuevo préstamo
 */
export class CreateLoanDto {
  @IsMongoId({ message: 'La persona debe ser un ID válido' })
  personId!: string;

  @IsMongoId({ message: 'El recurso debe ser un ID válido' })
  resourceId!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(5, { message: 'No se pueden prestar más de 5 unidades' })
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un string' })
  @MaxLength(500, { message: 'Las observaciones no deben exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  observations?: string;
}

/**
 * DTO para búsqueda y filtrado de préstamos
 */
export class LoanSearchDto extends SearchDto {
  @IsOptional()
  @IsMongoId({ message: 'La persona debe ser un ID válido' })
  personId?: string;

  @IsOptional()
  @IsMongoId({ message: 'El recurso debe ser un ID válido' })
  resourceId?: string;

  @IsOptional()
  @IsMongoId({ message: 'El estado debe ser un ID válido' })
  statusId?: string;

  @IsOptional()
  @IsEnum(['active', 'returned', 'overdue', 'lost'], {
    message: 'El estado debe ser: active, returned, overdue o lost'
  })
  status?: 'active' | 'returned' | 'overdue' | 'lost';

  @IsOptional()
  @IsBoolean({ message: 'El filtro de vencidos debe ser un booleano' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isOverdue?: boolean;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de inicio debe ser válida' })
  dateFrom?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de fin debe ser válida' })
  dateTo?: string;

  @IsOptional()
  @IsMongoId({ message: 'El usuario que prestó debe ser un ID válido' })
  loanedBy?: string;

  @IsOptional()
  @IsMongoId({ message: 'El usuario que devolvió debe ser un ID válido' })
  returnedBy?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Los días de retraso deben ser un número' })
  @Min(0, { message: 'Los días de retraso no pueden ser negativos' })
  @Type(() => Number)
  daysOverdue?: number;

  @IsOptional()
  @IsBoolean({ message: 'El filtro de observaciones debe ser un booleano' })
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  hasObservations?: boolean;
}

/**
 * DTO de respuesta para préstamos
 */
export class LoanResponseDto {
  _id!: string;
  personId!: string;
  resourceId!: string;
  quantity!: number;
  loanDate!: Date;
  dueDate!: Date;
  returnedDate?: Date;
  statusId!: string;
  observations?: string;
  loanedBy!: string;
  returnedBy?: string;
  renewedBy?: string;
  renewedAt?: Date;
  daysOverdue?: number;
  isOverdue!: boolean;
  createdAt!: Date;
  updatedAt!: Date;

  // Información poblada
  person?: {
    _id: string;
    firstName: string;
    lastName: string;
    fullName: string;
    documentNumber?: string;
    grade?: string;
    personType?: {
      _id: string;
      name: string;
      description: string;
    };
  };

  resource?: {
    _id: string;
    title: string;
    isbn?: string;
    author?: string;
    category?: string;
    available?: boolean;
    state?: {
      _id: string;
      name: string;
      description: string;
      color: string;
    };
  };

  status?: {
    _id: string;
    name: string;
    description: string;
    color: string;
  };

  loanedByUser?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };

  returnedByUser?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };

  renewedByUser?: {
    _id: string;
    firstName: string;
    lastName: string;
    username: string;
  };
}

/**
 * DTO para actualizar un préstamo
 */
export class UpdateLoanDto {
  @IsOptional()
  @IsDateString({}, { message: 'La fecha de vencimiento debe ser válida' })
  dueDate?: string;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un string' })
  @MaxLength(500, { message: 'Las observaciones no deben exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  observations?: string;

  @IsOptional()
  @IsMongoId({ message: 'El estado debe ser un ID válido' })
  statusId?: string;
}