// src/modules/resource/controllers/author.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { AuthorService } from '@modules/resource/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateAuthorDto,
    UpdateAuthorDto,
    AuthorResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador para gestión de autores
   */
  
  @Controller('authors')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
  export class AuthorController {
    constructor(
      private readonly authorService: AuthorService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('AuthorController');
    }
  
    /**
     * Crear un nuevo autor
     * POST /api/authors
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createAuthorDto: CreateAuthorDto,
    ): Promise<ApiResponseDto<AuthorResponseDto>> {
      try {
        this.logger.log(`Creating author: ${createAuthorDto.name}`);
  
        const author = await this.authorService.create(createAuthorDto);
  
        return ApiResponseDto.success(author, 'Autor creado exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating author: ${createAuthorDto.name}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener todos los autores con filtros y paginación
     * GET /api/authors
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('active') active?: string,
    ): Promise<ApiResponseDto<PaginatedResponseDto<AuthorResponseDto>>> {
      try {
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100); // Máximo 100
  
        const filters: any = {};
  
        if (search && ValidationUtils.isNotEmpty(search)) {
          filters.search = search.trim();
        }
  
        if (active !== undefined) {
          filters.active = active === 'true';
        }
  
        this.logger.debug('Finding authors with filters:', filters);
  
        const result = await this.authorService.findAll(filters, pageNum, limitNum);
  
        return ApiResponseDto.success(result, 'Autores obtenidos exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding authors', error);
        throw error;
      }
    }
  
    /**
     * Obtener todos los autores activos (para formularios)
     * GET /api/authors/active
     */
    @Get('active')
    async findAllActive(): Promise<ApiResponseDto<AuthorResponseDto[]>> {
      try {
        this.logger.debug('Finding all active authors');
  
        const authors = await this.authorService.findAllActive();
  
        return ApiResponseDto.success(
          authors,
          'Autores activos obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active authors', error);
        throw error;
      }
    }
  
    /**
     * Buscar autores por texto
     * GET /api/authors/search
     */
    @Get('search')
    async searchByText(
      @Query('q') query?: string,
      @Query('limit') limit: string = '20',
    ): Promise<ApiResponseDto<AuthorResponseDto[]>> {
      try {
        if (!query || !ValidationUtils.isNotEmpty(query)) {
          this.logger.warn('Search query is required');
          throw new Error('El término de búsqueda es requerido');
        }
  
        const limitNum = Math.min(parseInt(limit, 10) || 20, 50); // Máximo 50
  
        this.logger.debug(`Searching authors by text: ${query}`);
  
        const authors = await this.authorService.searchByText(query.trim(), limitNum);
  
        return ApiResponseDto.success(
          authors,
          'Búsqueda de autores completada exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error searching authors by text: ${query}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener autor por ID
     * GET /api/authors/:id
     */
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<AuthorResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid author ID format: ${id}`);
          throw new Error('ID de autor inválido');
        }
  
        this.logger.debug(`Finding author by ID: ${id}`);
  
        const author = await this.authorService.findById(id);
  
        return ApiResponseDto.success(author, 'Autor obtenido exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding author by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Buscar autor por nombre
     * GET /api/authors/name/:name
     */
    @Get('name/:name')
    async findByName(@Param('name') name: string): Promise<ApiResponseDto<AuthorResponseDto>> {
      try {
        if (!ValidationUtils.isNotEmpty(name)) {
          this.logger.warn(`Invalid author name: ${name}`);
          throw new Error('Nombre de autor inválido');
        }
  
        this.logger.debug(`Finding author by name: ${name}`);
  
        const author = await this.authorService.findByName(name);
  
        return ApiResponseDto.success(author, 'Autor obtenido exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding author by name: ${name}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar autor
     * PUT /api/authors/:id
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateAuthorDto: UpdateAuthorDto,
    ): Promise<ApiResponseDto<AuthorResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid author ID format: ${id}`);
          throw new Error('ID de autor inválido');
        }
  
        this.logger.log(`Updating author: ${id}`);
  
        const author = await this.authorService.update(id, updateAuthorDto);
  
        return ApiResponseDto.success(author, 'Autor actualizado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error updating author: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Desactivar autor
     * PUT /api/authors/:id/deactivate
     */
    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string): Promise<ApiResponseDto<AuthorResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid author ID format: ${id}`);
          throw new Error('ID de autor inválido');
        }
  
        this.logger.log(`Deactivating author: ${id}`);
  
        const author = await this.authorService.deactivate(id);
  
        return ApiResponseDto.success(author, 'Autor desactivado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deactivating author: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Activar autor
     * PUT /api/authors/:id/activate
     */
    @Put(':id/activate')
    async activate(@Param('id') id: string): Promise<ApiResponseDto<AuthorResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid author ID format: ${id}`);
          throw new Error('ID de autor inválido');
        }
  
        this.logger.log(`Activating author: ${id}`);
  
        const author = await this.authorService.activate(id);
  
        return ApiResponseDto.success(author, 'Autor activado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error activating author: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar autor permanentemente
     * DELETE /api/authors/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid author ID format: ${id}`);
          throw new Error('ID de autor inválido');
        }
  
        this.logger.log(`Deleting author permanently: ${id}`);
  
        await this.authorService.delete(id);
  
        return ApiResponseDto.success(null, 'Autor eliminado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting author: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener autores más prolíficos
     * GET /api/authors/stats/most-prolific
     */
    @Get('stats/most-prolific')
    async getMostProlificAuthors(
      @Query('limit') limit: string = '10',
    ): Promise<
      ApiResponseDto<
        Array<{
          _id: string;
          name: string;
          biography?: string;
          resourceCount: number;
        }>
      >
    > {
      try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Máximo 50
  
        this.logger.debug(`Getting most prolific authors (limit: ${limitNum})`);
  
        const authors = await this.authorService.getMostProlificAuthors(limitNum);
  
        return ApiResponseDto.success(
          authors,
          'Autores más prolíficos obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting most prolific authors', error);
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de autores
     * GET /api/authors/stats/summary
     */
    @Get('stats/summary')
    async getStatistics(): Promise<
      ApiResponseDto<{
        total: number;
        active: number;
        inactive: number;
        withResources: number;
        fromGoogleBooks: number;
        mostProlific: Array<{ name: string; resourceCount: number }>;
      }>
    > {
      try {
        this.logger.debug('Getting author statistics');
  
        const stats = await this.authorService.getStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting author statistics', error);
        throw error;
      }
    }
  
    /**
     * Crear o encontrar autores por nombres
     * POST /api/authors/bulk-create
     */
    @Post('bulk-create')
    @HttpCode(HttpStatus.CREATED)
    async findOrCreateByNames(
      @Body() body: { names: string[] },
    ): Promise<ApiResponseDto<AuthorResponseDto[]>> {
      try {
        if (!body.names || !Array.isArray(body.names) || body.names.length === 0) {
          this.logger.warn('Author names array is required');
          throw new Error('Se requiere un array de nombres de autores');
        }
  
        this.logger.log(`Creating/finding authors for ${body.names.length} names`);
  
        const authors = await this.authorService.findOrCreateByNames(body.names);
  
        return ApiResponseDto.success(
          authors,
          'Autores creados/encontrados exitosamente',
          HttpStatus.CREATED,
        );
      } catch (error) {
        this.logger.error('Error in bulk create authors', error);
        throw error;
      }
    }
  }