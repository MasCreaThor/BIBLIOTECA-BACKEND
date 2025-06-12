// src/modules/resource/controllers/management/author.controller.ts
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
  import { AuthorService } from '@modules/resource/services/management/author.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateAuthorDto,
    UpdateAuthorDto,
    AuthorResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  @Controller('authors')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class AuthorController {
    constructor(
      private readonly authorService: AuthorService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('AuthorController');
    }
  
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
  
    @Get()
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
  
        const limitNum = Math.min(parseInt(limit, 10) || 20, 50);
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