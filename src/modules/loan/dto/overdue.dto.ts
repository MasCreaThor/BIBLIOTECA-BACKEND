// src/modules/loan/dto/overdue.dto.ts
import {
    IsOptional,
    IsMongoId,
    IsNumber,
    Min,
    Max,
    IsEnum,
    IsDateString,
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  import { SearchDto } from '@shared/dto';
  import { LoanResponseDto } from './loan.dto';
  
  export class OverdueSearchDto extends SearchDto {
    @IsOptional()
    @IsMongoId({ message: 'La persona debe ser un ID válido' })
    personId?: string;
  
    @IsOptional()
    @IsEnum(['student', 'teacher'], { message: 'El tipo debe ser student o teacher' })
    personType?: 'student' | 'teacher';
  
    @IsOptional()
    @IsNumber({}, { message: 'Los días mínimos de retraso deben ser un número' })
    @Min(1, { message: 'Los días mínimos deben ser al menos 1' })
    @Max(365, { message: 'Los días mínimos no pueden exceder 365' })
    @Type(() => Number)
    minDaysOverdue?: number;
  
    @IsOptional()
    @IsDateString({}, { message: 'La fecha de vencimiento desde debe ser válida' })
    dueDateFrom?: string;
  
    @IsOptional()
    @IsDateString({}, { message: 'La fecha de vencimiento hasta debe ser válida' })
    dueDateTo?: string;
  
    @IsOptional()
    @Transform(({ value }: { value: string }) => value?.trim())
    grade?: string;
  }
  
  export class OverdueResponseDto extends LoanResponseDto {
    daysOverdue!: number;
    severity!: 'low' | 'medium' | 'high' | 'critical';
  }
  
  export class OverdueStatsDto {
    totalOverdue!: number;
    byPersonType!: {
      students: number;
      teachers: number;
    };
    bySeverity!: {
      low: number; // 1-7 días
      medium: number; // 8-15 días
      high: number; // 16-30 días
      critical: number; // 30+ días
    };
    byGrade!: Array<{
      grade: string;
      count: number;
    }>;
    oldestOverdue!: {
      daysOverdue: number;
      loan: LoanResponseDto;
    } | null;
  }