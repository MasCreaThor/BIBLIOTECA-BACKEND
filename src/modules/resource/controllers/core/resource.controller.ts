// src/modules/resource/controllers/core/resource.controller.ts
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
  import { ResourceService } from '@modules/resource/services/core/resource.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateResourceDto,
    UpdateResourceDto,
    ResourceResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador simplificado para gestión de recursos de la biblioteca
   */
  
  @Controller('resources')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
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
     * Obtener todos los recursos con filtros y paginación
     * GET /api/resources
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('categoryId') categoryId?: string,
      @Query('locationId') locationId?: string,
      @Query('availability') availability?: 'available' | 'borrowed',
      @Query('authorId') authorId?: string,
    ): Promise<ApiResponseDto<PaginatedResponseDto<ResourceResponseDto>>> {
      try {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
  
        const filters: any = {};
  
        if (search && ValidationUtils.isNotEmpty(search)) {
          filters.search = search.trim();
        }
  
        if (categoryId && MongoUtils.isValidObjectId(categoryId)) {
          filters.categoryId = categoryId.trim();
        }
  
        if (locationId && MongoUtils.isValidObjectId(locationId)) {
          filters.locationId = locationId.trim();
        }
  
        if (availability && ['available', 'borrowed'].includes(availability)) {
          filters.availability = availability;
        }
  
        if (authorId && MongoUtils.isValidObjectId(authorId)) {
          filters.authorId = authorId.trim();
        }
  
        this.logger.debug('Finding resources with filters:', filters);
  
        const result = await this.resourceService.findAll(filters, pageNum, limitNum);
  
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
        if (!resource) {
          throw new Error('Recurso no encontrado');
        }
  
        return ApiResponseDto.success(resource!, 'Recurso obtenido exitosamente', HttpStatus.OK);
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
  }