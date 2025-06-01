// src/modules/resource/services/google-books.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { GoogleBooksAdapter } from '../../../adapters/google-books.adapter';
import { LoggerService } from '@shared/services/logger.service';
import { GoogleBooksSearchDto, GoogleBooksVolumeDto } from '@modules/resource/dto';
import { ValidationUtils } from '@shared/utils';

/**
 * Servicio para operaciones con Google Books API
 */

@Injectable()
export class GoogleBooksService {
  constructor(
    private readonly googleBooksAdapter: GoogleBooksAdapter,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('GoogleBooksService');
  }

  /**
   * Buscar libros en Google Books
   */
  async searchBooks(searchDto: GoogleBooksSearchDto): Promise<GoogleBooksVolumeDto[]> {
    const { query, maxResults } = searchDto;

    try {
      if (!ValidationUtils.isNotEmpty(query)) {
        throw new BadRequestException('El término de búsqueda es requerido');
      }

      const results = await this.googleBooksAdapter.searchBooks(query, maxResults);

      this.logger.log(`Google Books search completed: "${query}" - ${results.length} results`);

      return results;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error searching Google Books: ${query}`, error);
      throw new BadRequestException('Error al buscar en Google Books');
    }
  }

  /**
   * Buscar libro por ISBN
   */
  async searchByISBN(isbn: string): Promise<GoogleBooksVolumeDto | null> {
    try {
      if (!ValidationUtils.isNotEmpty(isbn)) {
        throw new BadRequestException('El ISBN es requerido');
      }

      const result = await this.googleBooksAdapter.searchByISBN(isbn);

      if (result) {
        this.logger.log(`Google Books ISBN search successful: ${isbn}`);
      } else {
        this.logger.debug(`No results found for ISBN: ${isbn}`);
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error searching by ISBN: ${isbn}`, error);
      throw new BadRequestException('Error al buscar por ISBN en Google Books');
    }
  }

  /**
   * Obtener detalles de un volumen específico
   */
  async getVolumeById(volumeId: string): Promise<GoogleBooksVolumeDto | null> {
    try {
      if (!ValidationUtils.isNotEmpty(volumeId)) {
        throw new BadRequestException('El ID del volumen es requerido');
      }

      const result = await this.googleBooksAdapter.getVolumeById(volumeId);

      if (result) {
        this.logger.log(`Google Books volume details retrieved: ${volumeId}`);
      } else {
        this.logger.debug(`Volume not found: ${volumeId}`);
      }

      return result;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error getting volume details: ${volumeId}`, error);
      throw new BadRequestException('Error al obtener detalles del volumen');
    }
  }

  /**
   * Buscar por autor
   */
  async searchByAuthor(author: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    try {
      if (!ValidationUtils.isNotEmpty(author)) {
        throw new BadRequestException('El nombre del autor es requerido');
      }

      const results = await this.googleBooksAdapter.searchByAuthor(author, maxResults);

      this.logger.log(`Google Books author search completed: "${author}" - ${results.length} results`);

      return results;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error searching by author: ${author}`, error);
      throw new BadRequestException('Error al buscar por autor en Google Books');
    }
  }

  /**
   * Buscar por título
   */
  async searchByTitle(title: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    try {
      if (!ValidationUtils.isNotEmpty(title)) {
        throw new BadRequestException('El título es requerido');
      }

      const results = await this.googleBooksAdapter.searchByTitle(title, maxResults);

      this.logger.log(`Google Books title search completed: "${title}" - ${results.length} results`);

      return results;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error searching by title: ${title}`, error);
      throw new BadRequestException('Error al buscar por título en Google Books');
    }
  }

  /**
   * Buscar por editorial
   */
  async searchByPublisher(publisher: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    try {
      if (!ValidationUtils.isNotEmpty(publisher)) {
        throw new BadRequestException('El nombre de la editorial es requerido');
      }

      const results = await this.googleBooksAdapter.searchByPublisher(publisher, maxResults);

      this.logger.log(`Google Books publisher search completed: "${publisher}" - ${results.length} results`);

      return results;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error searching by publisher: ${publisher}`, error);
      throw new BadRequestException('Error al buscar por editorial en Google Books');
    }
  }

  /**
   * Verificar si la API está disponible
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      const isAvailable = await this.googleBooksAdapter.isApiAvailable();
      
      if (isAvailable) {
        this.logger.debug('Google Books API is available');
      } else {
        this.logger.warn('Google Books API is not available');
      }

      return isAvailable;
    } catch (error) {
      this.logger.error('Error checking Google Books API availability', error);
      return false;
    }
  }

  /**
   * Extraer ISBN de un volumen
   */
  extractISBN(volume: GoogleBooksVolumeDto): string | null {
    return this.googleBooksAdapter.extractISBN(volume);
  }

  /**
   * Obtener información enriquecida de un libro por múltiples criterios
   */
  async getEnrichedBookInfo(searchCriteria: {
    title?: string;
    author?: string;
    isbn?: string;
  }): Promise<{
    volumes: GoogleBooksVolumeDto[];
    bestMatch?: GoogleBooksVolumeDto;
  }> {
    const { title, author, isbn } = searchCriteria;
    
    try {
      let volumes: GoogleBooksVolumeDto[] = [];
      let bestMatch: GoogleBooksVolumeDto | undefined;

      // Priorizar búsqueda por ISBN si está disponible
      if (isbn && ValidationUtils.isNotEmpty(isbn)) {
        const isbnResult = await this.searchByISBN(isbn);
        if (isbnResult) {
          bestMatch = isbnResult;
          volumes = [isbnResult];
        }
      }

      // Si no se encontró por ISBN, buscar por título y autor
      if (volumes.length === 0) {
        let query = '';
        
        if (title && ValidationUtils.isNotEmpty(title)) {
          query += `intitle:"${title}"`;
        }
        
        if (author && ValidationUtils.isNotEmpty(author)) {
          if (query) query += ' ';
          query += `inauthor:"${author}"`;
        }

        if (query) {
          volumes = await this.googleBooksAdapter.searchBooks(query, 10);
          
          // Determinar la mejor coincidencia basada en similitud de título
          if (volumes.length > 0 && title) {
            bestMatch = this.findBestTitleMatch(volumes, title);
          } else if (volumes.length > 0) {
            bestMatch = volumes[0];
          }
        }
      }

      this.logger.log(`Enriched search completed - Found ${volumes.length} volumes`);

      return {
        volumes,
        bestMatch,
      };
    } catch (error) {
      this.logger.error('Error in enriched book search', error);
      return {
        volumes: [],
        bestMatch: undefined,
      };
    }
  }

  /**
   * Buscar la mejor coincidencia de título
   */
  private findBestTitleMatch(volumes: GoogleBooksVolumeDto[], targetTitle: string): GoogleBooksVolumeDto {
    const normalizedTarget = this.normalizeTitle(targetTitle);

    let bestMatch = volumes[0];
    let bestScore = 0;

    for (const volume of volumes) {
      const normalizedVolumeTitle = this.normalizeTitle(volume.title);
      const score = this.calculateTitleSimilarity(normalizedTarget, normalizedVolumeTitle);

      if (score > bestScore) {
        bestScore = score;
        bestMatch = volume;
      }
    }

    return bestMatch;
  }

  /**
   * Normalizar título para comparación
   */
  private normalizeTitle(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .replace(/[^\w\s]/g, '') // Remover puntuación
      .replace(/\s+/g, ' ') // Normalizar espacios
      .trim();
  }

  /**
   * Calcular similitud entre títulos (algoritmo simple)
   */
  private calculateTitleSimilarity(title1: string, title2: string): number {
    const words1 = title1.split(' ');
    const words2 = title2.split(' ');
    
    let matches = 0;
    const totalWords = Math.max(words1.length, words2.length);

    for (const word1 of words1) {
      if (word1.length > 2 && words2.some(word2 => word2.includes(word1) || word1.includes(word2))) {
        matches++;
      }
    }

    return totalWords > 0 ? matches / totalWords : 0;
  }

  /**
   * Obtener estadísticas de uso de Google Books
   */
  async getUsageStatistics(): Promise<{
    apiAvailable: boolean;
    totalSearches: number; // Esto se podría trackear en el futuro
    lastApiCheck: Date;
  }> {
    const apiAvailable = await this.isApiAvailable();

    return {
      apiAvailable,
      totalSearches: 0, // Placeholder para futuras métricas
      lastApiCheck: new Date(),
    };
  }
}