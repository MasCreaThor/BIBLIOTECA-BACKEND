// src/modules/resource/dto/resource.dto.ts
import {
    IsString,
    IsOptional,
    IsMongoId,
    MaxLength,
    MinLength,
    IsEnum,
    IsBoolean,
    IsNumber,
    Min,
    Max,
    IsArray,
    ArrayNotEmpty,
    Matches,
  } from 'class-validator';
  import { Transform, Type } from 'class-transformer';
  import { SearchDto } from '@shared/dto';
  
  // === RESOURCE DTOs ===
  
  export class CreateResourceDto {
    @IsMongoId({ message: 'El tipo de recurso debe ser un ID válido' })
    typeId!: string;
  
    @IsMongoId({ message: 'La categoría debe ser un ID válido' })
    categoryId!: string;
  
    @IsString({ message: 'El título es requerido' })
    @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
    @MaxLength(300, { message: 'El título no debe exceder 300 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    title!: string;
  
    @IsOptional()
    @IsArray({ message: 'Los autores deben ser un array' })
    @IsMongoId({ each: true, message: 'Cada autor debe ser un ID válido' })
    authorIds?: string[];
  
    @IsOptional()
    @IsMongoId({ message: 'La editorial debe ser un ID válido' })
    publisherId?: string;
  
    @IsOptional()
    @IsNumber({}, { message: 'Los volúmenes deben ser un número' })
    @Min(1, { message: 'Debe haber al menos 1 volumen' })
    @Max(100, { message: 'No puede haber más de 100 volúmenes' })
    @Type(() => Number)
    volumes?: number;
  
    @IsMongoId({ message: 'El estado del recurso debe ser un ID válido' })
    stateId!: string;
  
    @IsMongoId({ message: 'La ubicación debe ser un ID válido' })
    locationId!: string;
  
    @IsOptional()
    @IsString({ message: 'Las notas deben ser un string' })
    @MaxLength(500, { message: 'Las notas no deben exceder 500 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    notes?: string;
  
    @IsOptional()
    @IsString({ message: 'El ID de Google Books debe ser un string' })
    googleBooksId?: string;
  
    @IsOptional()
    @IsString({ message: 'El ISBN debe ser un string' })
    @Matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, {
      message: 'El ISBN debe tener un formato válido'
    })
    isbn?: string;
  }
  
  export class UpdateResourceDto {
    @IsOptional()
    @IsMongoId({ message: 'El tipo de recurso debe ser un ID válido' })
    typeId?: string;
  
    @IsOptional()
    @IsMongoId({ message: 'La categoría debe ser un ID válido' })
    categoryId?: string;
  
    @IsOptional()
    @IsString({ message: 'El título debe ser un string' })
    @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
    @MaxLength(300, { message: 'El título no debe exceder 300 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    title?: string;
  
    @IsOptional()
    @IsArray({ message: 'Los autores deben ser un array' })
    @IsMongoId({ each: true, message: 'Cada autor debe ser un ID válido' })
    authorIds?: string[];
  
    @IsOptional()
    @IsMongoId({ message: 'La editorial debe ser un ID válido' })
    publisherId?: string;
  
    @IsOptional()
    @IsNumber({}, { message: 'Los volúmenes deben ser un número' })
    @Min(1, { message: 'Debe haber al menos 1 volumen' })
    @Max(100, { message: 'No puede haber más de 100 volúmenes' })
    @Type(() => Number)
    volumes?: number;
  
    @IsOptional()
    @IsMongoId({ message: 'El estado del recurso debe ser un ID válido' })
    stateId?: string;
  
    @IsOptional()
    @IsMongoId({ message: 'La ubicación debe ser un ID válido' })
    locationId?: string;
  
    @IsOptional()
    @IsString({ message: 'Las notas deben ser un string' })
    @MaxLength(500, { message: 'Las notas no deben exceder 500 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    notes?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'La disponibilidad debe ser un booleano' })
    available?: boolean;
  
    @IsOptional()
    @IsString({ message: 'El ISBN debe ser un string' })
    @Matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, {
      message: 'El ISBN debe tener un formato válido'
    })
    isbn?: string;
  }
  
  export class ResourceSearchDto extends SearchDto {
    @IsOptional()
    @IsEnum(['book', 'game', 'map', 'bible'], { message: 'El tipo debe ser book, game, map o bible' })
    resourceType?: 'book' | 'game' | 'map' | 'bible';
  
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    categoryId?: string;
  
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    locationId?: string;
  
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    stateId?: string;
  
    @IsOptional()
    @IsEnum(['available', 'borrowed'], { message: 'La disponibilidad debe ser available o borrowed' })
    availability?: 'available' | 'borrowed';
  
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    isbn?: string;
  
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    author?: string;
  
    @IsOptional()
    @IsString()
    @Transform(({ value }: { value: string }) => value?.trim())
    publisher?: string;
  }
  
  export class ResourceResponseDto {
    _id!: string;
    typeId!: string;
    type?: {
      _id: string;
      name: string;
      description: string;
    };
    categoryId!: string;
    category?: {
      _id: string;
      name: string;
      description: string;
      color: string;
    };
    title!: string;
    authorIds!: string[];
    authors?: Array<{
      _id: string;
      name: string;
    }>;
    publisherId?: string;
    publisher?: {
      _id: string;
      name: string;
    };
    volumes?: number;
    stateId!: string;
    state?: {
      _id: string;
      name: string;
      description: string;
      color: string;
    };
    locationId!: string;
    location?: {
      _id: string;
      name: string;
      description: string;
      code?: string;
    };
    notes?: string;
    googleBooksId?: string;
    available!: boolean;
    isbn?: string;
    totalLoans!: number;
    lastLoanDate?: Date;
    createdAt!: Date;
    updatedAt!: Date;
  }
  
  // === CATEGORY DTOs ===
  
  export class CreateCategoryDto {
    @IsString({ message: 'El nombre es requerido' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name!: string;
  
    @IsString({ message: 'La descripción es requerida' })
    @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description!: string;
  
    @IsOptional()
    @IsString({ message: 'El color debe ser un string' })
    @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: 'El color debe ser un código hexadecimal válido'
    })
    color?: string;
  }
  
  export class UpdateCategoryDto {
    @IsOptional()
    @IsString({ message: 'El nombre debe ser un string' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name?: string;
  
    @IsOptional()
    @IsString({ message: 'La descripción debe ser un string' })
    @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description?: string;
  
    @IsOptional()
    @IsString({ message: 'El color debe ser un string' })
    @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
      message: 'El color debe ser un código hexadecimal válido'
    })
    color?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'El estado activo debe ser un booleano' })
    active?: boolean;
  }
  
  export class CategoryResponseDto {
    _id!: string;
    name!: string;
    description!: string;
    color!: string;
    active!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
  }
  
  // === LOCATION DTOs ===
  
  export class CreateLocationDto {
    @IsString({ message: 'El nombre es requerido' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name!: string;
  
    @IsString({ message: 'La descripción es requerida' })
    @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description!: string;
  
    @IsOptional()
    @IsString({ message: 'El código debe ser un string' })
    @MaxLength(50, { message: 'El código no debe exceder 50 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    code?: string;
  }
  
  export class UpdateLocationDto {
    @IsOptional()
    @IsString({ message: 'El nombre debe ser un string' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(100, { message: 'El nombre no debe exceder 100 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name?: string;
  
    @IsOptional()
    @IsString({ message: 'La descripción debe ser un string' })
    @MaxLength(200, { message: 'La descripción no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description?: string;
  
    @IsOptional()
    @IsString({ message: 'El código debe ser un string' })
    @MaxLength(50, { message: 'El código no debe exceder 50 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    code?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'El estado activo debe ser un booleano' })
    active?: boolean;
  }
  
  export class LocationResponseDto {
    _id!: string;
    name!: string;
    description!: string;
    code?: string;
    active!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
  }
  
  // === AUTHOR DTOs ===
  
  export class CreateAuthorDto {
    @IsString({ message: 'El nombre es requerido' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name!: string;
  
    @IsOptional()
    @IsString({ message: 'La biografía debe ser un string' })
    @MaxLength(1000, { message: 'La biografía no debe exceder 1000 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    biography?: string;
  
    @IsOptional()
    @IsString({ message: 'El ID de Google Books debe ser un string' })
    googleBooksAuthorId?: string;
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
    @MaxLength(1000, { message: 'La biografía no debe exceder 1000 caracteres' })
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
    googleBooksAuthorId?: string;
    active!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
  }
  
  // === PUBLISHER DTOs ===
  
  export class CreatePublisherDto {
    @IsString({ message: 'El nombre es requerido' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name!: string;
  
    @IsOptional()
    @IsString({ message: 'La descripción debe ser un string' })
    @MaxLength(500, { message: 'La descripción no debe exceder 500 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description?: string;
  
    @IsOptional()
    @IsString({ message: 'El ID de Google Books debe ser un string' })
    googleBooksPublisherId?: string;
  }
  
  export class UpdatePublisherDto {
    @IsOptional()
    @IsString({ message: 'El nombre debe ser un string' })
    @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
    @MaxLength(200, { message: 'El nombre no debe exceder 200 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    name?: string;
  
    @IsOptional()
    @IsString({ message: 'La descripción debe ser un string' })
    @MaxLength(500, { message: 'La descripción no debe exceder 500 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    description?: string;
  
    @IsOptional()
    @IsBoolean({ message: 'El estado activo debe ser un booleano' })
    active?: boolean;
  }
  
  export class PublisherResponseDto {
    _id!: string;
    name!: string;
    description?: string;
    googleBooksPublisherId?: string;
    active!: boolean;
    createdAt!: Date;
    updatedAt!: Date;
  }
  
  // === GOOGLE BOOKS DTOs ===
  
  export class GoogleBooksSearchDto {
    @IsString({ message: 'El término de búsqueda es requerido' })
    @MinLength(2, { message: 'El término de búsqueda debe tener al menos 2 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    query!: string;
  
    @IsOptional()
    @IsNumber({}, { message: 'El número máximo de resultados debe ser un número' })
    @Min(1, { message: 'Debe solicitar al menos 1 resultado' })
    @Max(40, { message: 'No puede solicitar más de 40 resultados' })
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
  
  export class ResourceFromGoogleBooksDto {
    @IsString({ message: 'El ID de Google Books es requerido' })
    googleBooksId!: string;
  
    @IsMongoId({ message: 'La categoría debe ser un ID válido' })
    categoryId!: string;
  
    @IsMongoId({ message: 'El estado del recurso debe ser un ID válido' })
    stateId!: string;
  
    @IsMongoId({ message: 'La ubicación debe ser un ID válido' })
    locationId!: string;
  
    @IsOptional()
    @IsNumber({}, { message: 'Los volúmenes deben ser un número' })
    @Min(1, { message: 'Debe haber al menos 1 volumen' })
    @Max(100, { message: 'No puede haber más de 100 volúmenes' })
    @Type(() => Number)
    volumes?: number;
  
    @IsOptional()
    @IsString({ message: 'Las notas deben ser un string' })
    @MaxLength(500, { message: 'Las notas no deben exceder 500 caracteres' })
    @Transform(({ value }: { value: string }) => value?.trim())
    notes?: string;
  }