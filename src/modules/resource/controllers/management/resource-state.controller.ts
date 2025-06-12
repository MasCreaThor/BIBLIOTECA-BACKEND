// src/modules/resource/controllers/management/resource-state.controller.ts
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
  import { ResourceStateService } from '@modules/resource/services/management/resource-state.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateResourceStateDto,
    UpdateResourceStateDto,
    ResourceStateResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { MongoUtils } from '@shared/utils';
  
  @Controller('resource-states')
  @Roles(UserRole.ADMIN) // Solo administradores pueden gestionar estados de recursos
  export class ResourceStateController {
    constructor(
      private readonly resourceStateService: ResourceStateService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('ResourceStateController');
    }
  
    /**
     * Crear estado de recurso
     * POST /api/resource-states
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createResourceStateDto: CreateResourceStateDto,
    ): Promise<ApiResponseDto<ResourceStateResponseDto>> {
      try {
        this.logger.log(`Creating resource state: ${createResourceStateDto.name}`);
        const resourceState = await this.resourceStateService.create(createResourceStateDto);
        return ApiResponseDto.success(
          resourceState,
          'Estado de recurso creado exitosamente',
          HttpStatus.CREATED,
        );
      } catch (error) {
        this.logger.error(`Error creating resource state: ${createResourceStateDto.name}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener todos los estados de recursos activos
     * GET /api/resource-states
     */
    @Get()
    @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios también pueden consultar
    async findAllActive(): Promise<ApiResponseDto<ResourceStateResponseDto[]>> {
      try {
        this.logger.debug('Finding all active resource states');
        const resourceStates = await this.resourceStateService.findAllActive();
        return ApiResponseDto.success(
          resourceStates,
          'Estados de recursos obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active resource states', error);
        throw error;
      }
    }
  
    /**
     * Obtener estado de recurso por ID
     * GET /api/resource-states/:id
     */
    @Get(':id')
    @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios también pueden consultar
    async findById(@Param('id') id: string): Promise<ApiResponseDto<ResourceStateResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource state ID format: ${id}`);
          throw new Error('ID de estado de recurso inválido');
        }
  
        this.logger.debug(`Finding resource state by ID: ${id}`);
        const resourceState = await this.resourceStateService.findById(id);
        return ApiResponseDto.success(
          resourceState,
          'Estado de recurso obtenido exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error finding resource state by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Actualizar estado de recurso
     * PUT /api/resource-states/:id
     */
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateResourceStateDto: UpdateResourceStateDto,
    ): Promise<ApiResponseDto<ResourceStateResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource state ID format: ${id}`);
          throw new Error('ID de estado de recurso inválido');
        }
  
        this.logger.log(`Updating resource state: ${id}`);
        const resourceState = await this.resourceStateService.update(id, updateResourceStateDto);
        return ApiResponseDto.success(
          resourceState,
          'Estado de recurso actualizado exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error updating resource state: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Activar estado de recurso
     * PUT /api/resource-states/:id/activate
     */
    @Put(':id/activate')
    async activate(@Param('id') id: string): Promise<ApiResponseDto<ResourceStateResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource state ID format: ${id}`);
          throw new Error('ID de estado de recurso inválido');
        }
  
        this.logger.log(`Activating resource state: ${id}`);
        const resourceState = await this.resourceStateService.activate(id);
        return ApiResponseDto.success(
          resourceState,
          'Estado de recurso activado exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error activating resource state: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Desactivar estado de recurso
     * PUT /api/resource-states/:id/deactivate
     */
    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string): Promise<ApiResponseDto<ResourceStateResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource state ID format: ${id}`);
          throw new Error('ID de estado de recurso inválido');
        }
  
        this.logger.log(`Deactivating resource state: ${id}`);
        const resourceState = await this.resourceStateService.deactivate(id);
        return ApiResponseDto.success(
          resourceState,
          'Estado de recurso desactivado exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error deactivating resource state: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar estado de recurso permanentemente
     * DELETE /api/resource-states/:id
     */
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid resource state ID format: ${id}`);
          throw new Error('ID de estado de recurso inválido');
        }
  
        this.logger.log(`Deleting resource state permanently: ${id}`);
        await this.resourceStateService.delete(id);
        return ApiResponseDto.success(null, 'Estado de recurso eliminado exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting resource state: ${id}`, error);
        throw error;
      }
    }
  }