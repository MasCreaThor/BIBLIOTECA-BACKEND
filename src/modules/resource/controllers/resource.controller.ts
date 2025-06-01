// src/modules/resource/controllers/resource.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { ResourceService } from '@modules/resource/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateResourceDto,
    UpdateResourceDto,
    ResourceResponseDto,
    ResourceSearchDto,
    ResourceFromGoogleBooksDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador para gestión de recursos de la biblioteca
   */
  
  @Controller('resources')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
  export class ResourceController {
    constructor(
      private readonly resourceService: ResourceService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('ResourceController');
    }
  
    /**
     * Crear un nuevo recurso
     * POST /api/resources
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createResourceDto: CreateResourceDto,
    ): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        this.logger.log(`Creating resource: ${createResourceDto.title}`);
  
        const resource = await this.resourceService.create(createResourceDto);
  
        return ApiResponseDto.success(resource, 'Recurso creado exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating resource: ${createResourceDto.title}`, error);
        throw error;
      }
    }
  
    /**
     * Crear recurso desde Google Books
     * POST /api/resources/from-google-books
     */
    @Post('from-google-books')
    @HttpCode(HttpStatus.CREATED)
    async createFromGoogleBooks(
      @Body() createDto: ResourceFromGoogleBooksDto,
    ): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        this.logger.log(`Creating resource from Google Books: ${createDto.googleBooksId}`);
  
        const resource = await this.resourceService.createFromGoogleBooks(createDto);
  
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
     * Obtener todos los recursos con filtros y paginación
     * GET /api/resources
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('resourceType') resourceType?: 'book' | 'game' | 'map' | 'bible',
      @Query('categoryId') categoryId?: string,
      @Query('locationId') locationId?: string,
      @Query('stateId') stateId?: string,
      @Query('availability') availability?: 'available' | 'borrowed',
      @Query('isbn') isbn?: string,
      @Query('author') author?: string,
      @Query('publisher') publisher?: string,
      @Query('sortBy') sortBy?: string,
      @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ): Promise<ApiResponseDto<PaginatedResponseDto<ResourceResponseDto>>> {
      try {
        const searchDto: ResourceSearchDto = {
          page: parseInt(page, 10) || 1,
          limit: Math.min(parseInt(limit, 10) || 20, 100), // Máximo 100
          sortBy: sortBy || 'title',
          sortOrder: sortOrder || 'asc',
        };
  
        if (search && ValidationUtils.isNotEmpty(search)) {
          searchDto.search = search.trim();
        }
  
        if (resourceType && ['book', 'game', 'map', 'bible'].includes(resourceType)) {
          searchDto.resourceType = resourceType;
        }
  
        if (categoryId && MongoUtils.isValidObjectId(categoryId)) {
          searchDto.categoryId = categoryId.trim();
        }
  
        if (locationId && MongoUtils.isValidObjectId(locationId)) {
          searchDto.locationId = locationId.trim();
        }
  
        if (stateId && MongoUtils.isValidObjectId(stateId)) {
          searchDto.stateId = stateId.trim();
        }
  
        if (availability && ['available', 'borrowed'].includes(availability)) {
          searchDto.availability = availability;
        }
  
        if (isbn && ValidationUtils.isNotEmpty(isbn)) {
          searchDto.isbn = isbn.trim();
        }
  
        if (author && ValidationUtils.isNotEmpty(author)) {
          searchDto.author = author.trim();
        }
  
        if (publisher && ValidationUtils.isNotEmpty(publisher)) {
          searchDto.publisher = publisher.trim();
        }
  
        this.logger.debug('Finding resources with filters:', searchDto);
  
        const result = await this.resourceService.findAll(searchDto);
  
        return ApiResponseDto.success(result, 'Recursos obtenidos exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding resources', error);
        throw error;
      }
    }
  
    /**
     * Obtener recurso por ID
     * GET /api/resources/:id
     */
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource ID format: ${id}`);
          throw new Error('ID de recurso inválido');
        }
  
        this.logger.debug(`Finding resource by ID: ${id}`);
  
        const resource = await this.resourceService.findById(id);
  
        return ApiResponseDto.success(resource, 'Recurso obtenido exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding resource by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar recurso por ISBN
     * GET /api/resources/isbn/:isbn
     */
    @Get('isbn/:isbn')
    async findByISBN(@Param('isbn') isbn: string): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        if (!ValidationUtils.isNotEmpty(isbn)) {
          this.logger.warn(`Invalid ISBN: ${isbn}`);
          throw new Error('ISBN inválido');
        }
  
        this.logger.debug(`Finding resource by ISBN: ${isbn}`);
  
        const resource = await this.resourceService.findByISBN(isbn);
  
        return ApiResponseDto.success(resource, 'Recurso obtenido exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding resource by ISBN: ${isbn}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar recurso
     * PUT /api/resources/:id
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateResourceDto: UpdateResourceDto,
    ): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource ID format: ${id}`);
          throw new Error('ID de recurso inválido');
        }
  
        this.logger.log(`Updating resource: ${id}`);
  
        const resource = await this.resourceService.update(id, updateResourceDto);
  
        return ApiResponseDto.success(resource, 'Recurso actualizado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error updating resource: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar disponibilidad del recurso
     * PUT /api/resources/:id/availability
     */
    @Put(':id/availability')
    async updateAvailability(
      @Param('id') id: string,
      @Body() body: { available: boolean },
    ): Promise<ApiResponseDto<ResourceResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource ID format: ${id}`);
          throw new Error('ID de recurso inválido');
        }
  
        this.logger.log(`Updating resource availability: ${id} - Available: ${body.available}`);
  
        const resource = await this.resourceService.updateAvailability(id, body.available);
  
        return ApiResponseDto.success(
          resource,
          'Disponibilidad del recurso actualizada exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error updating resource availability: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar recurso permanentemente
     * DELETE /api/resources/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource ID format: ${id}`);
          throw new Error('ID de recurso inválido');
        }
  
        this.logger.log(`Deleting resource permanently: ${id}`);
  
        await this.resourceService.delete(id);
  
        return ApiResponseDto.success(null, 'Recurso eliminado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting resource: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener recursos más prestados
     * GET /api/resources/stats/most-borrowed
     */
    @Get('stats/most-borrowed')
    async getMostBorrowedResources(
      @Query('limit') limit: string = '10',
    ): Promise<ApiResponseDto<ResourceResponseDto[]>> {
      try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Máximo 50
  
        this.logger.debug(`Getting most borrowed resources (limit: ${limitNum})`);
  
        const resources = await this.resourceService.getMostBorrowedResources(limitNum);
  
        return ApiResponseDto.success(
          resources,
          'Recursos más prestados obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting most borrowed resources', error);
        throw error;
      }
    }
  
    /**
     * Obtener recursos menos prestados
     * GET /api/resources/stats/least-borrowed
     */
    @Get('stats/least-borrowed')
    async getLeastBorrowedResources(
      @Query('limit') limit: string = '10',
    ): Promise<ApiResponseDto<ResourceResponseDto[]>> {
      try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Máximo 50
  
        this.logger.debug(`Getting least borrowed resources (limit: ${limitNum})`);
  
        const resources = await this.resourceService.getLeastBorrowedResources(limitNum);
  
        return ApiResponseDto.success(
          resources,
          'Recursos menos prestados obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting least borrowed resources', error);
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de recursos
     * GET /api/resources/stats/summary
     */
    @Get('stats/summary')
    async getStatistics(): Promise<
      ApiResponseDto<{
        total: number;
        available: number;
        borrowed: number;
        byType: Array<{ type: string; count: number }>;
        byCategory: Array<{ category: string; count: number }>;
        byState: Array<{ state: string; count: number }>;
      }>
    > {
      try {
        this.logger.debug('Getting resource statistics');
  
        const stats = await this.resourceService.getStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting resource statistics', error);
        throw error;
      }
    }
  }