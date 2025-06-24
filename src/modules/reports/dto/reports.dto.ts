import { IsOptional, IsString, IsEnum, IsArray, IsMongoId } from 'class-validator';
import { Transform } from 'class-transformer';

export enum LoanStatusFilter {
  ACTIVE = 'active',
  OVERDUE = 'overdue',
  RETURNED = 'returned',
  LOST = 'lost',
}

export class PersonLoansQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(LoanStatusFilter, { each: true })
  @Transform(({ value }) => Array.isArray(value) ? value : [value])
  status?: LoanStatusFilter[];

  @IsOptional()
  @IsString()
  year?: string;
}

export class UpdateLoanStatusDto {
  @IsMongoId()
  loanId!: string;

  @IsEnum(LoanStatusFilter)
  status!: LoanStatusFilter;

  @IsOptional()
  @IsString()
  observations?: string;
}

export class UpdateMultipleLoanStatusDto {
  @IsArray()
  @IsMongoId({ each: true })
  loanIds!: string[];

  @IsEnum(LoanStatusFilter)
  status!: LoanStatusFilter;

  @IsOptional()
  @IsString()
  observations?: string;
} 