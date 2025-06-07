// src/modules/resource/controllers/management/location.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
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
  import { MongoUtils } from '@shared/utils';
  
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
  