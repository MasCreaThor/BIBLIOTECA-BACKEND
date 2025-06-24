// ================================================================
// CORRECCIÓN 3: src/modules/loan/dto/validation.dto.ts
// ================================================================

import {
    IsMongoId,
    IsOptional,
    IsBoolean,
  } from 'class-validator';
  import { Transform } from 'class-transformer';
  
  export class CanBorrowRequestDto {
    @IsMongoId({ message: 'El ID de la persona debe ser válido' })
    personId!: string;
  
    @IsOptional()
    @IsBoolean({ message: 'Incluir detalles debe ser un booleano' })
    @Transform(({ value }: { value: any }) => {
      if (value === 'true') return true;
      if (value === 'false') return false;
      return value;
    })
    includeDetails?: boolean;
  }
  
  export class CanBorrowResponseDto {
    canBorrow!: boolean;
    reason?: string;
    overdueCount?: number;
    activeCount?: number;
    maxLoansAllowed?: number;
  
    restrictions?: {
      hasOverdueLoans: boolean;
      hasReachedLimit: boolean;
      isPersonActive: boolean;
      hasActivePenalties: boolean;
    };
  
    currentLoans?: Array<{
      _id: string;
      resourceTitle: string;
      dueDate: Date;
      isOverdue: boolean;
      daysOverdue?: number;
    }>;
  
    upcomingDueDates?: Array<{
      _id: string;
      resourceTitle: string;
      dueDate: Date;
      daysUntilDue: number;
    }>;
  }
  
  export class ResourceAvailabilityRequestDto {
    @IsMongoId({ message: 'El ID del recurso debe ser válido' })
    resourceId!: string;
  }
  
  export class ResourceAvailabilityResponseDto {
    available!: boolean;
    reason?: string;
    
    resource?: {
      _id: string;
      title: string;
      author?: string;
      isbn?: string;
      currentStatus: string;
    };
  
    currentLoan?: {
      _id: string;
      personName: string;
      loanDate: Date;
      dueDate: Date;
      isOverdue: boolean;
    };
  }