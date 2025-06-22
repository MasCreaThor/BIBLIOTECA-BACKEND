// src/modules/resource/controllers/management/category.controller.ts
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
  import { CategoryService } from '@modules/resource/services/management/category.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateCategoryDto,
    UpdateCategoryDto,
    CategoryResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { MongoUtils, ValidationUtils } from '@shared/utils';
  
  @Controller('categories')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class CategoryController {
    constructor(
      private readonly categoryService: CategoryService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('CategoryController');
    }
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createCategoryDto: CreateCategoryDto,
    ): Promise<ApiResponseDto<CategoryResponseDto>> {
      try {
        this.logger.log(`Creating category: ${createCategoryDto.name}`);
        const category = await this.categoryService.create(createCategoryDto);
        return ApiResponseDto.success(category, 'Categoría creada exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating category: ${createCategoryDto.name}`, error);
        throw error;
      }
    }
  
    @Get()
    async findAll(
      @Query('search') search?: string,
      @Query('active') active?: string,
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('sortBy') sortBy: string = 'name',
      @Query('sortOrder') sortOrder: 'asc' | 'desc' = 'asc',
    ): Promise<ApiResponseDto<any>> {
      try {
        // Validar y parsear parámetros
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 20, 100);
        
        // Construir filtros
        const filters: any = {};
        
        if (search && ValidationUtils.isNotEmpty(search)) {
          filters.search = search.trim();
        }
        
        if (active !== undefined) {
          filters.active = active === 'true';
        }
        
        filters.page = pageNum;
        filters.limit = limitNum;
        filters.sortBy = sortBy;
        filters.sortOrder = sortOrder;

        this.logger.debug('Finding categories with filters:', filters);
        
        const result = await this.categoryService.findWithFilters(filters);
        
        return ApiResponseDto.success(
          result,
          'Categorías obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding categories', error);
        throw error;
      }
    }

    @Get('active')
    async findAllActive(): Promise<ApiResponseDto<CategoryResponseDto[]>> {
      try {
        this.logger.debug('Finding all active categories');
        const categories = await this.categoryService.findAllActive();
        return ApiResponseDto.success(
          categories,
          'Categorías activas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active categories', error);
        throw error;
      }
    }
  
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<CategoryResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid category ID format: ${id}`);
          throw new Error('ID de categoría inválido');
        }
  
        this.logger.debug(`Finding category by ID: ${id}`);
        const category = await this.categoryService.findById(id);
        return ApiResponseDto.success(category, 'Categoría obtenida exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding category by ID: ${id}`, error);
        throw error;
      }
    }
  
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updateCategoryDto: UpdateCategoryDto,
    ): Promise<ApiResponseDto<CategoryResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid category ID format: ${id}`);
          throw new Error('ID de categoría inválido');
        }
  
        this.logger.log(`Updating category: ${id}`);
        const category = await this.categoryService.update(id, updateCategoryDto);
        return ApiResponseDto.success(category, 'Categoría actualizada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error updating category: ${id}`, error);
        throw error;
      }
    }
  
    @Delete(':id')
    @HttpCode(HttpStatus.OK)
    async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid category ID format: ${id}`);
          throw new Error('ID de categoría inválido');
        }
  
        this.logger.log(`Deleting category permanently: ${id}`);
        await this.categoryService.delete(id);
        return ApiResponseDto.success(null, 'Categoría eliminada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deleting category: ${id}`, error);
        throw error;
      }
    }
  }