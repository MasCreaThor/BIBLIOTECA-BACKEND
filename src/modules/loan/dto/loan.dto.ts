// src/modules/loan/dto/loan.dto.ts - ACTUALIZADO CON VALIDACIONES DE STOCK
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
 * ✅ ACTUALIZADO: DTO para crear un nuevo préstamo con validación de cantidad
 */
export class CreateLoanDto {
  @IsMongoId({ message: 'La persona debe ser un ID válido' })
  personId!: string;

  @IsMongoId({ message: 'El recurso debe ser un ID válido' })
  resourceId!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(50, { message: 'No se pueden prestar más de 50 unidades' }) // Aumentado para profesores
  @Type(() => Number)
  quantity?: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un string' })
  @MaxLength(500, { message: 'Las observaciones no deben exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  observations?: string;
}

/**
 * DTO para búsqueda y filtrado de préstamos (mantenido)
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
 * ✅ ACTUALIZADO: DTO de respuesta para préstamos con información de stock
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

  // Información poblada de persona
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

  // ✅ ACTUALIZADO: Información poblada de recurso con stock
  resource?: {
    _id: string;
    title: string;
    isbn?: string;
    author?: string;
    category?: string;
    available?: boolean;
    totalQuantity?: number;        // ✅ NUEVO
    currentLoansCount?: number;    // ✅ NUEVO
    availableQuantity?: number;    // ✅ NUEVO
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
 * DTO para actualizar un préstamo (mantenido)
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

/**
 * ✅ NUEVO: DTO para validación de disponibilidad de recurso
 */
export class ResourceAvailabilityDto {
  @IsMongoId({ message: 'El recurso debe ser un ID válido' })
  resourceId!: string;

  @IsOptional()
  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Type(() => Number)
  requestedQuantity?: number;
}

/**
 * ✅ NUEVO: DTO para obtener cantidad máxima por persona
 */
export class MaxQuantityForPersonDto {
  @IsMongoId({ message: 'La persona debe ser un ID válido' })
  personId!: string;

  @IsMongoId({ message: 'El recurso debe ser un ID válido' })
  resourceId!: string;
}

/**
 * ✅ NUEVO: DTO de respuesta para cantidad máxima por persona
 */
export class MaxQuantityForPersonResponseDto {
  maxQuantity!: number;
  reason!: string;
  personType!: string;
  resourceInfo!: {
    totalQuantity: number;
    currentLoans: number;
    availableQuantity: number;
  };
}

/**
 * ✅ NUEVO: DTO para validación previa de préstamo
 */
export class ValidateLoanDto {
  @IsMongoId({ message: 'La persona debe ser un ID válido' })
  personId!: string;

  @IsMongoId({ message: 'El recurso debe ser un ID válido' })
  resourceId!: string;

  @IsNumber({}, { message: 'La cantidad debe ser un número' })
  @Min(1, { message: 'La cantidad debe ser al menos 1' })
  @Max(50, { message: 'No se pueden prestar más de 50 unidades' })
  @Type(() => Number)
  quantity!: number;
}

/**
 * ✅ NUEVO: DTO de respuesta para validación de préstamo
 */
export class ValidateLoanResponseDto {
  isValid!: boolean;
  errors!: string[];
  warnings!: string[];
  
  personInfo!: {
    canBorrow: boolean;
    activeLoans: number;
    maxLoans: number;
    personType: string;
  };
  
  resourceInfo!: {
    available: boolean;
    totalQuantity: number;
    currentLoans: number;
    availableQuantity: number;
  };
  
  quantityInfo!: {
    requested: number;
    maxAllowed: number;
    reason: string;
  };
}

/**
 * ✅ NUEVO: DTO para estadísticas de stock
 */
export class StockStatisticsResponseDto {
  totalResources!: number;
  resourcesWithStock!: number;
  resourcesWithoutStock!: number;
  totalUnits!: number;
  loanedUnits!: number;
  availableUnits!: number;
  
  topLoanedResources!: Array<{
    resourceId: string;
    title: string;
    currentLoans: number;
    totalQuantity: number;
  }>;
  
  lowStockResources!: Array<{
    resourceId: string;
    title: string;
    availableQuantity: number;
    totalQuantity: number;
  }>;
}