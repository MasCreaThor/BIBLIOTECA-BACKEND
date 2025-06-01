// src/modules/resource/controllers/publisher.controller.ts
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
  import { PublisherService } from '@modules/resource/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreatePublisherDto,
    UpdatePublisherDto,
    PublisherResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador para gestión de editoriales
   */
  
  @Controller('publishers')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
  export class PublisherController {
    constructor(
      private readonly publisherService: PublisherService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('PublisherController');
    }
  
    /**
     * Crear una nueva editorial
     * POST /api/publishers
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createPublisherDto: CreatePublisherDto,
    ): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        this.logger.log(`Creating publisher: ${createPublisherDto.name}`);
  
        const publisher = await this.publisherService.create(createPublisherDto);
  
        return ApiResponseDto.success(publisher, 'Editorial creada exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating publisher: ${createPublisherDto.name}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener todas las editoriales con filtros y paginación
     * GET /api/publishers
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('active') active?: string,
    ): Promise<ApiResponseDto<PaginatedResponseDto<PublisherResponseDto>>> {
      try {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Máximo 100
  
        const filters: any = {};
  
        if (search && ValidationUtils.isNotEmpty(search)) {
          filters.search = search.trim();
        }
  
        if (active !== undefined) {
          filters.active = active === 'true';
        }
  
        this.logger.debug('Finding publishers with filters:', filters);
  
        const result = await this.publisherService.findAll(filters, pageNum, limitNum);
  
        return ApiResponseDto.success(result, 'Editoriales obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding publishers', error);
        throw error;
      }
    }
  
    /**
     * Obtener todas las editoriales activas (para formularios)
     * GET /api/publishers/active
     */
    @Get('active')
    async findAllActive(): Promise<ApiResponseDto<PublisherResponseDto[]>> {
      try {
        this.logger.debug('Finding all active publishers');
  
        const publishers = await this.publisherService.findAllActive();
  
        return ApiResponseDto.success(
          publishers,
          'Editoriales activas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active publishers', error);
        throw error;
      }
    }
  
    /**
     * Buscar editoriales por texto
     * GET /api/publishers/search
     */
    @Get('search')
    async searchByText(
      @Query('q') query?: string,
      @Query('limit') limit: string = '20',
    ): Promise<ApiResponseDto<PublisherResponseDto[]>> {
      try {
        if (!query || !ValidationUtils.isNotEmpty(query)) {
          this.logger.warn('Search query is required');
          throw new Error('El término de búsqueda es requerido');
        }
  
        const limitNum = Math.min(parseInt(limit, 10) || 20, 50); // Máximo 50
  
        this.logger.debug(`Searching publishers by text: ${query}`);
  
        const publishers = await this.publisherService.searchByText(query.trim(), limitNum);
  
        return ApiResponseDto.success(
          publishers,
          'Búsqueda de editoriales completada exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error searching publishers by text: ${query}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener editorial por ID
     * GET /api/publishers/:id
     */
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.debug(`Finding publisher by ID: ${id}`);
  
        const publisher = await this.publisherService.findById(id);
  
        return ApiResponseDto.success(publisher, 'Editorial obtenida exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding publisher by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar editorial por nombre
     * GET /api/publishers/name/:name
     */
    @Get('name/:name')
    async findByName(@Param('name') name: string): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!ValidationUtils.isNotEmpty(name)) {
          this.logger.warn(`Invalid publisher name: ${name}`);
          throw new Error('Nombre de editorial inválido');
        }
  
        this.logger.debug(`Finding publisher by name: ${name}`);
  
        const publisher = await this.publisherService.findByName(name);
  
        return ApiResponseDto.success(publisher, 'Editorial obtenida exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding publisher by name: ${name}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar editorial
     * PUT /api/publishers/:id
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updatePublisherDto: UpdatePublisherDto,
    ): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.log(`Updating publisher: ${id}`);
  
        const publisher = await this.publisherService.update(id, updatePublisherDto);
  
        return ApiResponseDto.success(publisher, 'Editorial actualizada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error updating publisher: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Desactivar editorial
     * PUT /api/publishers/:id/deactivate
     */
    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.log(`Deactivating publisher: ${id}`);
  
        const publisher = await this.publisherService.deactivate(id);
  
        return ApiResponseDto.success(publisher, 'Editorial desactivada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deactivating publisher: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Activar editorial
     * PUT /api/publishers/:id/activate
     */
    @Put(':id/activate')
    async activate(@Param('id') id: string): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.log(`Activating publisher: ${id}`);
  
        const publisher = await this.publisherService.activate(id);
  
        return ApiResponseDto.success(publisher, 'Editorial activada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error activating publisher: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar editorial permanentemente
     * DELETE /api/publishers/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.log(`Deleting publisher permanently: ${id}`);
  
        await this.publisherService.delete(id);
  
        return ApiResponseDto.success(null, 'Editorial eliminada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting publisher: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener editoriales más activas
     * GET /api/publishers/stats/most-active
     */
    @Get('stats/most-active')
    async getMostActivePublishers(
      @Query('limit') limit: string = '10',
    ): Promise<
      ApiResponseDto<
        Array<{
          _id: string;
          name: string;
          description?: string;
          resourceCount: number;
        }>
      >
    > {
      try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Máximo 50
  
        this.logger.debug(`Getting most active publishers (limit: ${limitNum})`);
  
        const publishers = await this.publisherService.getMostActivePublishers(limitNum);
  
        return ApiResponseDto.success(
          publishers,
          'Editoriales más activas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting most active publishers', error);
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de editoriales
     * GET /api/publishers/stats/summary
     */
    @Get('stats/summary')
    async getStatistics(): Promise<
      ApiResponseDto<{
        total: number;
        active: number;
        inactive: number;
        withResources: number;
        fromGoogleBooks: number;
        mostActive: Array<{ name: string; resourceCount: number }>;
      }>
    > {
      try {
        this.logger.debug('Getting publisher statistics');
  
        const stats = await this.publisherService.getStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting publisher statistics', error);
        throw error;
      }
    }
  
    /**
     * Crear o encontrar editorial por nombre
     * POST /api/publishers/find-or-create
     */
    @Post('find-or-create')
    @HttpCode(HttpStatus.CREATED)
    async findOrCreateByName(
      @Body() body: { name: string },
    ): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!body.name || !ValidationUtils.isNotEmpty(body.name)) {
          this.logger.warn('Publisher name is required');
          throw new Error('El nombre de la editorial es requerido');
        }
  
        this.logger.log(`Finding or creating publisher: ${body.name}`);
  
        const publisher = await this.publisherService.findOrCreateByName(body.name);
  
        return ApiResponseDto.success(
          publisher,
          'Editorial creada/encontrada exitosamente',
          HttpStatus.CREATED,
        );
      } catch (error) {
        this.logger.error(`Error finding or creating publisher: ${body.name}`, error);
        throw error;
      }
    }
  }