// src/modules/resource/controllers/location.controller.ts
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
  import { LocationService } from '@modules/resource/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateLocationDto,
    UpdateLocationDto,
    LocationResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador para gestión de ubicaciones/estantes de recursos
   */
  
  @Controller('locations')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
  export class LocationController {
    constructor(
      private readonly locationService: LocationService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('LocationController');
    }
  
    /**
     * Crear una nueva ubicación
     * POST /api/locations
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createLocationDto: CreateLocationDto,
    ): Promise<ApiResponseDto<LocationResponseDto>> {
      try {
        this.logger.log(`Creating location: ${createLocationDto.name}`);
  
        const location = await this.locationService.create(createLocationDto);
  
        return ApiResponseDto.success(location, 'Ubicación creada exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating location: ${createLocationDto.name}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener todas las ubicaciones con filtros y paginación
     * GET /api/locations
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('active') active?: string,
    ): Promise<ApiResponseDto<PaginatedResponseDto<LocationResponseDto>>> {
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
  
        this.logger.debug('Finding locations with filters:', filters);
  
        const result = await this.locationService.findAll(filters, pageNum, limitNum);
  
        return ApiResponseDto.success(result, 'Ubicaciones obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding locations', error);
        throw error;
      }
    }
  
    /**
     * Obtener todas las ubicaciones activas (para formularios)
     * GET /api/locations/active
     */
    @Get('active')
    async findAllActive(): Promise<ApiResponseDto<LocationResponseDto[]>> {
      try {
        this.logger.debug('Finding all active locations');
  
        const locations = await this.locationService.findAllActive();
  
        return ApiResponseDto.success(
          locations,
          'Ubicaciones activas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active locations', error);
        throw error;
      }
    }
  
    /**
     * Obtener ubicación por ID
     * GET /api/locations/:id
     */
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<LocationResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid location ID format: ${id}`);
          throw new Error('ID de ubicación inválido');
        }
  
        this.logger.debug(`Finding location by ID: ${id}`);
  
        const location = await this.locationService.findById(id);
  
        return ApiResponseDto.success(location, 'Ubicación obtenida exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding location by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar ubicación por código
     * GET /api/locations/code/:code
     */
    @Get('code/:code')
    async findByCode(@Param('code') code: string): Promise<ApiResponseDto<LocationResponseDto>> {
      try {
        if (!ValidationUtils.isNotEmpty(code)) {
          this.logger.warn(`Invalid location code: ${code}`);
          throw new Error('Código de ubicación inválido');
        }
  
        this.logger.debug(`Finding location by code: ${code}`);
  
        const location = await this.locationService.findByCode(code);
  
        return ApiResponseDto.success(location, 'Ubicación obtenida exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding location by code: ${code}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar ubicación
     * PUT /api/locations/:id
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateLocationDto: UpdateLocationDto,
    ): Promise<ApiResponseDto<LocationResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid location ID format: ${id}`);
          throw new Error('ID de ubicación inválido');
        }
  
        this.logger.log(`Updating location: ${id}`);
  
        const location = await this.locationService.update(id, updateLocationDto);
  
        return ApiResponseDto.success(location, 'Ubicación actualizada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error updating location: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Desactivar ubicación
     * PUT /api/locations/:id/deactivate
     */
    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string): Promise<ApiResponseDto<LocationResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid location ID format: ${id}`);
          throw new Error('ID de ubicación inválido');
        }
  
        this.logger.log(`Deactivating location: ${id}`);
  
        const location = await this.locationService.deactivate(id);
  
        return ApiResponseDto.success(location, 'Ubicación desactivada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deactivating location: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Activar ubicación
     * PUT /api/locations/:id/activate
     */
    @Put(':id/activate')
    async activate(@Param('id') id: string): Promise<ApiResponseDto<LocationResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid location ID format: ${id}`);
          throw new Error('ID de ubicación inválido');
        }
  
        this.logger.log(`Activating location: ${id}`);
  
        const location = await this.locationService.activate(id);
  
        return ApiResponseDto.success(location, 'Ubicación activada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error activating location: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar ubicación permanentemente
     * DELETE /api/locations/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid location ID format: ${id}`);
          throw new Error('ID de ubicación inválido');
        }
  
        this.logger.log(`Deleting location permanently: ${id}`);
  
        await this.locationService.delete(id);
  
        return ApiResponseDto.success(null, 'Ubicación eliminada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting location: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener ubicaciones más utilizadas
     * GET /api/locations/stats/most-used
     */
    @Get('stats/most-used')
    async getMostUsedLocations(
      @Query('limit') limit: string = '10',
    ): Promise<
      ApiResponseDto<
        Array<{
          _id: string;
          name: string;
          description: string;
          code?: string;
          resourceCount: number;
        }>
      >
    > {
      try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Máximo 50
  
        this.logger.debug(`Getting most used locations (limit: ${limitNum})`);
  
        const locations = await this.locationService.getMostUsedLocations(limitNum);
  
        return ApiResponseDto.success(
          locations,
          'Ubicaciones más utilizadas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting most used locations', error);
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de ubicaciones
     * GET /api/locations/stats/summary
     */
    @Get('stats/summary')
    async getStatistics(): Promise<
      ApiResponseDto<{
        total: number;
        active: number;
        inactive: number;
        withResources: number;
        averageResourcesPerLocation: number;
        mostUsed: Array<{ name: string; count: number }>;
      }>
    > {
      try {
        this.logger.debug('Getting location statistics');
  
        const stats = await this.locationService.getStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting location statistics', error);
        throw error;
      }
    }
  }