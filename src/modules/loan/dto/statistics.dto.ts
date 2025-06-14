// ================================================================
// CORRECCIÓN 2: src/modules/loan/dto/statistics.dto.ts
// ================================================================

import {
    IsOptional,
    IsEnum,
    IsDateString,
    IsBoolean,
  } from 'class-validator';
  import { Transform } from 'class-transformer';
  
  export class LoanStatsRequestDto {
    @IsOptional()
    @IsEnum(['today', 'week', 'month', 'quarter', 'year'], {
      message: 'El período debe ser: today, week, month, quarter o year'
    })
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  
    @IsOptional()
    @IsDateString({}, { message: 'La fecha de inicio debe ser válida' })
    startDate?: string;
  
    @IsOptional()
    @IsDateString({}, { message: 'La fecha de fin debe ser válida' })
    endDate?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'Incluir tendencias debe ser un booleano' })
    @Transform(({ value }: { value: any }) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    })
    includeTrends?: boolean;
  
    @IsOptional()
    @IsBoolean({ message: 'Incluir detalles debe ser un booleano' })
    @Transform(({ value }: { value: any }) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    })
    includeDetails?: boolean;
  }
  
  export class LoanStatsResponseDto {
    totalLoans!: number;
    activeLoans!: number;
    overdueLoans!: number;
    returnedLoans!: number;
    lostResources!: number;
    averageLoanDuration!: number;
    onTimeReturnRate!: number;
    overdueRate!: number;
  
    periodStats!: {
      period: string;
      dateRange: {
        start: string;
        end: string;
      };
      newLoans: number;
      returnedLoans: number;
      overdueLoans: number;
      lostResources: number;
    };
  
    comparison?: {
      previousPeriod: {
        newLoans: number;
        returnedLoans: number;
        changePercentage: number;
      };
    };
  
    topResources!: Array<{
      resourceId: string;
      title: string;
      author?: string;
      borrowCount: number;
      category?: string;
    }>;
  
    topBorrowers!: Array<{
      personId: string;
      fullName: string;
      borrowCount: number;
      activeLoans: number;
      overdueLoans: number;
    }>;
  
    statusDistribution!: Array<{
      status: string;
      count: number;
      percentage: number;
      color: string;
    }>;
  
    monthlyTrends?: Array<{
      month: string;
      year: number;
      newLoans: number;
      returnedLoans: number;
      overdueLoans: number;
    }>;
  }