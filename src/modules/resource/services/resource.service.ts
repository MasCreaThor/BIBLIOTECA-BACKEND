// src/modules/resource/services/resource.service.ts
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
import { GoogleBooksAdapter } from '../../../adapters/google-books.adapter';
import { LoggerService } from '@shared/services/logger.service';
import {
  CreateResourceDto,
  UpdateResourceDto,
  ResourceResponseDto,
  ResourceSearchDto,
  GoogleBooksVolumeDto,
  ResourceFromGoogleBooksDto,
} from '@modules/resource/dto';
import { PaginatedResponseDto } from '@shared/dto/base.dto';
import { ResourceDocument } from '@modules/resource/models';
import { MongoUtils } from '@shared/utils';

/**
 * Servicio para gestión de recursos de la biblioteca
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
    private readonly googleBooksAdapter: GoogleBooksAdapter,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('ResourceService');
  }

  /**
   * Crear un nuevo recurso
   */
  async create(createResourceDto: CreateResourceDto): Promise<ResourceResponseDto> {
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
      googleBooksId, 
      isbn 
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

      // Verificar duplicados por Google Books ID si se proporciona
      if (googleBooksId) {
        const existingByGoogleId = await this.resourceRepository.findByGoogleBooksId(googleBooksId);
        if (existingByGoogleId) {
          throw new ConflictException('Ya existe un recurso con este ID de Google Books');
        }
      }

      // Crear recurso
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
        googleBooksId,
        isbn,
        available: true,
        totalLoans: 0,
      };

      const createdResource = await this.resourceRepository.create(resourceData);

      this.logger.log(`Resource created successfully: ${title}`);

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
   * Crear recurso desde Google Books
   */
  async createFromGoogleBooks(createDto: ResourceFromGoogleBooksDto): Promise<ResourceResponseDto> {
    const { googleBooksId, categoryId, stateId, locationId, volumes, notes } = createDto;

    try {
      // Obtener información del libro desde Google Books
      const bookData = await this.googleBooksAdapter.getVolumeById(googleBooksId);
      if (!bookData) {
        throw new NotFoundException('No se encontró el libro en Google Books');
      }

      // Verificar que no exista ya
      const existing = await this.resourceRepository.findByGoogleBooksId(googleBooksId);
      if (existing) {
        throw new ConflictException('Este libro ya está registrado en la biblioteca');
      }

      // Obtener o crear autores
      const authors = await this.authorRepository.findOrCreateByNames(bookData.authors || []);
      const authorIds = authors.map(author => (author._id as any).toString());

      // Obtener o crear editorial si existe
      let publisherId: string | undefined;
      if (bookData.publisher) {
        const publisher = await this.publisherRepository.findOrCreateByName(bookData.publisher);
        publisherId = (publisher._id as any).toString();
      }

      // Obtener el tipo de libro
      const bookType = await this.resourceTypeRepository.getBookType();
      if (!bookType) {
        throw new BadRequestException('Tipo de recurso "book" no encontrado');
      }

      // Extraer ISBN
      const isbn = this.googleBooksAdapter.extractISBN(bookData);

      // Crear el recurso
      const createResourceDto: CreateResourceDto = {
        typeId: (bookType._id as any).toString(),
        categoryId,
        title: bookData.title,
        authorIds,
        publisherId,
        volumes: volumes || 1,
        stateId,
        locationId,
        notes,
        googleBooksId,
        isbn: isbn || undefined,
      };

      const resource = await this.create(createResourceDto);

      this.logger.log(`Resource created from Google Books: ${bookData.title}`);

      return resource;
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error creating resource from Google Books: ${googleBooksId}`, error);
      throw new BadRequestException('Error al crear el recurso desde Google Books');
    }
  }

  /**
   * Obtener recurso por ID
   */
  async findById(id: string): Promise<ResourceResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const resource = await this.resourceRepository.findByIdWithFullPopulate(id);

    if (!resource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    return this.mapToResponseDto(resource);
  }

  /**
   * Buscar recursos con filtros y paginación
   */
  async findAll(searchDto: ResourceSearchDto): Promise<PaginatedResponseDto<ResourceResponseDto>> {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      resourceType, 
      categoryId, 
      locationId, 
      stateId, 
      availability, 
      isbn, 
      author, 
      publisher,
      sortBy = 'title',
      sortOrder = 'asc'
    } = searchDto;

    const filters: any = {};

    if (search) {
      filters.search = search;
    }

    if (resourceType) {
      filters.resourceType = resourceType;
    }

    if (categoryId) {
      filters.categoryId = categoryId;
    }

    if (locationId) {
      filters.locationId = locationId;
    }

    if (stateId) {
      filters.stateId = stateId;
    }

    if (availability) {
      filters.availability = availability;
    }

    if (isbn) {
      filters.isbn = isbn;
    }

    // Para búsquedas por autor, necesitamos obtener el ID del autor
    if (author) {
      const authorDoc = await this.authorRepository.findByName(author);
      if (authorDoc) {
        filters.authorId = (authorDoc._id as any).toString();
      }
    }

    // Para búsquedas por editorial, necesitamos obtener el ID de la editorial
    if (publisher) {
      const publisherDoc = await this.publisherRepository.findByName(publisher);
      if (publisherDoc) {
        filters.publisherId = (publisherDoc._id as any).toString();
      }
    }

    const result = await this.resourceRepository.findWithAdvancedFilters(
      filters, 
      page, 
      limit, 
      sortBy, 
      sortOrder
    );

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

      // Validar referencias si se proporcionan
      if (updateResourceDto.typeId || updateResourceDto.categoryId || 
          updateResourceDto.stateId || updateResourceDto.locationId ||
          updateResourceDto.authorIds || updateResourceDto.publisherId) {
        await this.validateResourceReferences({
          ...existingResource.toObject(),
          ...updateResourceDto,
        } as any);
      }

      // Actualizar campos básicos
      if (updateResourceDto.title) {
        updateData.title = updateResourceDto.title.trim();
      }

      if (updateResourceDto.notes !== undefined) {
        updateData.notes = updateResourceDto.notes?.trim();
      }

      if (updateResourceDto.volumes !== undefined) {
        updateData.volumes = updateResourceDto.volumes;
      }

      if (updateResourceDto.available !== undefined) {
        updateData.available = updateResourceDto.available;
      }

      // Verificar ISBN único si se actualiza
      if (updateResourceDto.isbn && updateResourceDto.isbn !== existingResource.isbn) {
        const existingByISBN = await this.resourceRepository.findByISBN(updateResourceDto.isbn);
        if (existingByISBN && (existingByISBN._id as any).toString() !== id) {
          throw new ConflictException('Ya existe un recurso con este ISBN');
        }
        updateData.isbn = updateResourceDto.isbn;
      }

      // Actualizar referencias
      if (updateResourceDto.typeId) {
        updateData.typeId = MongoUtils.toObjectId(updateResourceDto.typeId);
      }

      if (updateResourceDto.categoryId) {
        updateData.categoryId = MongoUtils.toObjectId(updateResourceDto.categoryId);
      }

      if (updateResourceDto.stateId) {
        updateData.stateId = MongoUtils.toObjectId(updateResourceDto.stateId);
      }

      if (updateResourceDto.locationId) {
        updateData.locationId = MongoUtils.toObjectId(updateResourceDto.locationId);
      }

      if (updateResourceDto.authorIds) {
        updateData.authorIds = updateResourceDto.authorIds.map(id => MongoUtils.toObjectId(id));
      }

      if (updateResourceDto.publisherId) {
        updateData.publisherId = MongoUtils.toObjectId(updateResourceDto.publisherId);
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

    // TODO: Verificar que no tenga préstamos activos antes de eliminar

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
   * Incrementar contador de préstamos
   */
  async incrementLoanCount(id: string): Promise<ResourceResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const updatedResource = await this.resourceRepository.incrementLoanCount(id);

    if (!updatedResource) {
      throw new NotFoundException('Recurso no encontrado');
    }

    this.logger.log(`Resource loan count incremented: ${updatedResource.title}`);

    return this.mapToResponseDto(updatedResource);
  }

  /**
   * Obtener recursos más prestados
   */
  async getMostBorrowedResources(limit: number = 10): Promise<ResourceResponseDto[]> {
    const resources = await this.resourceRepository.getMostBorrowedResources(limit);
    return resources.map(resource => this.mapToResponseDto(resource));
  }

  /**
   * Obtener recursos menos prestados
   */
  async getLeastBorrowedResources(limit: number = 10): Promise<ResourceResponseDto[]> {
    const resources = await this.resourceRepository.getLeastBorrowedResources(limit);
    return resources.map(resource => this.mapToResponseDto(resource));
  }

  /**
   * Obtener estadísticas de recursos
   */
  async getStatistics(): Promise<{
    total: number;
    available: number;
    borrowed: number;
    byType: Array<{ type: string; count: number }>;
    byCategory: Array<{ category: string; count: number }>;
    byState: Array<{ state: string; count: number }>;
  }> {
    return this.resourceRepository.getResourceStatistics();
  }

  /**
   * Validar que todas las referencias existan
   */
  private async validateResourceReferences(resourceData: CreateResourceDto | any): Promise<void> {
    // Validar tipo de recurso
    if (resourceData.typeId) {
      const resourceType = await this.resourceTypeRepository.findById(resourceData.typeId);
      if (!resourceType || !resourceType.active) {
        throw new BadRequestException('Tipo de recurso no válido');
      }
    }

    // Validar categoría
    if (resourceData.categoryId) {
      const category = await this.categoryRepository.findById(resourceData.categoryId);
      if (!category || !category.active) {
        throw new BadRequestException('Categoría no válida');
      }
    }

    // Validar estado
    if (resourceData.stateId) {
      const state = await this.resourceStateRepository.findById(resourceData.stateId);
      if (!state || !state.active) {
        throw new BadRequestException('Estado de recurso no válido');
      }
    }

    // Validar ubicación
    if (resourceData.locationId) {
      const location = await this.locationRepository.findById(resourceData.locationId);
      if (!location || !location.active) {
        throw new BadRequestException('Ubicación no válida');
      }
    }

    // Validar autores
    if (resourceData.authorIds && resourceData.authorIds.length > 0) {
      for (const authorId of resourceData.authorIds) {
        if (!MongoUtils.isValidObjectId(authorId)) {
          throw new BadRequestException(`ID de autor inválido: ${authorId}`);
        }
        const author = await this.authorRepository.findById(authorId);
        if (!author || !author.active) {
          throw new BadRequestException(`Autor no válido: ${authorId}`);
        }
      }
    }

    // Validar editorial
    if (resourceData.publisherId) {
      const publisher = await this.publisherRepository.findById(resourceData.publisherId);
      if (!publisher || !publisher.active) {
        throw new BadRequestException('Editorial no válida');
      }
    }
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(resource: ResourceDocument): ResourceResponseDto {
    // Mapear referencias pobladas
    let type: any = undefined;
    let category: any = undefined;
    let authors: any[] = [];
    let publisher: any = undefined;
    let state: any = undefined;
    let location: any = undefined;

    // Verificar si las referencias están pobladas
    if (resource.populated('typeId')) {
      const populatedType = resource.typeId as any;
      type = {
        _id: populatedType._id?.toString() || populatedType.toString(),
        name: populatedType.name || '',
        description: populatedType.description || '',
      };
    }

    if (resource.populated('categoryId')) {
      const populatedCategory = resource.categoryId as any;
      category = {
        _id: populatedCategory._id?.toString() || populatedCategory.toString(),
        name: populatedCategory.name || '',
        description: populatedCategory.description || '',
        color: populatedCategory.color || '#6c757d',
      };
    }

    if (resource.populated('authorIds') && Array.isArray(resource.authorIds)) {
      authors = resource.authorIds.map((author: any) => ({
        _id: author._id?.toString() || author.toString(),
        name: author.name || '',
      }));
    }

    if (resource.populated('publisherId') && resource.publisherId) {
      const populatedPublisher = resource.publisherId as any;
      publisher = {
        _id: populatedPublisher._id?.toString() || populatedPublisher.toString(),
        name: populatedPublisher.name || '',
      };
    }

    if (resource.populated('stateId')) {
      const populatedState = resource.stateId as any;
      state = {
        _id: populatedState._id?.toString() || populatedState.toString(),
        name: populatedState.name || '',
        description: populatedState.description || '',
        color: populatedState.color || '#28a745',
      };
    }

    if (resource.populated('locationId')) {
      const populatedLocation = resource.locationId as any;
      location = {
        _id: populatedLocation._id?.toString() || populatedLocation.toString(),
        name: populatedLocation.name || '',
        description: populatedLocation.description || '',
        code: populatedLocation.code,
      };
    }

    return {
      _id: (resource._id as any).toString(),
      typeId: resource.typeId.toString(),
      type,
      categoryId: resource.categoryId.toString(),
      category,
      title: resource.title,
      authorIds: resource.authorIds.map(id => id.toString()),
      authors,
      publisherId: resource.publisherId?.toString(),
      publisher,
      volumes: resource.volumes,
      stateId: resource.stateId.toString(),
      state,
      locationId: resource.locationId.toString(),
      location,
      notes: resource.notes,
      googleBooksId: resource.googleBooksId,
      available: resource.available,
      isbn: resource.isbn,
      totalLoans: resource.totalLoans,
      lastLoanDate: resource.lastLoanDate,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}