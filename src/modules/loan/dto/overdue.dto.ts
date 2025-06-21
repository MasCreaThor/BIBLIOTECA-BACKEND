// src/modules/loan/dto/overdue.dto.ts
import { IsOptional, IsString, IsNumber, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class OverdueSearchDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  personId?: string;

  @IsOptional()
  @IsString()
  resourceId?: string;

  @IsOptional()
  @IsString()
  dateFrom?: string;

  @IsOptional()
  @IsString()
  dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';

  @IsOptional()
  @IsString()
  personType?: 'student' | 'teacher';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  minDaysOverdue?: number;

  @IsOptional()
  @IsString()
  grade?: string;
}

export class OverdueResponseDto {
  _id!: string;
  personId!: string;
  resourceId!: string;
  dueDate!: Date;
  daysOverdue!: number;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  
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
    available: boolean;
    totalQuantity: number;
    currentLoansCount: number;
    availableQuantity: number;
    state?: {
      _id: string;
      name: string;
      description: string;
      color: string;
    };
    location?: {
      _id: string;
      name: string;
      description: string;
    };
  };
}

export class OverdueStatsDto {
  totalOverdue!: number;
  totalOverdueAmount!: number;
  averageDaysOverdue!: number;
  recentOverdue!: OverdueResponseDto[];
  byPersonType!: {
    students: number;
    teachers: number;
  };
  bySeverity!: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byDaysOverdue!: {
    '1-7': number;
    '8-14': number;
    '15-30': number;
    '30+': number;
  };
  byGrade?: Array<{
    grade: string;
    count: number;
  }>;
  oldestOverdue?: {
    daysOverdue: number;
    loan: OverdueResponseDto;
  } | null;
}