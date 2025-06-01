// src/modules/resource/controllers/category.controller.ts
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
  import { CategoryService } from '@modules/resource/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateCategoryDto,
    UpdateCategoryDto,
    CategoryResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador para gestión de categorías de recursos
   */
  
  @Controller('categories')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
  export class CategoryController {
    constructor(
      private readonly categoryService: CategoryService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('CategoryController');
    }
  
    /**
     * Crear una nueva categoría
     * POST /api/categories
     */
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
  
    /**
     * Obtener todas las categorías con filtros y paginación
     * GET /api/categories
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('active') active?: string,
    ): Promise<ApiResponseDto<PaginatedResponseDto<CategoryResponseDto>>> {
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
  
        this.logger.debug('Finding categories with filters:', filters);
  
        const result = await this.categoryService.findAll(filters, pageNum, limitNum);
  
        return ApiResponseDto.success(result, 'Categorías obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding categories', error);
        throw error;
      }
    }
  
    /**
     * Obtener todas las categorías activas (para formularios)
     * GET /api/categories/active
     */
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
  
    /**
     * Obtener categoría por ID
     * GET /api/categories/:id
     */
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
  
    /**
     * Actualizar categoría
     * PUT /api/categories/:id
     */
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
  
    /**
     * Desactivar categoría
     * PUT /api/categories/:id/deactivate
     */
    @Put(':id/deactivate')
    async deactivate(@Param('id') id: string): Promise<ApiResponseDto<CategoryResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid category ID format: ${id}`);
          throw new Error('ID de categoría inválido');
        }
  
        this.logger.log(`Deactivating category: ${id}`);
  
        const category = await this.categoryService.deactivate(id);
  
        return ApiResponseDto.success(category, 'Categoría desactivada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error deactivating category: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Activar categoría
     * PUT /api/categories/:id/activate
     */
    @Put(':id/activate')
    async activate(@Param('id') id: string): Promise<ApiResponseDto<CategoryResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid category ID format: ${id}`);
          throw new Error('ID de categoría inválido');
        }
  
        this.logger.log(`Activating category: ${id}`);
  
        const category = await this.categoryService.activate(id);
  
        return ApiResponseDto.success(category, 'Categoría activada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error activating category: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Eliminar categoría permanentemente
     * DELETE /api/categories/:id
     */
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
  
    /**
     * Obtener categorías más utilizadas
     * GET /api/categories/stats/most-used
     */
    @Get('stats/most-used')
    async getMostUsedCategories(
      @Query('limit') limit: string = '10',
    ): Promise<
      ApiResponseDto<
        Array<{
          _id: string;
          name: string;
          description: string;
          color: string;
          resourceCount: number;
        }>
      >
    > {
      try {
        const limitNum = Math.min(parseInt(limit, 10) || 10, 50); // Máximo 50
  
        this.logger.debug(`Getting most used categories (limit: ${limitNum})`);
  
        const categories = await this.categoryService.getMostUsedCategories(limitNum);
  
        return ApiResponseDto.success(
          categories,
          'Categorías más utilizadas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error getting most used categories', error);
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de categorías
     * GET /api/categories/stats/summary
     */
    @Get('stats/summary')
    async getStatistics(): Promise<
      ApiResponseDto<{
        total: number;
        active: number;
        inactive: number;
        mostUsed: Array<{ name: string; count: number }>;
      }>
    > {
      try {
        this.logger.debug('Getting category statistics');
  
        const stats = await this.categoryService.getStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting category statistics', error);
        throw error;
      }
    }
  }