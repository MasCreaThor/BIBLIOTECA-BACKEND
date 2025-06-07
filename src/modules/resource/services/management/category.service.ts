// src/modules/resource/services/management/category.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { CategoryRepository, ResourceRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateCategoryDto,
    UpdateCategoryDto,
    CategoryResponseDto,
  } from '@modules/resource/dto';
  import { CategoryDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  @Injectable()
  export class CategoryService {
    constructor(
      private readonly categoryRepository: CategoryRepository,
      private readonly resourceRepository: ResourceRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('CategoryService');
    }
  
    async create(createCategoryDto: CreateCategoryDto): Promise<CategoryResponseDto> {
      const { name, description, color } = createCategoryDto;
  
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
    }
  
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
  
    async findAllActive(): Promise<CategoryResponseDto[]> {
      const categories = await this.categoryRepository.findAllActive();
      return categories.map(category => this.mapToResponseDto(category));
    }
  
    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<CategoryResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      const existingCategory = await this.categoryRepository.findById(id);
      if (!existingCategory) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      const updateData: any = {};
  
      if (updateCategoryDto.name && updateCategoryDto.name !== existingCategory.name) {
        const existingByName = await this.categoryRepository.findByName(updateCategoryDto.name);
        if (existingByName && (existingByName._id as any).toString() !== id) {
          throw new ConflictException('Ya existe una categoría con este nombre');
        }
        updateData.name = updateCategoryDto.name.trim();
      }
  
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
    }
  
    async delete(id: string): Promise<void> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de categoría inválido');
      }
  
      const category = await this.categoryRepository.findById(id);
      if (!category) {
        throw new NotFoundException('Categoría no encontrada');
      }
  
      // Verificar que no tenga recursos asociados
      const resourceCount = await this.resourceRepository.countByCategory(id);
      if (resourceCount > 0) {
        throw new BadRequestException(
          `No se puede eliminar la categoría porque tiene ${resourceCount} recursos asociados`
        );
      }
  
      await this.categoryRepository.delete(id);
      this.logger.log(`Category deleted permanently: ${category.name}`);
    }
  
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
  
 