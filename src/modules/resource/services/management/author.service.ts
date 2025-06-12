// src/modules/resource/services/management/author.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { AuthorRepository, ResourceRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateAuthorDto,
    UpdateAuthorDto,
    AuthorResponseDto,
  } from '@modules/resource/dto';
  import { AuthorDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  @Injectable()
  export class AuthorService {
    constructor(
      private readonly authorRepository: AuthorRepository,
      private readonly resourceRepository: ResourceRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('AuthorService');
    }
  
    async create(createAuthorDto: CreateAuthorDto): Promise<AuthorResponseDto> {
      const { name, biography } = createAuthorDto;
  
      const existingAuthor = await this.authorRepository.findByName(name);
      if (existingAuthor) {
        throw new ConflictException('Ya existe un autor con este nombre');
      }
  
      const authorData = {
        name: name.trim(),
        biography: biography?.trim(),
        active: true,
      };
  
      const createdAuthor = await this.authorRepository.create(authorData);
      this.logger.log(`Author created successfully: ${name}`);
  
      return this.mapToResponseDto(createdAuthor);
    }
  
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
  
    async findAllActive(): Promise<AuthorResponseDto[]> {
      const authors = await this.authorRepository.findAllActive();
      return authors.map(author => this.mapToResponseDto(author));
    }
  
    async searchByText(searchTerm: string, limit: number = 20): Promise<AuthorResponseDto[]> {
      // Actualizar para usar el nuevo nombre del método
      const authors = await this.authorRepository.searchAuthorsByText(searchTerm, limit);
      return authors.map(author => this.mapToResponseDto(author));
    }
  
    async findOrCreateByNames(authorNames: string[]): Promise<AuthorResponseDto[]> {
      const authors = await this.authorRepository.findOrCreateByNames(authorNames);
      return authors.map(author => this.mapToResponseDto(author));
    }
  
    async update(id: string, updateAuthorDto: UpdateAuthorDto): Promise<AuthorResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      const existingAuthor = await this.authorRepository.findById(id);
      if (!existingAuthor) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      const updateData: any = {};
  
      if (updateAuthorDto.name && updateAuthorDto.name !== existingAuthor.name) {
        const existingByName = await this.authorRepository.findByName(updateAuthorDto.name);
        if (existingByName && (existingByName._id as any).toString() !== id) {
          throw new ConflictException('Ya existe un autor con este nombre');
        }
        updateData.name = updateAuthorDto.name.trim();
      }
  
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
    }
  
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de autor inválido');
      }
  
      const author = await this.authorRepository.findById(id);
      if (!author) {
        throw new NotFoundException('Autor no encontrado');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.resourceRepository.countByAuthor(id);
      if (resourceCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar el autor porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      await this.authorRepository.delete(id);
      this.logger.log(`Author deleted permanently: ${author.name}`);
    }
  
    private mapToResponseDto(author: AuthorDocument): AuthorResponseDto {
      return {
        _id: (author._id as any).toString(),
        name: author.name,
        biography: author.biography,
        active: author.active,
        createdAt: author.createdAt,
        updatedAt: author.updatedAt,
      };
    }
  }