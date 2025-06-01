// src/modules/resource/services/location.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
  } from '@nestjs/common';
  import { LocationRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateLocationDto,
    UpdateLocationDto,
    LocationResponseDto,
  } from '@modules/resource/dto';
  import { PaginatedResponseDto } from '@shared/dto/base.dto';
  import { LocationDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  /**
   * Servicio para gestión de ubicaciones/estantes de recursos
   */
  
  @Injectable()
  export class LocationService {
    constructor(
      private readonly locationRepository: LocationRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('LocationService');
    }
  
    /**
     * Crear nueva ubicación
     */
    async create(createLocationDto: CreateLocationDto): Promise<LocationResponseDto> {
      const { name, description, code } = createLocationDto;
  
      try {
        // Verificar si ya existe una ubicación con el mismo nombre
        const existingByName = await this.locationRepository.findByName(name);
        if (existingByName) {
          throw new ConflictException('Ya existe una ubicación con este nombre');
        }
  
        // Verificar si ya existe una ubicación con el mismo código (si se proporciona)
        if (code) {
          const existingByCode = await this.locationRepository.findByCode(code);
          if (existingByCode) {
            throw new ConflictException('Ya existe una ubicación con este código');
          }
        }
  
        const locationData = {
          name: name.trim(),
          description: description.trim(),
          code: code?.trim(),
          active: true,
        };
  
        const createdLocation = await this.locationRepository.create(locationData);
  
        this.logger.log(`Location created successfully: ${name}`);
  
        return this.mapToResponseDto(createdLocation);
      } catch (error) {
        if (error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
  
        this.logger.error(`Error creating location: ${name}`, error);
        throw new BadRequestException('Error al crear la ubicación');
      }
    }
  
    /**
     * Obtener ubicación por ID
     */
    async findById(id: string): Promise<LocationResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de ubicación inválido');
      }
  
      const location = await this.locationRepository.findById(id);
  
      if (!location) {
        throw new NotFoundException('Ubicación no encontrada');
      }
  
      return this.mapToResponseDto(location);
    }
  
    /**
     * Obtener todas las ubicaciones con filtros y paginación
     */
    async findAll(
      filters: {
        search?: string;
        active?: boolean;
      } = {},
      page: number = 1,
      limit: number = 20,
    ): Promise<PaginatedResponseDto<LocationResponseDto>> {
      const result = await this.locationRepository.findWithFilters(filters, page, limit);
  
      const mappedData = result.data.map((location) => this.mapToResponseDto(location));
  
      return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
    }
  
    /**
     * Obtener todas las ubicaciones activas
     */
    async findAllActive(): Promise<LocationResponseDto[]> {
      const locations = await this.locationRepository.findAllActive();
      return locations.map(location => this.mapToResponseDto(location));
    }
  
    /**
     * Buscar ubicación por código
     */
    async findByCode(code: string): Promise<LocationResponseDto> {
      const location = await this.locationRepository.findByCode(code);
  
      if (!location) {
        throw new NotFoundException('Ubicación no encontrada con ese código');
      }
  
      return this.mapToResponseDto(location);
    }
  
    /**
     * Actualizar ubicación
     */
    async update(id: string, updateLocationDto: UpdateLocationDto): Promise<LocationResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de ubicación inválido');
      }
  
      const existingLocation = await this.locationRepository.findById(id);
      if (!existingLocation) {
        throw new NotFoundException('Ubicación no encontrada');
      }
  
      try {
        const updateData: any = {};
  
        // Verificar nombre único si se actualiza
        if (updateLocationDto.name && updateLocationDto.name !== existingLocation.name) {
          const existingByName = await this.locationRepository.findByName(updateLocationDto.name);
          if (existingByName && (existingByName._id as any).toString() !== id) {
            throw new ConflictException('Ya existe una ubicación con este nombre');
          }
          updateData.name = updateLocationDto.name.trim();
        }
  
        // Verificar código único si se actualiza
        if (updateLocationDto.code && updateLocationDto.code !== existingLocation.code) {
          const existingByCode = await this.locationRepository.findByCode(updateLocationDto.code);
          if (existingByCode && (existingByCode._id as any).toString() !== id) {
            throw new ConflictException('Ya existe una ubicación con este código');
          }
          updateData.code = updateLocationDto.code.trim();
        }
  
        // Actualizar otros campos
        if (updateLocationDto.description) {
          updateData.description = updateLocationDto.description.trim();
        }
  
        if (updateLocationDto.active !== undefined) {
          updateData.active = updateLocationDto.active;
        }
  
        const updatedLocation = await this.locationRepository.update(id, updateData);
  
        if (!updatedLocation) {
          throw new NotFoundException('Ubicación no encontrada');
        }
  
        this.logger.log(`Location updated successfully: ${updatedLocation.name}`);
  
        return this.mapToResponseDto(updatedLocation);
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
  
        this.logger.error(`Error updating location: ${id}`, error);
        throw new BadRequestException('Error al actualizar la ubicación');
      }
    }
  
    /**
     * Desactivar ubicación
     */
    async deactivate(id: string): Promise<LocationResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de ubicación inválido');
      }
  
      // Verificar que no tenga recursos asociados antes de desactivar
      const resourceCount = await this.locationRepository.countResourcesByLocation(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede desactivar la ubicación porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deactivatedLocation = await this.locationRepository.deactivate(id);
  
      if (!deactivatedLocation) {
        throw new NotFoundException('Ubicación no encontrada');
      }
  
      this.logger.log(`Location deactivated: ${deactivatedLocation.name}`);
  
      return this.mapToResponseDto(deactivatedLocation);
    }
  
    /**
     * Activar ubicación
     */
    async activate(id: string): Promise<LocationResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de ubicación inválido');
      }
  
      const activatedLocation = await this.locationRepository.activate(id);
  
      if (!activatedLocation) {
        throw new NotFoundException('Ubicación no encontrada');
      }
  
      this.logger.log(`Location activated: ${activatedLocation.name}`);
  
      return this.mapToResponseDto(activatedLocation);
    }
  
    /**
     * Eliminar ubicación permanentemente
     */
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de ubicación inválido');
      }
  
      const location = await this.locationRepository.findById(id);
      if (!location) {
        throw new NotFoundException('Ubicación no encontrada');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.locationRepository.countResourcesByLocation(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede eliminar la ubicación porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deleted = await this.locationRepository.delete(id);
  
      if (!deleted) {
        throw new NotFoundException('Ubicación no encontrada');
      }
  
      this.logger.log(`Location deleted permanently: ${location.name}`);
    }
  
    /**
     * Obtener ubicaciones más utilizadas
     */
    async getMostUsedLocations(limit: number = 10): Promise<Array<{
      _id: string;
      name: string;
      description: string;
      code?: string;
      resourceCount: number;
    }>> {
      return this.locationRepository.getMostUsedLocations(limit);
    }
  
    /**
     * Obtener estadísticas de ubicaciones
     */
    async getStatistics(): Promise<{
      total: number;
      active: number;
      inactive: number;
      withResources: number;
      averageResourcesPerLocation: number;
      mostUsed: Array<{ name: string; count: number }>;
    }> {
      const [locationStats, mostUsed] = await Promise.all([
        this.locationRepository.getLocationStatistics(),
        this.locationRepository.getMostUsedLocations(5),
      ]);
  
      return {
        ...locationStats,
        inactive: locationStats.total - locationStats.active,
        mostUsed: mostUsed.map(location => ({
          name: location.name,
          count: location.resourceCount,
        })),
      };
    }
  
    /**
     * Mapear entidad a DTO de respuesta
     */
    private mapToResponseDto(location: LocationDocument): LocationResponseDto {
      return {
        _id: (location._id as any).toString(),
        name: location.name,
        description: location.description,
        code: location.code,
        active: location.active,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt,
      };
    }
  }