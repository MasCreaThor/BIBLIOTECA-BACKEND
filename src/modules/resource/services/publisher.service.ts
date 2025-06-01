// src/modules/resource/services/publisher.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
  } from '@nestjs/common';
  import { PublisherRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreatePublisherDto,
    UpdatePublisherDto,
    PublisherResponseDto,
  } from '@modules/resource/dto';
  import { PaginatedResponseDto } from '@shared/dto/base.dto';
  import { PublisherDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  /**
   * Servicio para gestión de editoriales
   */
  
  @Injectable()
  export class PublisherService {
    constructor(
      private readonly publisherRepository: PublisherRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('PublisherService');
    }
  
    /**
     * Crear nueva editorial
     */
    async create(createPublisherDto: CreatePublisherDto): Promise<PublisherResponseDto> {
      const { name, description, googleBooksPublisherId } = createPublisherDto;
  
      try {
        // Verificar si ya existe una editorial con el mismo nombre
        const existingPublisher = await this.publisherRepository.findByName(name);
        if (existingPublisher) {
          throw new ConflictException('Ya existe una editorial con este nombre');
        }
  
        // Verificar Google Books ID único si se proporciona
        if (googleBooksPublisherId) {
          const existingByGoogleId = await this.publisherRepository.findByGoogleBooksId(googleBooksPublisherId);
          if (existingByGoogleId) {
            throw new ConflictException('Ya existe una editorial con este ID de Google Books');
          }
        }
  
        const publisherData = {
          name: name.trim(),
          description: description?.trim(),
          googleBooksPublisherId,
          active: true,
        };
  
        const createdPublisher = await this.publisherRepository.create(publisherData);
  
        this.logger.log(`Publisher created successfully: ${name}`);
  
        return this.mapToResponseDto(createdPublisher);
      } catch (error) {
        if (error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
  
        this.logger.error(`Error creating publisher: ${name}`, error);
        throw new BadRequestException('Error al crear la editorial');
      }
    }
  
    /**
     * Obtener editorial por ID
     */
    async findById(id: string): Promise<PublisherResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      const publisher = await this.publisherRepository.findById(id);
  
      if (!publisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      return this.mapToResponseDto(publisher);
    }
  
    /**
     * Buscar editorial por nombre
     */
    async findByName(name: string): Promise<PublisherResponseDto> {
      const publisher = await this.publisherRepository.findByName(name);
  
      if (!publisher) {
        throw new NotFoundException('Editorial no encontrada con ese nombre');
      }
  
      return this.mapToResponseDto(publisher);
    }
  
    /**
     * Obtener todas las editoriales con filtros y paginación
     */
    async findAll(
      filters: {
        search?: string;
        active?: boolean;
      } = {},
      page: number = 1,
      limit: number = 20,
    ): Promise<PaginatedResponseDto<PublisherResponseDto>> {
      const result = await this.publisherRepository.findWithFilters(filters, page, limit);
  
      const mappedData = result.data.map((publisher) => this.mapToResponseDto(publisher));
  
      return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
    }
  
    /**
     * Obtener todas las editoriales activas
     */
    async findAllActive(): Promise<PublisherResponseDto[]> {
      const publishers = await this.publisherRepository.findAllActive();
      return publishers.map(publisher => this.mapToResponseDto(publisher));
    }
  
    /**
     * Buscar editoriales por texto
     */
    async searchByText(searchTerm: string, limit: number = 20): Promise<PublisherResponseDto[]> {
      const publishers = await this.publisherRepository.searchPublishersByText(searchTerm, limit);
      return publishers.map(publisher => this.mapToResponseDto(publisher));
    }
  
    /**
     * Actualizar editorial
     */
    async update(id: string, updatePublisherDto: UpdatePublisherDto): Promise<PublisherResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      const existingPublisher = await this.publisherRepository.findById(id);
      if (!existingPublisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      try {
        const updateData: any = {};
  
        // Verificar nombre único si se actualiza
        if (updatePublisherDto.name && updatePublisherDto.name !== existingPublisher.name) {
          const existingByName = await this.publisherRepository.findByName(updatePublisherDto.name);
          if (existingByName && (existingByName._id as any).toString() !== id) {
            throw new ConflictException('Ya existe una editorial con este nombre');
          }
          updateData.name = updatePublisherDto.name.trim();
        }
  
        // Actualizar otros campos
        if (updatePublisherDto.description !== undefined) {
          updateData.description = updatePublisherDto.description?.trim();
        }
  
        if (updatePublisherDto.active !== undefined) {
          updateData.active = updatePublisherDto.active;
        }
  
        const updatedPublisher = await this.publisherRepository.update(id, updateData);
  
        if (!updatedPublisher) {
          throw new NotFoundException('Editorial no encontrada');
        }
  
        this.logger.log(`Publisher updated successfully: ${updatedPublisher.name}`);
  
        return this.mapToResponseDto(updatedPublisher);
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
  
        this.logger.error(`Error updating publisher: ${id}`, error);
        throw new BadRequestException('Error al actualizar la editorial');
      }
    }
  
    /**
     * Desactivar editorial
     */
    async deactivate(id: string): Promise<PublisherResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      // Verificar que no tenga recursos asociados antes de desactivar
      const resourceCount = await this.publisherRepository.countResourcesByPublisher(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede desactivar la editorial porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deactivatedPublisher = await this.publisherRepository.deactivate(id);
  
      if (!deactivatedPublisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      this.logger.log(`Publisher deactivated: ${deactivatedPublisher.name}`);
  
      return this.mapToResponseDto(deactivatedPublisher);
    }
  
    /**
     * Activar editorial
     */
    async activate(id: string): Promise<PublisherResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      const activatedPublisher = await this.publisherRepository.activate(id);
  
      if (!activatedPublisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      this.logger.log(`Publisher activated: ${activatedPublisher.name}`);
  
      return this.mapToResponseDto(activatedPublisher);
    }
  
    /**
     * Eliminar editorial permanentemente
     */
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      const publisher = await this.publisherRepository.findById(id);
      if (!publisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.publisherRepository.countResourcesByPublisher(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede eliminar la editorial porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deleted = await this.publisherRepository.delete(id);
  
      if (!deleted) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      this.logger.log(`Publisher deleted permanently: ${publisher.name}`);
    }
  
    /**
     * Obtener editoriales más activas
     */
    async getMostActivePublishers(limit: number = 10): Promise<Array<{
      _id: string;
      name: string;
      description?: string;
      resourceCount: number;
    }>> {
      return this.publisherRepository.getMostActivePublishers(limit);
    }
  
    /**
     * Crear o encontrar editorial por nombre
     */
    async findOrCreateByName(publisherName: string): Promise<PublisherResponseDto> {
      const publisher = await this.publisherRepository.findOrCreateByName(publisherName);
      return this.mapToResponseDto(publisher);
    }
  
    /**
     * Obtener estadísticas de editoriales
     */
    async getStatistics(): Promise<{
      total: number;
      active: number;
      inactive: number;
      withResources: number;
      fromGoogleBooks: number;
      mostActive: Array<{ name: string; resourceCount: number }>;
    }> {
      const [publisherStats, mostActive] = await Promise.all([
        this.publisherRepository.getPublisherStatistics(),
        this.publisherRepository.getMostActivePublishers(5),
      ]);
  
      return {
        ...publisherStats,
        inactive: publisherStats.total - publisherStats.active,
        mostActive: mostActive.map(publisher => ({
          name: publisher.name,
          resourceCount: publisher.resourceCount,
        })),
      };
    }
  
    /**
     * Mapear entidad a DTO de respuesta
     */
    private mapToResponseDto(publisher: PublisherDocument): PublisherResponseDto {
      return {
        _id: (publisher._id as any).toString(),
        name: publisher.name,
        description: publisher.description,
        googleBooksPublisherId: publisher.googleBooksPublisherId,
        active: publisher.active,
        createdAt: publisher.createdAt,
        updatedAt: publisher.updatedAt,
      };
    }
  }