// src/modules/resource/dto/google-books/google-books.dto.ts
import { IsString, IsOptional, IsNumber, Min, Max, MinLength } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class GoogleBooksSearchDto {
  @IsString({ message: 'El término de búsqueda es requerido' })
  @MinLength(2, { message: 'El término de búsqueda debe tener al menos 2 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  query!: string;

  @IsOptional()
  @IsNumber({}, { message: 'El número máximo de resultados debe ser un número' })
  @Min(1, { message: 'Debe solicitar al menos 1 resultado' })
  @Max(20, { message: 'No puede solicitar más de 20 resultados' })
  @Type(() => Number)
  maxResults?: number;
}

export class GoogleBooksVolumeDto {
  id!: string;
  title!: string;
  authors?: string[];
  publisher?: string;
  publishedDate?: string;
  description?: string;
  categories?: string[];
  industryIdentifiers?: Array<{
    type: string;
    identifier: string;
  }>;
  pageCount?: number;
  imageLinks?: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
  };
}