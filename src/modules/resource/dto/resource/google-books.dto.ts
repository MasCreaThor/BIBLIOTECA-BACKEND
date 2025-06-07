// src/modules/resource/dto/resource/google-books.dto.ts
import { IsString, IsMongoId, IsOptional, IsNumber, Min, MaxLength } from 'class-validator';
import { Type } from 'class-transformer'; // Agregar el import faltante

export class ResourceFromGoogleBooksDto {
  @IsString({ message: 'El ID de Google Books es requerido' })
  googleBooksId!: string;

  @IsMongoId({ message: 'La categoría debe ser un ID válido' })
  categoryId!: string;

  @IsMongoId({ message: 'La ubicación debe ser un ID válido' })
  locationId!: string;

  @IsOptional()
  @IsNumber({}, { message: 'Los volúmenes deben ser un número' })
  @Min(1, { message: 'Debe haber al menos 1 volumen' })
  @Type(() => Number)
  volumes?: number;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser un string' })
  @MaxLength(500, { message: 'Las notas no deben exceder 500 caracteres' })
  notes?: string;
}