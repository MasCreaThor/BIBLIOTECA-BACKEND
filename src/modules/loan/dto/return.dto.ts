// src/modules/loan/dto/return.dto.ts
import {
    IsString,
    IsOptional,
    IsMongoId,
    MaxLength,
    IsEnum,
    IsDateString,
  } from 'class-validator';
  import { Transform } from 'class-transformer';
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
  }
  