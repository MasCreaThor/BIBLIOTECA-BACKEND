// src/modules/loan/dto/loan.dto.ts
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
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  import { SearchDto } from '@shared/dto';
  
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
  }
  
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
    };
    resource?: {
      _id: string;
      title: string;
      isbn?: string;
    };
    status?: {
      _id: string;
      name: string;
      description: string;
      color: string;
    };
  }