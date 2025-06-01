// src/modules/resource/controllers/google-books.controller.ts
import {
    Controller,
    Get,
    Query,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { GoogleBooksService } from '@modules/resource/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    GoogleBooksSearchDto,
    GoogleBooksVolumeDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils } from '@shared/utils';
  
  /**
   * Controlador para búsquedas en Google Books API
   */
  
  @Controller('google-books')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
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
     * Buscar por autor
     * GET /api/google-books/author
     */
    @Get('author')
    async searchByAuthor(
      @Query('name') author?: string,
      @Query('maxResults') maxResults?: string,
    ): Promise<ApiResponseDto<GoogleBooksVolumeDto[]>> {
      try {
        if (!author || !ValidationUtils.isNotEmpty(author)) {
          this.logger.warn('Author name is required');
          throw new Error('El nombre del autor es requerido');
        }
  
        const maxRes = maxResults ? parseInt(maxResults, 10) : undefined;
  
        this.logger.log(`Searching Google Books by author: ${author}`);
  
        const results = await this.googleBooksService.searchByAuthor(author.trim(), maxRes);
  
        return ApiResponseDto.success(
          results,
          `Búsqueda por autor completada: ${results.length} resultados encontrados`,
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error searching by author: ${author}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar por título
     * GET /api/google-books/title
     */
    @Get('title')
    async searchByTitle(
      @Query('title') title?: string,
      @Query('maxResults') maxResults?: string,
    ): Promise<ApiResponseDto<GoogleBooksVolumeDto[]>> {
      try {
        if (!title || !ValidationUtils.isNotEmpty(title)) {
          this.logger.warn('Title is required');
          throw new Error('El título es requerido');
        }
  
        const maxRes = maxResults ? parseInt(maxResults, 10) : undefined;
  
        this.logger.log(`Searching Google Books by title: ${title}`);
  
        const results = await this.googleBooksService.searchByTitle(title.trim(), maxRes);
  
        return ApiResponseDto.success(
          results,
          `Búsqueda por título completada: ${results.length} resultados encontrados`,
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error searching by title: ${title}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar por editorial
     * GET /api/google-books/publisher
     */
    @Get('publisher')
    async searchByPublisher(
      @Query('name') publisher?: string,
      @Query('maxResults') maxResults?: string,
    ): Promise<ApiResponseDto<GoogleBooksVolumeDto[]>> {
      try {
        if (!publisher || !ValidationUtils.isNotEmpty(publisher)) {
          this.logger.warn('Publisher name is required');
          throw new Error('El nombre de la editorial es requerido');
        }
  
        const maxRes = maxResults ? parseInt(maxResults, 10) : undefined;
  
        this.logger.log(`Searching Google Books by publisher: ${publisher}`);
  
        const results = await this.googleBooksService.searchByPublisher(publisher.trim(), maxRes);
  
        return ApiResponseDto.success(
          results,
          `Búsqueda por editorial completada: ${results.length} resultados encontrados`,
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error searching by publisher: ${publisher}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener información enriquecida de un libro
     * GET /api/google-books/enriched
     */
    @Get('enriched')
    async getEnrichedBookInfo(
      @Query('title') title?: string,
      @Query('author') author?: string,
      @Query('isbn') isbn?: string,
    ): Promise<ApiResponseDto<{
      volumes: GoogleBooksVolumeDto[];
      bestMatch?: GoogleBooksVolumeDto;
    }>> {
      try {
        if (!title && !author && !isbn) {
          this.logger.warn('At least one search criteria is required');
          throw new Error('Se requiere al menos un criterio de búsqueda (título, autor o ISBN)');
        }
  
        const searchCriteria: any = {};
        
        if (title && ValidationUtils.isNotEmpty(title)) {
          searchCriteria.title = title.trim();
        }
        
        if (author && ValidationUtils.isNotEmpty(author)) {
          searchCriteria.author = author.trim();
        }
        
        if (isbn && ValidationUtils.isNotEmpty(isbn)) {
          searchCriteria.isbn = isbn.trim();
        }
  
        this.logger.log('Getting enriched book info with criteria:', searchCriteria);
  
        const result = await this.googleBooksService.getEnrichedBookInfo(searchCriteria);
  
        return ApiResponseDto.success(
          result,
          `Búsqueda enriquecida completada: ${result.volumes.length} resultados encontrados`,
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error in enriched book search', error);
        throw error;
      }
    }
  
    /**
     * Verificar disponibilidad de la API
     * GET /api/google-books/status
     */
    @Get('status')
    async getApiStatus(): Promise<ApiResponseDto<{
      apiAvailable: boolean;
      totalSearches: number;
      lastApiCheck: Date;
    }>> {
      try {
        this.logger.debug('Checking Google Books API status');
  
        const status = await this.googleBooksService.getUsageStatistics();
  
        return ApiResponseDto.success(
          status,
          status.apiAvailable 
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