import { Types } from 'mongoose';

/**
 * Utilidades para validación de ObjectId de MongoDB
 */
export class MongoUtils {
  /**
   * Verifica si una cadena es un ObjectId válido de MongoDB
   */
  static isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * Convierte una cadena a ObjectId
   */
  static toObjectId(id: string): Types.ObjectId {
    if (!this.isValidObjectId(id)) {
      throw new Error(`Invalid ObjectId: ${id}`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Convierte un array de cadenas a array de ObjectIds
   */
  static toObjectIds(ids: string[]): Types.ObjectId[] {
    return ids.map((id) => this.toObjectId(id));
  }
}

/**
 * Utilidades para formateo de cadenas
 */
export class StringUtils {
  /**
   * Capitaliza la primera letra de una cadena
   */
  static capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  /**
   * Convierte una cadena a formato slug
   */
  static toSlug(str: string): string {
    return str
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Limpia y normaliza una cadena para búsqueda
   */
  static normalizeForSearch(str: string): string {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remueve acentos
      .trim();
  }

  /**
   * Trunca una cadena a una longitud específica
   */
  static truncate(str: string, length: number, suffix: string = '...'): string {
    if (str.length <= length) return str;
    return str.substring(0, length - suffix.length) + suffix;
  }
}

/**
 * Utilidades para fechas
 */
export class DateUtils {
  /**
   * Obtiene la fecha actual sin tiempo (solo fecha)
   */
  static getCurrentDate(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }

  /**
   * Añade días a una fecha
   */
  static addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * Calcula la diferencia en días entre dos fechas
   */
  static daysDifference(date1: Date, date2: Date): number {
    const timeDiff = Math.abs(date2.getTime() - date1.getTime());
    return Math.ceil(timeDiff / (1000 * 3600 * 24));
  }

  /**
   * Verifica si una fecha es hoy
   */
  static isToday(date: Date): boolean {
    const today = this.getCurrentDate();
    const checkDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return checkDate.getTime() === today.getTime();
  }

  /**
   * Verifica si una fecha ya pasó
   */
  static isPast(date: Date): boolean {
    return date < new Date();
  }

  /**
   * Formatea una fecha en formato local
   */
  static formatDate(date: Date, locale: string = 'es-ES'): string {
    return date.toLocaleDateString(locale);
  }
}

/**
 * Utilidades para validaciones
 */
export class ValidationUtils {
  /**
   * Valida formato de email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Valida que una cadena no esté vacía o solo contenga espacios
   */
  static isNotEmpty(str: string): boolean {
    return Boolean(str && str.trim().length > 0);
  }

  /**
   * Valida longitud mínima de contraseña
   */
  static isValidPasswordLength(password: string, minLength: number = 8): boolean {
    return Boolean(password && password.length >= minLength);
  }

  /**
   * Valida que un número esté en un rango específico
   */
  static isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
  }
}

/**
 * Utilidades para arrays
 */
export class ArrayUtils {
  /**
   * Remueve elementos duplicados de un array
   */
  static removeDuplicates<T>(array: T[]): T[] {
    return [...new Set(array)];
  }

  /**
   * Divide un array en chunks de tamaño específico
   */
  static chunk<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  /**
   * Mezcla aleatoriamente los elementos de un array
   */
  static shuffle<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }
}

/**
 * Utilidades para objetos - TIPADO CORREGIDO
 */
export class ObjectUtils {
  /**
   * Remueve propiedades undefined de un objeto
   */
  static removeUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
    const cleaned: Partial<T> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined) {
        (cleaned as Record<string, unknown>)[key] = value;
      }
    }
    return cleaned;
  }

  /**
   * Hace una copia profunda de un objeto
   */
  static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj)) as T;
  }
}

export * from './error-utils';
