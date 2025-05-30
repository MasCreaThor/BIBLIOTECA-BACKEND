import { Document } from 'mongoose';

/**
 * Interfaz base para todos los documentos de MongoDB
 */
export interface BaseDocument extends Document {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interfaz base para operaciones CRUD en repositorios
 */
export interface BaseRepository<T extends BaseDocument> {
  create(createDto: Partial<T>): Promise<T>;
  findAll(filter?: Partial<T>, options?: QueryOptions): Promise<T[]>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Partial<T>): Promise<T | null>;
  update(id: string, updateDto: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

/**
 * Opciones para consultas
 */
export interface QueryOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  populate?: string | string[];
}

/**
 * Respuesta paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * Parámetros de paginación
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * Interfaz para respuestas de API estándar
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  statusCode: number;
}

/**
 * Interfaz para filtros de búsqueda
 */
export interface SearchFilter {
  search?: string;
  category?: string;
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

/**
 * Tipos de entorno de la aplicación
 */
export type AppEnvironment = 'development' | 'test' | 'production';

/**
 * Configuración de la aplicación
 */
export interface AppConfig {
  environment: AppEnvironment;
  port: number;
  apiPrefix: string;
  database: {
    uri: string;
    options: Record<string, unknown>;
  };
  jwt: {
    secret: string;
    expiresIn: string;
  };
  security: {
    bcryptSaltRounds: number;
    passwordMinLength: number;
  };
}
