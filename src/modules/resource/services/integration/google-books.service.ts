  // src/modules/resource/services/integration/google-books.service.ts
  import { Injectable, BadRequestException } from '@nestjs/common';
  import { GoogleBooksAdapter } from '@adapters/google-books.adapter';
  import { LoggerService } from '@shared/services/logger.service';
  import { GoogleBooksSearchDto, GoogleBooksVolumeDto } from '@modules/resource/dto';
  import { ValidationUtils } from '@shared/utils';
  
  @Injectable()
  export class GoogleBooksService {
    constructor(
      private readonly googleBooksAdapter: GoogleBooksAdapter,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('GoogleBooksService');
    }
  
    async searchBooks(searchDto: GoogleBooksSearchDto): Promise<GoogleBooksVolumeDto[]> {
      const { query, maxResults } = searchDto;
  
      if (!ValidationUtils.isNotEmpty(query)) {
        throw new BadRequestException('El término de búsqueda es requerido');
      }
  
      try {
        const results = await this.googleBooksAdapter.searchBooks(query, maxResults);
        this.logger.log(`Google Books search completed: "${query}" - ${results.length} results`);
        return results;
      } catch (error) {
        this.logger.error(`Error searching Google Books: ${query}`, error);
        throw new BadRequestException('Error al buscar en Google Books');
      }
    }
  
    async searchByISBN(isbn: string): Promise<GoogleBooksVolumeDto | null> {
      if (!ValidationUtils.isNotEmpty(isbn)) {
        throw new BadRequestException('El ISBN es requerido');
      }
  
      try {
        const result = await this.googleBooksAdapter.searchByISBN(isbn);
        if (result) {
          this.logger.log(`Google Books ISBN search successful: ${isbn}`);
        }
        return result;
      } catch (error) {
        this.logger.error(`Error searching by ISBN: ${isbn}`, error);
        throw new BadRequestException('Error al buscar por ISBN en Google Books');
      }
    }
  
    async getVolumeById(volumeId: string): Promise<GoogleBooksVolumeDto | null> {
      if (!ValidationUtils.isNotEmpty(volumeId)) {
        throw new BadRequestException('El ID del volumen es requerido');
      }
  
      try {
        const result = await this.googleBooksAdapter.getVolumeById(volumeId);
        if (result) {
          this.logger.log(`Google Books volume details retrieved: ${volumeId}`);
        }
        return result;
      } catch (error) {
        this.logger.error(`Error getting volume details: ${volumeId}`, error);
        throw new BadRequestException('Error al obtener detalles del volumen');
      }
    }
  
    async isApiAvailable(): Promise<boolean> {
      try {
        return await this.googleBooksAdapter.isApiAvailable();
      } catch (error) {
        this.logger.error('Error checking Google Books API availability', error);
        return false;
      }
    }
  
    extractISBN(volume: GoogleBooksVolumeDto): string | null {
      return this.googleBooksAdapter.extractISBN(volume);
    }
  }