// src/modules/resource/services/author.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
  } from '@nestjs/common';
  import { AuthorRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateAuthorDto,
    UpdateAuthorDto,
    AuthorResponseDto,
  } from '@modules/resource/dto';
  import { PaginatedResponseDto } from '@shared/dto/base.dto';
  import { AuthorDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  /**
   * Servicio para gestión de autores
   */
  
  @Injectable()
  export class AuthorService {
    constructor(
      private readonly authorRepository: AuthorRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('AuthorService');
    }
  
    /**
     * Crear nuevo autor
     */
    async create(createAuthorDto: CreateAuthorDto): Promise<AuthorResponseDto> {
      const { name, biography, googleBooksAuthorId } = createAuthorDto;
  
      try {
        // Verificar si ya existe un autor con el mismo nombre
        const existingAuthor = await this.authorRepository.findByName(name);
        if (existingAuthor) {
          throw new ConflictException('Ya existe un autor con este nombre');
        }
  
        // Verificar Google Books ID único si se proporciona
        if (googleBooksAuthorId) {
          const existingByGoogleId = await this.authorRepository.findByGoogleBooksId(googleBooksAuthorId);
          if (existingByGoogleId) {
            throw new ConflictException('Ya existe un autor con este ID de Google Books');
          }
        }
  
        const authorData = {
          name: name.trim(),
          biography: biography?.trim(),
          googleBooksAuthorId,
          active: true,
        };
  
        const createdAuthor = await this.authorRepository.create(authorData);
  
        this.logger.log(`Author created successfully: ${name}`);
  
        return this.mapToResponseDto(createdAuthor);
      } catch (error) {
        if (error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
  
        this.logger.error(`Error creating author: ${name}`, error);
        throw new BadRequestException('Error al crear el autor');
      }
    }
  
    /**
     * Obtener autor por ID
     */
    async findById(id: string): Promise<AuthorResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      const author = await this.authorRepository.findById(id);
  
      if (!author) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      return this.mapToResponseDto(author);
    }
  
    /**
     * Buscar autor por nombre
     */
    async findByName(name: string): Promise<AuthorResponseDto> {
      const author = await this.authorRepository.findByName(name);
  
      if (!author) {
        throw new NotFoundException('Autor no encontrado con ese nombre');
      }
  
      return this.mapToResponseDto(author);
    }
  
    /**
     * Obtener todos los autores con filtros y paginación
     */
    async findAll(
      filters: {
        search?: string;
        active?: boolean;
      } = {},
      page: number = 1,
      limit: number = 20,
    ): Promise<PaginatedResponseDto<AuthorResponseDto>> {
      const result = await this.authorRepository.findWithFilters(filters, page, limit);
  
      const mappedData = result.data.map((author) => this.mapToResponseDto(author));
  
      return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
    }
  
    /**
     * Obtener todos los autores activos
     */
    async findAllActive(): Promise<AuthorResponseDto[]> {
      const authors = await this.authorRepository.findAllActive();
      return authors.map(author => this.mapToResponseDto(author));
    }
  
    /**
     * Buscar autores por texto
     */
    async searchByText(searchTerm: string, limit: number = 20): Promise<AuthorResponseDto[]> {
      const authors = await this.authorRepository.searchAuthorsByText(searchTerm, limit);
      return authors.map(author => this.mapToResponseDto(author));
    }
  
    /**
     * Actualizar autor
     */
    async update(id: string, updateAuthorDto: UpdateAuthorDto): Promise<AuthorResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      const existingAuthor = await this.authorRepository.findById(id);
      if (!existingAuthor) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      try {
        const updateData: any = {};
  
        // Verificar nombre único si se actualiza
        if (updateAuthorDto.name && updateAuthorDto.name !== existingAuthor.name) {
          const existingByName = await this.authorRepository.findByName(updateAuthorDto.name);
          if (existingByName && (existingByName._id as any).toString() !== id) {
            throw new ConflictException('Ya existe un autor con este nombre');
          }
          updateData.name = updateAuthorDto.name.trim();
        }
  
        // Actualizar otros campos
        if (updateAuthorDto.biography !== undefined) {
          updateData.biography = updateAuthorDto.biography?.trim();
        }
  
        if (updateAuthorDto.active !== undefined) {
          updateData.active = updateAuthorDto.active;
        }
  
        const updatedAuthor = await this.authorRepository.update(id, updateData);
  
        if (!updatedAuthor) {
          throw new NotFoundException('Autor no encontrado');
        }
  
        this.logger.log(`Author updated successfully: ${updatedAuthor.name}`);
  
        return this.mapToResponseDto(updatedAuthor);
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
  
        this.logger.error(`Error updating author: ${id}`, error);
        throw new BadRequestException('Error al actualizar el autor');
      }
    }
  
    /**
     * Desactivar autor
     */
    async deactivate(id: string): Promise<AuthorResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      // Verificar que no tenga recursos asociados antes de desactivar
      const resourceCount = await this.authorRepository.countResourcesByAuthor(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede desactivar el autor porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deactivatedAuthor = await this.authorRepository.deactivate(id);
  
      if (!deactivatedAuthor) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      this.logger.log(`Author deactivated: ${deactivatedAuthor.name}`);
  
      return this.mapToResponseDto(deactivatedAuthor);
    }
  
    /**
     * Activar autor
     */
    async activate(id: string): Promise<AuthorResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      const activatedAuthor = await this.authorRepository.activate(id);
  
      if (!activatedAuthor) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      this.logger.log(`Author activated: ${activatedAuthor.name}`);
  
      return this.mapToResponseDto(activatedAuthor);
    }
  
    /**
     * Eliminar autor permanentemente
     */
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      const author = await this.authorRepository.findById(id);
      if (!author) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.authorRepository.countResourcesByAuthor(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede eliminar el autor porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deleted = await this.authorRepository.delete(id);
  
      if (!deleted) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      this.logger.log(`Author deleted permanently: ${author.name}`);
    }
  
    /**
     * Obtener autores más prolíficos
     */
    async getMostProlificAuthors(limit: number = 10): Promise<Array<{
      _id: string;
      name: string;
      biography?: string;
      resourceCount: number;
    }>> {
      return this.authorRepository.getMostProlificAuthors(limit);
    }
  
    /**
     * Crear o encontrar autores por nombres
     */
    async findOrCreateByNames(authorNames: string[]): Promise<AuthorResponseDto[]> {
      const authors = await this.authorRepository.findOrCreateByNames(authorNames);
      return authors.map(author => this.mapToResponseDto(author));
    }
  
    /**
     * Obtener estadísticas de autores
     */
    async getStatistics(): Promise<{
      total: number;
      active: number;
      inactive: number;
      withResources: number;
      fromGoogleBooks: number;
      mostProlific: Array<{ name: string; resourceCount: number }>;
    }> {
      const [authorStats, mostProlific] = await Promise.all([
        this.authorRepository.getAuthorStatistics(),
        this.authorRepository.getMostProlificAuthors(5),
      ]);
  
      return {
        ...authorStats,
        inactive: authorStats.total - authorStats.active,
        mostProlific: mostProlific.map(author => ({
          name: author.name,
          resourceCount: author.resourceCount,
        })),
      };
    }
  
    /**
     * Mapear entidad a DTO de respuesta
     */
    private mapToResponseDto(author: AuthorDocument): AuthorResponseDto {
      return {
        _id: (author._id as any).toString(),
        name: author.name,
        biography: author.biography,
        googleBooksAuthorId: author.googleBooksAuthorId,
        active: author.active,
        createdAt: author.createdAt,
        updatedAt: author.updatedAt,
      };
    }
  }