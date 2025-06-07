// src/modules/resource/services/integration/google-books-resource.service.ts
import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
  } from '@nestjs/common';
  import { ResourceService } from '@modules/resource/services/core/resource.service';
  import { AuthorService } from '@modules/resource/services/management/author.service';
  import { PublisherService } from '@modules/resource/services/management/publisher.service';
  import { GoogleBooksService } from './google-books.service';
  import { ResourceTypeRepository, ResourceStateRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    ResourceFromGoogleBooksDto,
    ResourceResponseDto,
    CreateResourceDto,
  } from '@modules/resource/dto';
  
  /**
   * Servicio para crear recursos desde Google Books API
   * Integra la búsqueda con la creación de recursos
   */
  
  @Injectable()
  export class GoogleBooksResourceService {
    constructor(
      private readonly resourceService: ResourceService,
      private readonly authorService: AuthorService,
      private readonly publisherService: PublisherService,
      private readonly googleBooksService: GoogleBooksService,
      private readonly resourceTypeRepository: ResourceTypeRepository,
      private readonly resourceStateRepository: ResourceStateRepository, // Agregar el repositorio correcto
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('GoogleBooksResourceService');
    }
  
    /**
     * Crear recurso desde Google Books
     */
    async createFromGoogleBooks(createDto: ResourceFromGoogleBooksDto): Promise<ResourceResponseDto> {
      const { googleBooksId, categoryId, locationId, volumes, notes } = createDto;
  
      try {
        // Obtener información del libro desde Google Books
        const bookData = await this.googleBooksService.getVolumeById(googleBooksId);
        if (!bookData) {
          throw new NotFoundException('No se encontró el libro en Google Books');
        }
  
        // Verificar que no exista ya (si tiene ISBN)
        const isbn = this.googleBooksService.extractISBN(bookData);
        if (isbn) {
          try {
            const existingResource = await this.resourceService.findByISBN(isbn);
            if (existingResource) {
              throw new ConflictException('Este libro ya está registrado en la biblioteca');
            }
          } catch (error) {
            // Si no se encuentra, está bien, podemos continuar
            if (!(error instanceof NotFoundException)) {
              throw error;
            }
          }
        }
  
        // Obtener o crear autores
        let authorIds: string[] = [];
        if (bookData.authors && bookData.authors.length > 0) {
          const authors = await this.authorService.findOrCreateByNames(bookData.authors);
          authorIds = authors.map(author => author._id);
        }
  
        // Obtener o crear editorial si existe
        let publisherId: string | undefined;
        if (bookData.publisher) {
          const publisher = await this.publisherService.findOrCreateByName(bookData.publisher);
          publisherId = publisher._id;
        }
  
        // Obtener el tipo de libro
        const bookType = await this.resourceTypeRepository.findByName('book');
        if (!bookType) {
          throw new BadRequestException('Tipo de recurso "book" no encontrado');
        }
  
        // Obtener el estado "bueno" por defecto - CORREGIR: usar resourceStateRepository
        const goodState = await this.resourceStateRepository.findByName('good');
        if (!goodState) {
          throw new BadRequestException('Estado de recurso "good" no encontrado');
        }
  
        // Crear el recurso
        const createResourceDto: CreateResourceDto = {
          typeId: (bookType._id as any).toString(),
          categoryId,
          title: bookData.title,
          authorIds,
          publisherId,
          volumes: volumes || 1,
          stateId: (goodState._id as any).toString(),
          locationId,
          notes,
          isbn: isbn || undefined,
        };
  
        const resource = await this.resourceService.create(createResourceDto);
  
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
     * Buscar y previsualizar información de Google Books
     * para facilitar el registro manual
     */
    async previewGoogleBooksInfo(volumeId: string): Promise<{
      bookInfo: any;
      suggestedData: {
        title: string;
        authors: string[];
        publisher?: string;
        isbn?: string;
        description?: string;
      };
    }> {
      try {
        const bookData = await this.googleBooksService.getVolumeById(volumeId);
        if (!bookData) {
          throw new NotFoundException('No se encontró el libro en Google Books');
        }
  
        const isbn = this.googleBooksService.extractISBN(bookData);
  
        const suggestedData = {
          title: bookData.title,
          authors: bookData.authors || [],
          publisher: bookData.publisher,
          isbn: isbn || undefined,
          description: bookData.description,
        };
  
        return {
          bookInfo: bookData,
          suggestedData,
        };
      } catch (error) {
        if (error instanceof NotFoundException) {
          throw error;
        }
  
        this.logger.error(`Error previewing Google Books info: ${volumeId}`, error);
        throw new BadRequestException('Error al obtener información de Google Books');
      }
    }
  
    /**
     * Verificar si un libro de Google Books ya existe en la biblioteca
     */
    async checkIfBookExists(volumeId: string): Promise<{
      exists: boolean;
      resource?: ResourceResponseDto;
      isbn?: string;
    }> {
      try {
        const bookData = await this.googleBooksService.getVolumeById(volumeId);
        if (!bookData) {
          return { exists: false };
        }
  
        const isbn = this.googleBooksService.extractISBN(bookData);
        if (!isbn) {
          return { exists: false, isbn: undefined };
        }
  
        try {
          const existingResource = await this.resourceService.findByISBN(isbn);
          return {
            exists: true,
            resource: existingResource,
            isbn,
          };
        } catch (error) {
          if (error instanceof NotFoundException) {
            return { exists: false, isbn };
          }
          throw error;
        }
      } catch (error) {
        this.logger.error(`Error checking if book exists: ${volumeId}`, error);
        return { exists: false };
      }
    }
  }