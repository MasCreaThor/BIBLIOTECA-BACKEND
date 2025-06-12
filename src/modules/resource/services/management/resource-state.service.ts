// src/modules/resource/services/management/resource-state.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { ResourceStateRepository, ResourceRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateResourceStateDto,
    UpdateResourceStateDto,
    ResourceStateResponseDto,
  } from '@modules/resource/dto';
  import { ResourceStateDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  @Injectable()
  export class ResourceStateService {
    constructor(
      private readonly resourceStateRepository: ResourceStateRepository,
      private readonly resourceRepository: ResourceRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('ResourceStateService');
    }
  
    async create(createResourceStateDto: CreateResourceStateDto): Promise<ResourceStateResponseDto> {
      const { name, description, color } = createResourceStateDto;
  
      try {
        // Verificar si ya existe
        const existingState = await this.resourceStateRepository.findByName(name);
        if (existingState) {
          throw new ConflictException('Ya existe un estado de recurso con este nombre');
        }
  
        const resourceStateData = {
          name,
          description: description.trim(),
          color: color || this.getDefaultColor(name),
          active: true,
        };
  
        const createdState = await this.resourceStateRepository.create(resourceStateData);
        this.logger.log(`Resource state created successfully: ${name}`);
  
        return this.mapToResponseDto(createdState);
      } catch (error) {
        if (error instanceof ConflictException) {
          throw error;
        }
  
        this.logger.error(`Error creating resource state: ${name}`, error);
        throw new BadRequestException('Error al crear el estado de recurso');
      }
    }
  
    async findById(id: string): Promise<ResourceStateResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de estado de recurso inválido');
      }
  
      const resourceState = await this.resourceStateRepository.findById(id);
      if (!resourceState) {
        throw new NotFoundException('Estado de recurso no encontrado');
      }
  
      return this.mapToResponseDto(resourceState);
    }
  
    async findAllActive(): Promise<ResourceStateResponseDto[]> {
      const resourceStates = await this.resourceStateRepository.findAllActive();
      return resourceStates.map(state => this.mapToResponseDto(state));
    }
  
    async update(id: string, updateResourceStateDto: UpdateResourceStateDto): Promise<ResourceStateResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de estado de recurso inválido');
      }
  
      const existingState = await this.resourceStateRepository.findById(id);
      if (!existingState) {
        throw new NotFoundException('Estado de recurso no encontrado');
      }
  
      try {
        const updateData: any = {};
  
        if (updateResourceStateDto.description) {
          updateData.description = updateResourceStateDto.description.trim();
        }
  
        if (updateResourceStateDto.color) {
          updateData.color = updateResourceStateDto.color;
        }
  
        if (updateResourceStateDto.active !== undefined) {
          updateData.active = updateResourceStateDto.active;
        }
  
        const updatedState = await this.resourceStateRepository.update(id, updateData);
        if (!updatedState) {
          throw new NotFoundException('Estado de recurso no encontrado');
        }
  
        this.logger.log(`Resource state updated successfully: ${updatedState.name}`);
        return this.mapToResponseDto(updatedState);
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        this.logger.error(`Error updating resource state: ${id}`, error);
        throw new BadRequestException('Error al actualizar el estado de recurso');
      }
    }
  
    async activate(id: string): Promise<ResourceStateResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de estado de recurso inválido');
      }
  
      const activatedState = await this.resourceStateRepository.activate(id);
      if (!activatedState) {
        throw new NotFoundException('Estado de recurso no encontrado');
      }
  
      this.logger.log(`Resource state activated: ${activatedState.name}`);
      return this.mapToResponseDto(activatedState);
    }
  
    async deactivate(id: string): Promise<ResourceStateResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de estado de recurso inválido');
      }
  
      const deactivatedState = await this.resourceStateRepository.deactivate(id);
      if (!deactivatedState) {
        throw new NotFoundException('Estado de recurso no encontrado');
      }
  
      this.logger.log(`Resource state deactivated: ${deactivatedState.name}`);
      return this.mapToResponseDto(deactivatedState);
    }
  
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de estado de recurso inválido');
      }
  
      const resourceState = await this.resourceStateRepository.findById(id);
      if (!resourceState) {
        throw new NotFoundException('Estado de recurso no encontrado');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.resourceRepository.count({ stateId: id });
      if (resourceCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar el estado de recurso porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      await this.resourceStateRepository.delete(id);
      this.logger.log(`Resource state deleted permanently: ${resourceState.name}`);
    }
  
    private getDefaultColor(name: 'good' | 'deteriorated' | 'damaged' | 'lost'): string {
      const colors = {
        good: '#28a745',        // Verde
        deteriorated: '#ffc107', // Amarillo
        damaged: '#fd7e14',     // Naranja
        lost: '#dc3545',        // Rojo
      };
      return colors[name];
    }
  
    private mapToResponseDto(resourceState: ResourceStateDocument): ResourceStateResponseDto {
      return {
        _id: (resourceState._id as any).toString(),
        name: resourceState.name,
        description: resourceState.description,
        color: resourceState.color,
        active: resourceState.active,
        createdAt: resourceState.createdAt,
        updatedAt: resourceState.updatedAt,
      };
    }
  }