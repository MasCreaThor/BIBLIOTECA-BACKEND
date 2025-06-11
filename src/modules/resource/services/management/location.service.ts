// src/modules/resource/services/management/location.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LocationRepository, ResourceRepository } from '@modules/resource/repositories';
import { LoggerService } from '@shared/services/logger.service';
import {
  CreateLocationDto,
  UpdateLocationDto,
  LocationResponseDto,
} from '@modules/resource/dto';
import { LocationDocument } from '@modules/resource/models';
import { MongoUtils } from '@shared/utils';

@Injectable()
export class LocationService {
  constructor(
    private readonly locationRepository: LocationRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LocationService');
  }

  async create(createLocationDto: CreateLocationDto): Promise<LocationResponseDto> {
    const { name, description, code } = createLocationDto;

    const existingByName = await this.locationRepository.findByName(name);
    if (existingByName) {
      throw new ConflictException('Ya existe una ubicación con este nombre');
    }

    if (code && code.trim()) {
      const existingByCode = await this.locationRepository.findByCode(code);
      if (existingByCode) {
        throw new ConflictException('Ya existe una ubicación con este código');
      }
    }

    const locationData = {
      name: name.trim(),
      description: description.trim(),
      code: code?.trim() || undefined,
      active: true,
    };

    const createdLocation = await this.locationRepository.create(locationData);
    this.logger.log(`Location created successfully: ${name}`);

    return this.mapToResponseDto(createdLocation);
  }

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

  async findAllActive(): Promise<LocationResponseDto[]> {
    const locations = await this.locationRepository.findAllActive();
    return locations.map(location => this.mapToResponseDto(location));
  }

  async update(id: string, updateLocationDto: UpdateLocationDto): Promise<LocationResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de ubicación inválido');
    }

    const existingLocation = await this.locationRepository.findById(id);
    if (!existingLocation) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    const updateData: any = {};

    if (updateLocationDto.name && updateLocationDto.name !== existingLocation.name) {
      const existingByName = await this.locationRepository.findByName(updateLocationDto.name);
      if (existingByName && (existingByName._id as any).toString() !== id) {
        throw new ConflictException('Ya existe una ubicación con este nombre');
      }
      updateData.name = updateLocationDto.name.trim();
    }

    if (updateLocationDto.hasOwnProperty('code')) {
      const newCode = updateLocationDto.code?.trim() || '';
      const currentCode = existingLocation.code || '';
      
      if (newCode && newCode !== currentCode) {
        const existingByCode = await this.locationRepository.findByCode(newCode);
        if (existingByCode && (existingByCode._id as any).toString() !== id) {
          throw new ConflictException('Ya existe una ubicación con este código');
        }
      }
      updateData.code = newCode || undefined;
    }

    // Actualizar descripción si se proporciona
    if (updateLocationDto.description) {
      updateData.description = updateLocationDto.description.trim();
    }

    // Actualizar estado activo si se proporciona
    if (updateLocationDto.active !== undefined) {
      updateData.active = updateLocationDto.active;
    }

    const updatedLocation = await this.locationRepository.update(id, updateData);
    if (!updatedLocation) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    this.logger.log(`Location updated successfully: ${updatedLocation.name}`);
    return this.mapToResponseDto(updatedLocation);
  }

  async delete(id: string): Promise<void> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de ubicación inválido');
    }

    const location = await this.locationRepository.findById(id);
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada');
    }

    // Verificar que no tenga recursos asociados
    const resourceCount = await this.resourceRepository.countByLocation(id);
    if (resourceCount > 0) {
      throw new BadRequestException(
        `No se puede eliminar la ubicación porque tiene ${resourceCount} recursos asociados`
      );
    }

    await this.locationRepository.delete(id);
    this.logger.log(`Location deleted permanently: ${location.name}`);
  }

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