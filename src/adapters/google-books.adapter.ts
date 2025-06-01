// src/adapters/google-books.adapter.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '@shared/services/logger.service';
import { GoogleBooksVolumeDto } from '@modules/resource/dto';

/**
 * Adapter para integración con Google Books API
 */

interface GoogleBooksApiResponse {
  kind: string;
  totalItems: number;
  items?: GoogleBooksItem[];
}

interface GoogleBooksItem {
  kind: string;
  id: string;
  etag: string;
  selfLink: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    publishedDate?: string;
    description?: string;
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
    pageCount?: number;
    categories?: string[];
    imageLinks?: {
      smallThumbnail?: string;
      thumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
      extraLarge?: string;
    };
    language?: string;
    previewLink?: string;
    infoLink?: string;
  };
}

@Injectable()
export class GoogleBooksAdapter {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly maxResults: number;
  private readonly timeout: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {
    this.apiKey = this.configService.get<string>('app.googleBooks.apiKey', '');
    this.baseUrl = this.configService.get<string>('app.googleBooks.baseUrl', 'https://www.googleapis.com/books/v1');
    this.maxResults = this.configService.get<number>('app.googleBooks.maxResults', 10);
    this.timeout = 5000; // 5 segundos
    
    this.logger.setContext('GoogleBooksAdapter');
  }

  /**
   * Buscar libros en Google Books API
   */
  async searchBooks(query: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Google Books API key not configured');
        return [];
      }

      const cleanQuery = this.sanitizeQuery(query);
      if (!cleanQuery) {
        this.logger.warn('Invalid or empty search query');
        return [];
      }

      const url = this.buildSearchUrl(cleanQuery, maxResults);
      this.logger.debug(`Searching Google Books: ${cleanQuery}`);

      const response = await this.makeRequest(url);
      const apiResponse: GoogleBooksApiResponse = await response.json();

      if (!apiResponse.items || apiResponse.items.length === 0) {
        this.logger.debug(`No results found for query: ${cleanQuery}`);
        return [];
      }

      const volumes = apiResponse.items.map(item => this.mapToVolumeDto(item));
      this.logger.log(`Found ${volumes.length} books for query: ${cleanQuery}`);

      return volumes;
    } catch (error) {
      this.logger.error(`Error searching Google Books: ${query}`, error);
      return [];
    }
  }

  /**
   * Buscar libro por ISBN
   */
  async searchByISBN(isbn: string): Promise<GoogleBooksVolumeDto | null> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Google Books API key not configured');
        return null;
      }

      const cleanISBN = this.sanitizeISBN(isbn);
      if (!cleanISBN) {
        this.logger.warn(`Invalid ISBN format: ${isbn}`);
        return null;
      }

      const query = `isbn:${cleanISBN}`;
      const results = await this.searchBooks(query, 1);
      
      return results.length > 0 ? results[0] : null;
    } catch (error) {
      this.logger.error(`Error searching by ISBN: ${isbn}`, error);
      return null;
    }
  }

  /**
   * Obtener detalles de un volumen específico por ID
   */
  async getVolumeById(volumeId: string): Promise<GoogleBooksVolumeDto | null> {
    try {
      if (!this.apiKey) {
        this.logger.warn('Google Books API key not configured');
        return null;
      }

      if (!volumeId || volumeId.trim().length === 0) {
        this.logger.warn('Invalid volume ID provided');
        return null;
      }

      const url = `${this.baseUrl}/volumes/${volumeId}?key=${this.apiKey}`;
      this.logger.debug(`Getting volume details: ${volumeId}`);

      const response = await this.makeRequest(url);
      const item: GoogleBooksItem = await response.json();

      const volume = this.mapToVolumeDto(item);
      this.logger.debug(`Retrieved volume details: ${volume.title}`);

      return volume;
    } catch (error) {
      this.logger.error(`Error getting volume by ID: ${volumeId}`, error);
      return null;
    }
  }

  /**
   * Buscar por autor
   */
  async searchByAuthor(author: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    const query = `inauthor:"${author}"`;
    return this.searchBooks(query, maxResults);
  }

  /**
   * Buscar por título
   */
  async searchByTitle(title: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    const query = `intitle:"${title}"`;
    return this.searchBooks(query, maxResults);
  }

  /**
   * Buscar por editorial
   */
  async searchByPublisher(publisher: string, maxResults?: number): Promise<GoogleBooksVolumeDto[]> {
    const query = `inpublisher:"${publisher}"`;
    return this.searchBooks(query, maxResults);
  }

  /**
   * Construir URL de búsqueda
   */
  private buildSearchUrl(query: string, maxResults?: number): string {
    const resultLimit = maxResults || this.maxResults;
    const encodedQuery = encodeURIComponent(query);
    
    return `${this.baseUrl}/volumes?q=${encodedQuery}&maxResults=${resultLimit}&key=${this.apiKey}`;
  }

  /**
   * Realizar petición HTTP con timeout
   */
  private async makeRequest(url: string): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Biblioteca-Escolar/1.0',
          'Accept': 'application/json',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Mapear respuesta de Google Books a DTO
   */
  private mapToVolumeDto(item: GoogleBooksItem): GoogleBooksVolumeDto {
    const volumeInfo = item.volumeInfo;

    return {
      id: item.id,
      title: volumeInfo.title || 'Título no disponible',
      authors: volumeInfo.authors || [],
      publisher: volumeInfo.publisher,
      publishedDate: volumeInfo.publishedDate,
      description: volumeInfo.description,
      categories: volumeInfo.categories || [],
      industryIdentifiers: volumeInfo.industryIdentifiers || [],
      pageCount: volumeInfo.pageCount,
      imageLinks: {
        thumbnail: volumeInfo.imageLinks?.thumbnail,
        small: volumeInfo.imageLinks?.small,
        medium: volumeInfo.imageLinks?.medium,
        large: volumeInfo.imageLinks?.large,
      },
    };
  }

  /**
   * Limpiar y validar query de búsqueda
   */
  private sanitizeQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    return query
      .trim()
      .replace(/[<>]/g, '') // Remover caracteres peligrosos
      .substring(0, 200); // Limitar longitud
  }

  /**
   * Limpiar y validar ISBN
   */
  private sanitizeISBN(isbn: string): string {
    if (!isbn || typeof isbn !== 'string') {
      return '';
    }

    // Remover guiones, espacios y otros caracteres no numéricos excepto X
    return isbn
      .replace(/[^0-9X]/gi, '')
      .toUpperCase()
      .trim();
  }

  /**
   * Extraer ISBN de un volumen
   */
  extractISBN(volume: GoogleBooksVolumeDto): string | null {
    if (!volume.industryIdentifiers) {
      return null;
    }

    // Priorizar ISBN_13, luego ISBN_10
    const isbn13 = volume.industryIdentifiers.find(id => id.type === 'ISBN_13');
    if (isbn13) {
      return isbn13.identifier;
    }

    const isbn10 = volume.industryIdentifiers.find(id => id.type === 'ISBN_10');
    if (isbn10) {
      return isbn10.identifier;
    }

    return null;
  }

  /**
   * Verificar si el API está disponible
   */
  async isApiAvailable(): Promise<boolean> {
    try {
      if (!this.apiKey) {
        return false;
      }

      const testUrl = `${this.baseUrl}/volumes?q=test&maxResults=1&key=${this.apiKey}`;
      const response = await this.makeRequest(testUrl);
      
      return response.ok;
    } catch (error) {
      this.logger.warn('Google Books API not available', error);
      return false;
    }
  }
}