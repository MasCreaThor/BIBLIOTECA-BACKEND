// src/modules/resource/dto/resource/resource.dto.ts
import {
  IsString,
  IsOptional,
  IsMongoId,
  MaxLength,
  MinLength,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  IsArray,
  Matches,
  IsUrl,
  ValidateIf,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

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
  @Transform(({ value }: { value: any }) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      // Filtrar solo IDs válidos de MongoDB
      return value.filter(id => 
        id && 
        typeof id === 'string' && 
        id.trim() !== '' && 
        /^[0-9a-fA-F]{24}$/.test(id.trim())
      );
    }
    return [];
  })
  @IsMongoId({ each: true, message: 'Cada autor debe ser un ID válido' })
  authorIds?: string[];

  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (!value || value === '' || value === 'null' || value === 'undefined') {
      return undefined;
    }
    return value;
  })
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

  @IsNumber({}, { message: 'La cantidad total debe ser un número' })
  @Min(1, { message: 'La cantidad total debe ser mayor a 0' })
  @Max(10000, { message: 'La cantidad total no puede exceder 10,000 unidades' })
  @Type(() => Number)
  totalQuantity!: number;

  @IsOptional()
  @IsString({ message: 'Las notas deben ser un string' })
  @MaxLength(500, { message: 'Las notas no deben exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  notes?: string;

  @IsOptional()
  @IsString({ message: 'El ISBN debe ser un string' })
  @Transform(({ value }: { value: any }) => {
    if (!value || value === '' || value === 'null' || value === 'undefined') {
      return undefined;
    }
    return value?.trim();
  })
  @ValidateIf((o) => o.isbn !== undefined && o.isbn !== '')
  @Matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, {
    message: 'El ISBN debe tener un formato válido'
  })
  isbn?: string;

  // ✅ NUEVO: Campo para URL de imagen de portada
  @IsOptional()
  @IsString({ message: 'La URL de imagen debe ser un string' })
  @IsUrl({}, { message: 'La URL de imagen debe ser válida' })
  @MaxLength(500, { message: 'La URL de imagen no debe exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  coverImageUrl?: string;

  // Campos adicionales para integración con Google Books
  @IsOptional()
  @IsString({ message: 'El ID de Google Books debe ser un string' })
  googleBooksId?: string;
}

export class UpdateResourceDto {
  @IsOptional()
  @IsString({ message: 'El título debe ser un string' })
  @MinLength(2, { message: 'El título debe tener al menos 2 caracteres' })
  @MaxLength(300, { message: 'El título no debe exceder 300 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  title?: string;

  @IsOptional()
  @IsMongoId({ message: 'La categoría debe ser un ID válido' })
  categoryId?: string;

  @IsOptional()
  @IsArray({ message: 'Los autores deben ser un array' })
  @Transform(({ value }: { value: any }) => {
    if (!value) return [];
    if (Array.isArray(value)) {
      // Filtrar solo IDs válidos de MongoDB
      return value.filter(id => 
        id && 
        typeof id === 'string' && 
        id.trim() !== '' && 
        /^[0-9a-fA-F]{24}$/.test(id.trim())
      );
    }
    return [];
  })
  @IsMongoId({ each: true, message: 'Cada autor debe ser un ID válido' })
  authorIds?: string[];

  @IsOptional()
  @Transform(({ value }: { value: any }) => {
    if (!value || value === '' || value === 'null' || value === 'undefined') {
      return undefined;
    }
    return value;
  })
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

  // ✅ NUEVO: Campo para URL de imagen de portada en actualizaciones
  @IsOptional()
  @IsString({ message: 'La URL de imagen debe ser un string' })
  @IsUrl({}, { message: 'La URL de imagen debe ser válida' })
  @MaxLength(500, { message: 'La URL de imagen no debe exceder 500 caracteres' })
  @Transform(({ value }: { value: string }) => value?.trim())
  coverImageUrl?: string;

  // ✅ AGREGADO: Validación mejorada del ISBN para actualizaciones
  @IsOptional()
  @IsString({ message: 'El ISBN debe ser un string' })
  @Transform(({ value }: { value: any }) => {
    if (!value || value === '' || value === 'null' || value === 'undefined') {
      return undefined;
    }
    return value?.trim();
  })
  @ValidateIf((o) => o.isbn !== undefined && o.isbn !== '')
  @Matches(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, {
    message: 'El ISBN debe tener un formato válido'
  })
  isbn?: string;
}

export class ResourceResponseDto {
  _id!: string;
  typeId!: string;
  categoryId!: string;
  title!: string;
  authorIds!: string[];
  publisherId?: string;
  volumes?: number;
  stateId!: string;
  locationId!: string;
  notes?: string;
  available!: boolean;
  isbn?: string;
  googleBooksId?: string;
  coverImageUrl?: string;
  
  // ✅ CAMPOS DE CANTIDAD PARA GESTIÓN DE PRÉSTAMOS
  totalQuantity?: number;
  currentLoansCount?: number;
  availableQuantity?: number;
  hasStock?: boolean;
  
  // ✅ CAMPOS ADICIONALES PARA GESTIÓN
  totalLoans?: number;
  lastLoanDate?: Date;
  
  // ✅ CAMPOS POPULADOS PARA INFORMACIÓN COMPLETA
  type?: {
    _id: string;
    name: string;
    description: string;
  };
  
  category?: {
    _id: string;
    name: string;
    description: string;
    color: string;
  };
  
  authors?: Array<{
    _id: string;
    name: string;
    biography?: string;
  }>;
  
  publisher?: {
    _id: string;
    name: string;
    description?: string;
  };
  
  location?: {
    _id: string;
    name: string;
    description: string;
    code?: string;
  };
  
  state?: {
    _id: string;
    name: string;
    description: string;
    color: string;
  };
  
  createdAt!: Date;
  updatedAt!: Date;
}