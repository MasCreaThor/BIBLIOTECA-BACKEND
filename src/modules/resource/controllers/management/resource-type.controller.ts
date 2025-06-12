// src/modules/resource/controllers/management/resource-type.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { ResourceTypeService } from '@modules/resource/services/management/resource-type.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateResourceTypeDto,
    UpdateResourceTypeDto,
    ResourceTypeResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { MongoUtils } from '@shared/utils';
  
  @Controller('resource-types')
  @Roles(UserRole.ADMIN) // Solo administradores pueden gestionar tipos de recursos
  export class ResourceTypeController {
    constructor(
      private readonly resourceTypeService: ResourceTypeService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('ResourceTypeController');
    }
  
    /**
     * Crear tipo de recurso
     * POST /api/resource-types
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createResourceTypeDto: CreateResourceTypeDto,
    ): Promise<ApiResponseDto<ResourceTypeResponseDto>> {
      try {
        this.logger.log(`Creating resource type: ${createResourceTypeDto.name}`);
        const resourceType = await this.resourceTypeService.create(createResourceTypeDto);
        return ApiResponseDto.success(
          resourceType,
          'Tipo de recurso creado exitosamente',
          HttpStatus.CREATED,
        );
      } catch (error) {
        this.logger.error(`Error creating resource type: ${createResourceTypeDto.name}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener todos los tipos de recursos activos
     * GET /api/resource-types
     */
    @Get()
    @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios también pueden consultar
    async findAllActive(): Promise<ApiResponseDto<ResourceTypeResponseDto[]>> {
      try {
        this.logger.debug('Finding all active resource types');
        const resourceTypes = await this.resourceTypeService.findAllActive();
        return ApiResponseDto.success(
          resourceTypes,
          'Tipos de recursos obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active resource types', error);
        throw error;
      }
    }
  
    /**
     * Obtener tipo de recurso por ID
     * GET /api/resource-types/:id
     */
    @Get(':id')
    @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios también pueden consultar
    async findById(@Param('id') id: string): Promise<ApiResponseDto<ResourceTypeResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource type ID format: ${id}`);
          throw new Error('ID de tipo de recurso inválido');
        }
  
        this.logger.debug(`Finding resource type by ID: ${id}`);
        const resourceType = await this.resourceTypeService.findById(id);
        return ApiResponseDto.success(
          resourceType,
          'Tipo de recurso obtenido exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error finding resource type by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar tipo de recurso
     * PUT /api/resource-types/:id
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateResourceTypeDto: UpdateResourceTypeDto,
    ): Promise<ApiResponseDto<ResourceTypeResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource type ID format: ${id}`);
          throw new Error('ID de tipo de recurso inválido');
        }
  
        this.logger.log(`Updating resource type: ${id}`);
        const resourceType = await this.resourceTypeService.update(id, updateResourceTypeDto);
        return ApiResponseDto.success(
          resourceType,
          'Tipo de recurso actualizado exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error updating resource type: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Activar tipo de recurso
     * PUT /api/resource-types/:id/activate
     */
    @Put(':id/activate')
    async activate(@Param('id') id: string): Promise<ApiResponseDto<ResourceTypeResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource type ID format: ${id}`);
          throw new Error('ID de tipo de recurso inválido');
        }
  
        this.logger.log(`Activating resource type: ${id}`);
        const resourceType = await this.resourceTypeService.activate(id);
        return ApiResponseDto.success(
          resourceType,
          'Tipo de recurso activado exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error activating resource type: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Desactivar tipo de recurso
     * PUT /api/resource-types/:id/deactivate
     */
    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string): Promise<ApiResponseDto<ResourceTypeResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource type ID format: ${id}`);
          throw new Error('ID de tipo de recurso inválido');
        }
  
        this.logger.log(`Deactivating resource type: ${id}`);
        const resourceType = await this.resourceTypeService.deactivate(id);
        return ApiResponseDto.success(
          resourceType,
          'Tipo de recurso desactivado exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error deactivating resource type: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar tipo de recurso permanentemente
     * DELETE /api/resource-types/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource type ID format: ${id}`);
          throw new Error('ID de tipo de recurso inválido');
        }
  
        this.logger.log(`Deleting resource type permanently: ${id}`);
        await this.resourceTypeService.delete(id);
        return ApiResponseDto.success(null, 'Tipo de recurso eliminado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting resource type: ${id}`, error);
        throw error;
      }
    }
  }