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
import type { GoogleBooksVolumeDto } from '@modules/resource/dto';

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
    private readonly resourceStateRepository: ResourceStateRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('GoogleBooksResourceService');
  }

  /**
   * Crear recurso desde Google Books
   */
  async createFromGoogleBooks(createDto: ResourceFromGoogleBooksDto): Promise<ResourceResponseDto> {
    const { googleBooksId, categoryId, locationId, stateId, volumes, notes, totalQuantity } = createDto;

    try {
      // Obtener información del libro desde Google Books
      const bookData = await this.googleBooksService.getVolumeById(googleBooksId);
      
      // ✅ DEBUG: Log para verificar datos del libro
      console.log('📚 Book data from Google Books:', {
        title: bookData?.title,
        authors: bookData?.authors,
        hasImageLinks: !!bookData?.imageLinks,
        imageLinks: bookData?.imageLinks
      });

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

      // ✅ NUEVO: Usar el estado proporcionado o el estado "bueno" por defecto
      let finalStateId: string;
      if (stateId) {
        // Verificar que el estado proporcionado existe
        const providedState = await this.resourceStateRepository.findById(stateId);
        if (!providedState) {
          throw new BadRequestException('Estado de recurso proporcionado no encontrado');
        }
        finalStateId = stateId;
      } else {
        // Usar el estado "bueno" por defecto
        const goodState = await this.resourceStateRepository.findByName('good');
        if (!goodState) {
          throw new BadRequestException('Estado de recurso "good" no encontrado');
        }
        finalStateId = (goodState._id as any).toString();
      }

      // ✅ CORRECCIÓN: Extraer la mejor URL de imagen disponible
      const coverImageUrl = this.extractBestImageUrl(bookData);
      
      // ✅ DEBUG: Log para verificar URL extraída
      console.log('🖼️ Extracted cover image URL:', coverImageUrl);

      // ✅ CORRECCIÓN: Crear el recurso con coverImageUrl (no imageUrl) y totalQuantity del DTO
      const createResourceDto: CreateResourceDto = {
        typeId: (bookType._id as any).toString(),
        categoryId,
        title: bookData.title,
        authorIds,
        publisherId,
        volumes: volumes || 1,
        stateId: finalStateId,
        locationId,
        totalQuantity: totalQuantity || 1,
        notes,
        isbn: isbn || undefined,
        googleBooksId,
        coverImageUrl,    // ← CORRECCIÓN: usar coverImageUrl
      };

      // ✅ DEBUG: Log para verificar DTO siendo enviado
      console.log('📝 CreateResourceDto being sent:', {
        title: createResourceDto.title,
        googleBooksId: createResourceDto.googleBooksId,
        coverImageUrl: createResourceDto.coverImageUrl,
        hasCoverImage: !!createResourceDto.coverImageUrl,
        totalQuantity: createResourceDto.totalQuantity,
        stateId: createResourceDto.stateId
      });

      const resource = await this.resourceService.create(createResourceDto);

      // ✅ DEBUG: Log para verificar recurso creado
      console.log('✅ Resource created:', {
        id: resource._id,
        title: resource.title,
        googleBooksId: resource.googleBooksId,
        coverImageUrl: resource.coverImageUrl,
        hasCoverImage: !!resource.coverImageUrl,
        totalQuantity: resource.totalQuantity
      });

      this.logger.log(`Resource created from Google Books: ${bookData.title}${coverImageUrl ? ' with cover image' : ''}`);

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
   * Extraer la mejor URL de imagen disponible
   * Prioriza: large > medium > small > thumbnail
   */
  private extractBestImageUrl(volume: GoogleBooksVolumeDto): string | undefined {
    if (!volume.imageLinks) {
      return undefined;
    }

    const { imageLinks } = volume;
    
    // Priorizar calidad de imagen de mayor a menor
    if (imageLinks.large) {
      return this.processImageUrl(imageLinks.large);
    }
    
    if (imageLinks.medium) {
      return this.processImageUrl(imageLinks.medium);
    }
    
    if (imageLinks.small) {
      return this.processImageUrl(imageLinks.small);
    }
    
    if (imageLinks.thumbnail) {
      return this.processImageUrl(imageLinks.thumbnail);
    }

    return undefined;
  }

  /**
   * Procesar URL de imagen para obtener mejor calidad
   * Remueve restricciones de tamaño y fuerza HTTPS
   */
  private processImageUrl(url: string): string {
    if (!url) return url;

    let processedUrl = url;

    // Forzar HTTPS para seguridad
    if (processedUrl.startsWith('http://')) {
      processedUrl = processedUrl.replace('http://', 'https://');
    }

    // Si es una imagen de Google Books, remover restricciones de tamaño
    if (processedUrl.includes('books.google.com')) {
      // Remover parámetros de tamaño para obtener imagen de mejor calidad
      processedUrl = processedUrl.replace(/&zoom=\d+/g, '');
      processedUrl = processedUrl.replace(/&w=\d+/g, '');
      processedUrl = processedUrl.replace(/&h=\d+/g, '');
      processedUrl = processedUrl.replace(/&edge=curl/g, '');
      
      // Asegurar que termine correctamente
      if (!processedUrl.includes('&printsec=frontcover')) {
        processedUrl += '&printsec=frontcover';
      }
    }

    return processedUrl;
  }

  /**
   * Buscar y previsualizar información de Google Books
   * para facilitar el registro manual
   */
  async previewGoogleBooksInfo(volumeId: string): Promise<{
    bookInfo: GoogleBooksVolumeDto;
    suggestedData: {
      title: string;
      authors: string[];
      publisher?: string;
      isbn?: string;
      description?: string;
      coverImageUrl?: string;    // ← CORRECCIÓN: usar coverImageUrl
    };
  }> {
    try {
      const bookData = await this.googleBooksService.getVolumeById(volumeId);
      if (!bookData) {
        throw new NotFoundException('No se encontró el libro en Google Books');
      }

      const isbn = this.googleBooksService.extractISBN(bookData);
      const coverImageUrl = this.extractBestImageUrl(bookData);    // ← CORRECCIÓN

      return {
        bookInfo: bookData,
        suggestedData: {
          title: bookData.title,
          authors: bookData.authors || [],
          publisher: bookData.publisher,
          isbn: isbn || undefined,
          description: bookData.description,
          coverImageUrl,    // ← CORRECCIÓN: usar coverImageUrl
        },
      };
    } catch (error) {
      this.logger.error(`Error previewing Google Books info: ${volumeId}`, error);
      throw error;
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
      this.logger.error(`Error checking Google Books existence: ${volumeId}`, error);
      throw error;
    }
  }
}