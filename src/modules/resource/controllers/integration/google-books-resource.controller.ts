// src/modules/resource/controllers/integration/google-books-resource.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { GoogleBooksResourceService } from '@modules/resource/services/integration/google-books-resource.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    ResourceFromGoogleBooksDto,
    ResourceResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils } from '@shared/utils';
  
  /**
   * Controlador para integración de Google Books con recursos
   * Facilita la creación de recursos desde información de Google Books
   */
  
  @Controller('resources/google-books')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class GoogleBooksResourceController {
    constructor(
      private readonly googleBooksResourceService: GoogleBooksResourceService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('GoogleBooksResourceController');
    }
  
    /**
     * Crear recurso desde Google Books
     * POST /api/resources/google-books
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async createFromGoogleBooks(
      @Body() createDto: ResourceFromGoogleBooksDto,
    ): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        this.logger.log(`Creating resource from Google Books: ${createDto.googleBooksId}`);
        
        const resource = await this.googleBooksResourceService.createFromGoogleBooks(createDto);
        
        return ApiResponseDto.success(
          resource,
          'Recurso creado desde Google Books exitosamente',
          HttpStatus.CREATED,
        );
      } catch (error) {
        this.logger.error(`Error creating resource from Google Books: ${createDto.googleBooksId}`, error);
        throw error;
      }
    }
  
    /**
     * Previsualizar información de Google Books
     * GET /api/resources/google-books/preview/:volumeId
     */
    @Get('preview/:volumeId')
    async previewGoogleBooksInfo(
      @Param('volumeId') volumeId: string,
    ): Promise<ApiResponseDto<{
      bookInfo: any;
      suggestedData: {
        title: string;
        authors: string[];
        publisher?: string;
        isbn?: string;
        description?: string;
      };
    }>> {
      try {
        if (!ValidationUtils.isNotEmpty(volumeId)) {
          this.logger.warn(`Invalid volume ID: ${volumeId}`);
          throw new Error('ID de volumen inválido');
        }
  
        this.logger.log(`Previewing Google Books info: ${volumeId}`);
        
        const result = await this.googleBooksResourceService.previewGoogleBooksInfo(volumeId);
        
        return ApiResponseDto.success(
          result,
          'Información de Google Books obtenida exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error previewing Google Books info: ${volumeId}`, error);
        throw error;
      }
    }
  
    /**
     * Verificar si un libro ya existe en la biblioteca
     * GET /api/resources/google-books/check/:volumeId
     */
    @Get('check/:volumeId')
    async checkIfBookExists(
      @Param('volumeId') volumeId: string,
    ): Promise<ApiResponseDto<{
      exists: boolean;
      resource?: ResourceResponseDto;
      isbn?: string;
    }>> {
      try {
        if (!ValidationUtils.isNotEmpty(volumeId)) {
          this.logger.warn(`Invalid volume ID: ${volumeId}`);
          throw new Error('ID de volumen inválido');
        }
  
        this.logger.log(`Checking if book exists: ${volumeId}`);
        
        const result = await this.googleBooksResourceService.checkIfBookExists(volumeId);
        
        const message = result.exists 
          ? 'El libro ya existe en la biblioteca'
          : 'El libro no existe en la biblioteca';
        
        return ApiResponseDto.success(
          result,
          message,
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error checking if book exists: ${volumeId}`, error);
        throw error;
      }
    }
  }