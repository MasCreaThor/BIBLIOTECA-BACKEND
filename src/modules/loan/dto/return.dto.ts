// ================================================================
// CORRECCIÓN 1: src/modules/loan/dto/return.dto.ts
// ================================================================

import {
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { LoanResponseDto } from './loan.dto';

export class ReturnLoanDto {
  @IsMongoId({ message: 'El ID del préstamo debe ser válido' })
  loanId!: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha de devolución debe ser válida' })
  returnDate?: string;

  @IsOptional()
  @IsEnum(['good', 'deteriorated', 'damaged', 'lost'], {
    message: 'El estado del recurso debe ser: good, deteriorated, damaged o lost'
  })
  resourceCondition?: 'good' | 'deteriorated' | 'damaged' | 'lost';

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser un string' })
  @MaxLength(500, { message: 'Las observaciones no deben exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  returnObservations?: string;
}

export class ReturnResponseDto {
  loan!: LoanResponseDto;
  daysOverdue!: number;
  wasOverdue!: boolean;
  resourceConditionChanged!: boolean;
  message!: string;

  penalties?: {
    hasLateReturnPenalty: boolean;
    penaltyDays?: number;
    penaltyAmount?: number;
    description?: string;
  };

  resourceCondition?: {
    previousCondition: string;
    newCondition: string;
    requiresAction: boolean;
    suggestedAction?: string;
  };
}

export class RenewLoanDto {
  @IsNumber({}, { message: 'Los días adicionales deben ser un número' })
  @Min(1, { message: 'Los días adicionales deben ser al menos 1' })
  @Max(30, { message: 'No se pueden agregar más de 30 días' })
  @Type(() => Number)
  additionalDays!: number;

  @IsOptional()
  @IsString({ message: 'La razón debe ser un string' })
  @MaxLength(200, { message: 'La razón no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  reason?: string;
}

export class MarkLostDto {
  @IsString({ message: 'Las observaciones son requeridas' })
  @MaxLength(500, { message: 'Las observaciones no deben exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  observations!: string;

  @IsOptional()
  @IsString({ message: 'La descripción debe ser un string' })
  @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
  lostDescription?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El costo estimado debe ser un número' })
  @Min(0, { message: 'El costo estimado no puede ser negativo' })
  estimatedCost?: number;
}

export class BatchReturnDto {
  @IsArray({ message: 'Las devoluciones deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => ReturnLoanDto)
  returns!: ReturnLoanDto[];

  @IsOptional()
  @IsString({ message: 'Las observaciones generales deben ser un string' })
  @MaxLength(200, { message: 'Las observaciones generales no deben exceder 200 caracteres' })
  generalObservations?: string;
}

export class BatchReturnResponseDto {
  successCount!: number;
  errorCount!: number;
  
  results!: Array<{
    loanId: string;
    success: boolean;
    result?: ReturnResponseDto;
    error?: string;
  }>;

  summary!: {
    totalProcessed: number;
    onTimeReturns: number;
    lateReturns: number;
    totalLateDays: number;
    resourceIssues: number;
  };
}