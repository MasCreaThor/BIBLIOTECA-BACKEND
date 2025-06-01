// src/modules/resource/services/category.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
    ForbiddenException,
  } from '@nestjs/common';
  import { CategoryRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateCategoryDto,
    UpdateCategoryDto,
    CategoryResponseDto,
  } from '@modules/resource/dto';
  import { PaginatedResponseDto } from '@shared/dto/base.dto';
  import { CategoryDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  /**
   * Servicio para gestión de categorías de recursos
   */
  
  @Injectable()
  export class CategoryService {
    constructor(
      private readonly categoryRepository: CategoryRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('CategoryService');
    }
  
    /**
     * Crear nueva categoría
     */
    async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
      const { name, description, color } = createCategoryDto;
  
      try {
        // Verificar si ya existe una categoría con el mismo nombre
        const existingCategory = await this.categoryRepository.findByName(name);
        if (existingCategory) {
          throw new ConflictException('Ya existe una categoría con este nombre');
        }
  
        const categoryData = {
          name: name.trim(),
          description: description.trim(),
          color: color || '#6c757d',
          active: true,
        };
  
        const createdCategory = await this.categoryRepository.create(categoryData);
  
        this.logger.log(`Category created successfully: ${name}`);
  
        return this.mapToResponseDto(createdCategory);
      } catch (error) {
        if (error instanceof ConflictException || error instanceof BadRequestException) {
          throw error;
        }
  
        this.logger.error(`Error creating category: ${name}`, error);
        throw new BadRequestException('Error al crear la categoría');
      }
    }
  
    /**
     * Obtener categoría por ID
     */
    async findById(id: string): Promise<CategoryResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      const category = await this.categoryRepository.findById(id);
  
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      return this.mapToResponseDto(category);
    }
  
    /**
     * Obtener todas las categorías con filtros y paginación
     */
    async findAll(
      filters: {
        search?: string;
        active?: boolean;
      } = {},
      page: number = 1,
      limit: number = 20,
    ): Promise<PaginatedResponseDto<CategoryResponseDto>> {
      const result = await this.categoryRepository.findWithFilters(filters, page, limit);
  
      const mappedData = result.data.map((category) => this.mapToResponseDto(category));
  
      return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
    }
  
    /**
     * Obtener todas las categorías activas
     */
    async findAllActive(): Promise<CategoryResponseDto[]> {
      const categories = await this.categoryRepository.findAllActive();
      return categories.map(category => this.mapToResponseDto(category));
    }
  
    /**
     * Actualizar categoría
     */
    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      try {
        const updateData: any = {};
  
        // Verificar nombre único si se actualiza
        if (updateCategoryDto.name && updateCategoryDto.name !== existingCategory.name) {
          const existingByName = await this.categoryRepository.findByName(updateCategoryDto.name);
          if (existingByName && (existingByName._id as any).toString() !== id) {
            throw new ConflictException('Ya existe una categoría con este nombre');
          }
          updateData.name = updateCategoryDto.name.trim();
        }
  
        // Actualizar otros campos
        if (updateCategoryDto.description) {
          updateData.description = updateCategoryDto.description.trim();
        }
  
        if (updateCategoryDto.color) {
          updateData.color = updateCategoryDto.color;
        }
  
        if (updateCategoryDto.active !== undefined) {
          updateData.active = updateCategoryDto.active;
        }
  
        const updatedCategory = await this.categoryRepository.update(id, updateData);
  
        if (!updatedCategory) {
          throw new NotFoundException('Categoría no encontrada');
        }
  
        this.logger.log(`Category updated successfully: ${updatedCategory.name}`);
  
        return this.mapToResponseDto(updatedCategory);
      } catch (error) {
        if (
          error instanceof ConflictException ||
          error instanceof BadRequestException ||
          error instanceof NotFoundException
        ) {
          throw error;
        }
  
        this.logger.error(`Error updating category: ${id}`, error);
        throw new BadRequestException('Error al actualizar la categoría');
      }
    }
  
    /**
     * Desactivar categoría
     */
    async deactivate(id: string): Promise<CategoryResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      // Verificar que no tenga recursos asociados antes de desactivar
      const resourceCount = await this.categoryRepository.countResourcesByCategory(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede desactivar la categoría porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deactivatedCategory = await this.categoryRepository.deactivate(id);
  
      if (!deactivatedCategory) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      this.logger.log(`Category deactivated: ${deactivatedCategory.name}`);
  
      return this.mapToResponseDto(deactivatedCategory);
    }
  
    /**
     * Activar categoría
     */
    async activate(id: string): Promise<CategoryResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      const activatedCategory = await this.categoryRepository.activate(id);
  
      if (!activatedCategory) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      this.logger.log(`Category activated: ${activatedCategory.name}`);
  
      return this.mapToResponseDto(activatedCategory);
    }
  
    /**
     * Eliminar categoría permanentemente
     */
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.categoryRepository.countResourcesByCategory(id);
      if (resourceCount > 0) {
        throw new ForbiddenException(
          `No se puede eliminar la categoría porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      const deleted = await this.categoryRepository.delete(id);
  
      if (!deleted) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      this.logger.log(`Category deleted permanently: ${category.name}`);
    }
  
    /**
     * Obtener categorías más utilizadas
     */
    async getMostUsedCategories(limit: number = 10): Promise<Array<{
      _id: string;
      name: string;
      description: string;
      color: string;
      resourceCount: number;
    }>> {
      return this.categoryRepository.getMostUsedCategories(limit);
    }
  
    /**
     * Obtener estadísticas de categorías
     */
    async getStatistics(): Promise<{
      total: number;
      active: number;
      inactive: number;
      mostUsed: Array<{ name: string; count: number }>;
    }> {
      const [total, active, mostUsed] = await Promise.all([
        this.categoryRepository.count({}),
        this.categoryRepository.count({ active: true }),
        this.categoryRepository.getMostUsedCategories(5),
      ]);
  
      return {
        total,
        active,
        inactive: total - active,
        mostUsed: mostUsed.map(category => ({
          name: category.name,
          count: category.resourceCount,
        })),
      };
    }
  
    /**
     * Mapear entidad a DTO de respuesta
     */
    private mapToResponseDto(category: CategoryDocument): CategoryResponseDto {
      return {
        _id: (category._id as any).toString(),
        name: category.name,
        description: category.description,
        color: category.color,
        active: category.active,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
      };
    }
  }