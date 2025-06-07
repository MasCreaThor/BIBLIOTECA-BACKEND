// src/modules/resource/dto/author/author.dto.ts
import { IsString, IsOptional, IsBoolean, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateAuthorDto {
  @IsString({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name!: string;

  @IsOptional()
  @IsString({ message: 'La biografía debe ser un string' })
  @MaxLength(500, { message: 'La biografía no debe exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  biography?: string;
}

export class UpdateAuthorDto {
  @IsOptional()
  @IsString({ message: 'El nombre debe ser un string' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  name?: string;

  @IsOptional()
  @IsString({ message: 'La biografía debe ser un string' })
  @MaxLength(500, { message: 'La biografía no debe exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  biography?: string;

  @IsOptional()
  @IsBoolean({ message: 'El estado activo debe ser un booleano' })
  active?: boolean;
}

export class AuthorResponseDto {
  _id!: string;
  name!: string;
  biography?: string;
  active!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
