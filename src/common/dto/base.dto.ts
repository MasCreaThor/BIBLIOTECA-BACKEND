import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

/**
 * DTO base para parámetros de paginación
 */
export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}

/**
 * DTO base para búsquedas
 */
export class SearchDto extends PaginationDto {
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value?.trim())
  search?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  status?: string;
}

/**
 * DTO para respuestas de API
 */
export class ApiResponseDto<T = any> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;

  constructor(success: boolean, message: string, statusCode: number, data?: T, error?: string) {
    this.success = success;
    this.message = message;
    this.statusCode = statusCode;
    this.data = data;
    this.error = error;
  }

  static success<T>(data: T, message: string = 'Operación exitosa', statusCode: number = 200) {
    return new ApiResponseDto<T>(true, message, statusCode, data);
  }

  static error(error: string, message: string = 'Error en la operación', statusCode: number = 500) {
    return new ApiResponseDto(false, message, statusCode, undefined, error);
  }
}

/**
 * DTO para respuestas paginadas
 */
export class PaginatedResponseDto<T> {
  data: T[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };

  constructor(data: T[], total: number, page: number, limit: number) {
    this.data = data;
    this.pagination = {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNextPage: page < Math.ceil(total / limit),
      hasPrevPage: page > 1,
    };
  }
}

/**
 * DTO base con timestamps
 */
export class BaseEntityDto {
  @IsString()
  _id!: string;

  @Type(() => Date)
  createdAt!: Date;

  @Type(() => Date)
  updatedAt!: Date;
}

/**
 * DTO para validación de ObjectId de MongoDB
 */
export class ObjectIdDto {
  @IsString()
  @Transform(({ value }) => value?.toString())
  id!: string;
}
