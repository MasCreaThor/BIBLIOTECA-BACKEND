// src/modules/resource/controllers/management/location.controller.ts
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
  import { LocationService } from '@modules/resource/services/management/location.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateLocationDto,
    UpdateLocationDto,
    LocationResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { MongoUtils, ValidationUtils } from '@shared/utils';
  
  @Controller('locations')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class LocationController {
    constructor(
      private readonly locationService: LocationService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('LocationController');
    }
  
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
  
    @Get()
    async findAll(
      @Query('search') search?: string,
      @Query('active') active?: string,
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('sortBy') sortBy: string = 'name',
      @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    ): Promise<ApiResponseDto<any>> {
      try {
        // Validar y parsear parámetros
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
        
        // Construir filtros
        const filters: any = {};
        
        if (search && ValidationUtils.isNotEmpty(search)) {
          filters.search = search.trim();
        }
        
        if (active !== undefined) {
          filters.active = active === 'true';
        }
        
        filters.page = pageNum;
        filters.limit = limitNum;
        filters.sortBy = sortBy;
        filters.sortOrder = sortOrder;

        this.logger.debug('Finding locations with filters:', filters);
        
        const result = await this.locationService.findWithFilters(filters);
        
        return ApiResponseDto.success(
          result,
          'Ubicaciones obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding locations', error);
        throw error;
      }
    }

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
  }
  