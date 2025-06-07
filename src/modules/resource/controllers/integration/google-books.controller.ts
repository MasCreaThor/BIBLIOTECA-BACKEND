// src/modules/resource/controllers/integration/google-books.controller.ts
import {
    Controller,
    Get,
    Query,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { GoogleBooksService } from '@modules/resource/services/integration/google-books.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    GoogleBooksSearchDto,
    GoogleBooksVolumeDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils } from '@shared/utils';
  
  @Controller('google-books')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class GoogleBooksController {
    constructor(
      private readonly googleBooksService: GoogleBooksService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('GoogleBooksController');
    }
  
    /**
     * Buscar libros en Google Books
     * GET /api/google-books/search
     */
    @Get('search')
    async searchBooks(
      @Query('q') query?: string,
      @Query('maxResults') maxResults?: string,
    ): Promise<ApiResponseDto<GoogleBooksVolumeDto[]>> {
      try {
        if (!query || !ValidationUtils.isNotEmpty(query)) {
          this.logger.warn('Search query is required');
          throw new Error('El término de búsqueda es requerido');
        }
  
        const searchDto: GoogleBooksSearchDto = {
          query: query.trim(),
          maxResults: maxResults ? parseInt(maxResults, 10) : undefined,
        };
  
        this.logger.log(`Searching Google Books: ${query}`);
        const results = await this.googleBooksService.searchBooks(searchDto);
  
        return ApiResponseDto.success(
          results,
          `Búsqueda completada: ${results.length} resultados encontrados`,
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error searching Google Books: ${query}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar libro por ISBN
     * GET /api/google-books/isbn/:isbn
     */
    @Get('isbn/:isbn')
    async searchByISBN(@Param('isbn') isbn: string): Promise<ApiResponseDto<GoogleBooksVolumeDto | null>> {
      try {
        if (!ValidationUtils.isNotEmpty(isbn)) {
          this.logger.warn(`Invalid ISBN: ${isbn}`);
          throw new Error('ISBN inválido');
        }
  
        this.logger.log(`Searching Google Books by ISBN: ${isbn}`);
        const result = await this.googleBooksService.searchByISBN(isbn);
  
        if (result) {
          return ApiResponseDto.success(
            result,
            'Libro encontrado por ISBN',
            HttpStatus.OK,
          );
        } else {
          return ApiResponseDto.success(
            null,
            'No se encontró ningún libro con ese ISBN',
            HttpStatus.OK,
          );
        }
      } catch (error) {
        this.logger.error(`Error searching by ISBN: ${isbn}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener detalles de un volumen específico
     * GET /api/google-books/volume/:volumeId
     */
    @Get('volume/:volumeId')
    async getVolumeById(@Param('volumeId') volumeId: string): Promise<ApiResponseDto<GoogleBooksVolumeDto | null>> {
      try {
        if (!ValidationUtils.isNotEmpty(volumeId)) {
          this.logger.warn(`Invalid volume ID: ${volumeId}`);
          throw new Error('ID de volumen inválido');
        }
  
        this.logger.log(`Getting Google Books volume details: ${volumeId}`);
        const result = await this.googleBooksService.getVolumeById(volumeId);
  
        if (result) {
          return ApiResponseDto.success(
            result,
            'Detalles del volumen obtenidos exitosamente',
            HttpStatus.OK,
          );
        } else {
          return ApiResponseDto.success(
            null,
            'No se encontró el volumen especificado',
            HttpStatus.OK,
          );
        }
      } catch (error) {
        this.logger.error(`Error getting volume details: ${volumeId}`, error);
        throw error;
      }
    }
  
    /**
     * Verificar disponibilidad de la API
     * GET /api/google-books/status
     */
    @Get('status')
    async getApiStatus(): Promise<ApiResponseDto<{ apiAvailable: boolean; lastCheck: Date }>> {
      try {
        this.logger.debug('Checking Google Books API status');
        const apiAvailable = await this.googleBooksService.isApiAvailable();
  
        const status = {
          apiAvailable,
          lastCheck: new Date(),
        };
  
        return ApiResponseDto.success(
          status,
          apiAvailable 
            ? 'Google Books API está disponible' 
            : 'Google Books API no está disponible',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error checking API status', error);
        throw error;
      }
    }
  }