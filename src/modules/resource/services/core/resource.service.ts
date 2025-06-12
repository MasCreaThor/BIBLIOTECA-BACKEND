// src/modules/resource/services/core/resource.service.ts
import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ResourceRepository,
  CategoryRepository,
  LocationRepository,
  AuthorRepository,
  PublisherRepository,
  ResourceTypeRepository,
  ResourceStateRepository,
} from '@modules/resource/repositories';
import { LoggerService } from '@shared/services/logger.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceResponseDto,
} from '@modules/resource/dto';
import { PaginatedResponseDto } from '@shared/dto/base.dto';
import { ResourceDocument } from '@modules/resource/models';
import { MongoUtils } from '@shared/utils';

/**
 * Servicio simplificado para gestión de recursos de la biblioteca
 */

@Injectable()
export class ResourceService {
  constructor(
    private readonly resourceRepository: ResourceRepository,
    private readonly categoryRepository: CategoryRepository,
    private readonly locationRepository: LocationRepository,
    private readonly authorRepository: AuthorRepository,
    private readonly publisherRepository: PublisherRepository,
    private readonly resourceTypeRepository: ResourceTypeRepository,
    private readonly resourceStateRepository: ResourceStateRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ResourceService');
  }

  /**
   * Crear un nuevo recurso
   */
  async create(createResourceDto: CreateResourceDto): Promise<ResourceResponseDto> {
    // ✅ CORRECCIÓN: Agregar googleBooksId y coverImageUrl a la destructuración
    const { 
      typeId, 
      categoryId, 
      title, 
      authorIds, 
      publisherId, 
      volumes, 
      stateId, 
      locationId, 
      notes, 
      isbn,
      googleBooksId,      // ← AGREGADO
      coverImageUrl       // ← AGREGADO (nota: es coverImageUrl, no imageUrl)
    } = createResourceDto;

    try {
      // Validar que las referencias existan
      await this.validateResourceReferences(createResourceDto);

      // Verificar duplicados por ISBN si se proporciona
      if (isbn) {
        const existingByISBN = await this.resourceRepository.findByISBN(isbn);
        if (existingByISBN) {
          throw new ConflictException('Ya existe un recurso con este ISBN');
        }
      }

      // ✅ CORRECCIÓN: Agregar googleBooksId y coverImageUrl al resourceData
      const resourceData = {
        typeId: MongoUtils.toObjectId(typeId),
        categoryId: MongoUtils.toObjectId(categoryId),
        title: title.trim(),
        authorIds: authorIds ? authorIds.map(id => MongoUtils.toObjectId(id)) : [],
        publisherId: publisherId ? MongoUtils.toObjectId(publisherId) : undefined,
        volumes: volumes || 1,
        stateId: MongoUtils.toObjectId(stateId),
        locationId: MongoUtils.toObjectId(locationId),
        notes: notes?.trim(),
        isbn,
        googleBooksId: googleBooksId?.trim(),      // ← AGREGADO
        coverImageUrl: coverImageUrl?.trim(),      // ← AGREGADO
        available: true,
      };

      const createdResource = await this.resourceRepository.create(resourceData);

      this.logger.log(`Resource created successfully: ${title}${coverImageUrl ? ' with cover image' : ''}`);

      return this.mapToResponseDto(createdResource);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error creating resource: ${title}`, error);
      throw new BadRequestException('Error al crear el recurso');
    }
  }

  /**
   * Obtener recurso por ID
   */
  async findById(id: string): Promise<ResourceResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const resource = await this.resourceRepository.findByIdWithPopulate(id);

    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    return this.mapToResponseDto(resource);
  }

  /**
   * Buscar recursos con filtros y paginación
   */
  async findAll(
    filters: {
      search?: string;
      categoryId?: string;
      locationId?: string;
      availability?: 'available' | 'borrowed';
      authorId?: string;
    } = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponseDto<ResourceResponseDto>> {
    const result = await this.resourceRepository.findWithFilters(filters, page, limit);

    const mappedData = result.data.map((resource) => this.mapToResponseDto(resource));

    return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
  }

  /**
   * Buscar por ISBN
   */
  async findByISBN(isbn: string): Promise<ResourceResponseDto> {
    const resource = await this.resourceRepository.findByISBN(isbn);

    if (!resource) {
      throw new NotFoundException('Recurso no encontrado con ese ISBN');
    }

    return this.mapToResponseDto(resource);
  }

  /**
   * Actualizar recurso
   */
  async update(id: string, updateResourceDto: UpdateResourceDto): Promise<ResourceResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const existingResource = await this.resourceRepository.findById(id);
    if (!existingResource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    try {
      const updateData: any = {};

      // Actualizar campos básicos
      if (updateResourceDto.title) {
        updateData.title = updateResourceDto.title.trim();
      }

      if (updateResourceDto.notes !== undefined) {
        updateData.notes = updateResourceDto.notes?.trim();
      }

      if (updateResourceDto.available !== undefined) {
        updateData.available = updateResourceDto.available;
      }

      // ✅ CORRECCIÓN: Agregar soporte para actualizar coverImageUrl
      if (updateResourceDto.coverImageUrl !== undefined) {
        updateData.coverImageUrl = updateResourceDto.coverImageUrl?.trim();
      }

      // Actualizar referencias
      if (updateResourceDto.categoryId) {
        updateData.categoryId = MongoUtils.toObjectId(updateResourceDto.categoryId);
      }

      if (updateResourceDto.locationId) {
        updateData.locationId = MongoUtils.toObjectId(updateResourceDto.locationId);
      }

      if (updateResourceDto.authorIds) {
        updateData.authorIds = updateResourceDto.authorIds.map(id => MongoUtils.toObjectId(id));
      }

      const updatedResource = await this.resourceRepository.update(id, updateData);

      if (!updatedResource) {
        throw new NotFoundException('Recurso no encontrado');
      }

      this.logger.log(`Resource updated successfully: ${updatedResource.title}`);

      return this.mapToResponseDto(updatedResource);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error updating resource: ${id}`, error);
      throw new BadRequestException('Error al actualizar el recurso');
    }
  }

  /**
   * Eliminar recurso
   */
  async delete(id: string): Promise<void> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const resource = await this.resourceRepository.findById(id);
    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    const deleted = await this.resourceRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('Recurso no encontrado');
    }

    this.logger.log(`Resource deleted permanently: ${resource.title}`);
  }

  /**
   * Actualizar disponibilidad del recurso
   */
  async updateAvailability(id: string, available: boolean): Promise<ResourceResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const updatedResource = await this.resourceRepository.updateAvailability(id, available);

    if (!updatedResource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    this.logger.log(`Resource availability updated: ${updatedResource.title} - Available: ${available}`);

    return this.mapToResponseDto(updatedResource);
  }

  /**
   * Validar que todas las referencias existan
   */
  private async validateResourceReferences(resourceData: CreateResourceDto): Promise<void> {
    // Validar tipo de recurso
    const resourceType = await this.resourceTypeRepository.findById(resourceData.typeId);
    if (!resourceType || !resourceType.active) {
      throw new BadRequestException('Tipo de recurso no válido');
    }

    // Validar categoría
    const category = await this.categoryRepository.findById(resourceData.categoryId);
    if (!category || !category.active) {
      throw new BadRequestException('Categoría no válida');
    }

    // Validar estado
    const state = await this.resourceStateRepository.findById(resourceData.stateId);
    if (!state || !state.active) {
      throw new BadRequestException('Estado de recurso no válido');
    }

    // Validar ubicación
    const location = await this.locationRepository.findById(resourceData.locationId);
    if (!location || !location.active) {
      throw new BadRequestException('Ubicación no válida');
    }

    // Validar autores si existen
    if (resourceData.authorIds && resourceData.authorIds.length > 0) {
      for (const authorId of resourceData.authorIds) {
        const author = await this.authorRepository.findById(authorId);
        if (!author || !author.active) {
          throw new BadRequestException(`Autor no válido: ${authorId}`);
        }
      }
    }

    // Validar editorial si existe
    if (resourceData.publisherId) {
      const publisher = await this.publisherRepository.findById(resourceData.publisherId);
      if (!publisher || !publisher.active) {
        throw new BadRequestException('Editorial no válida');
      }
    }
  }

  /**
   * ✅ CORRECCIÓN: Mapear entidad a DTO de respuesta (incluir campos faltantes)
   */
  private mapToResponseDto(resource: ResourceDocument): ResourceResponseDto {
    return {
      _id: (resource._id as any).toString(),
      typeId: resource.typeId.toString(),
      categoryId: resource.categoryId.toString(),
      title: resource.title,
      authorIds: resource.authorIds.map(id => id.toString()),
      publisherId: resource.publisherId?.toString(),
      volumes: resource.volumes,
      stateId: resource.stateId.toString(),
      locationId: resource.locationId.toString(),
      notes: resource.notes,
      available: resource.available,
      isbn: resource.isbn,
      googleBooksId: resource.googleBooksId,        // ← AGREGADO
      coverImageUrl: resource.coverImageUrl,        // ← AGREGADO
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}