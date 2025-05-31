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
import { UserService } from '@services/user.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '@common/dto/auth.dto';
import { ApiResponseDto, PaginatedResponseDto } from '@common/dto/base.dto';
import { Roles } from '@common/decorators/auth.decorators';
import { UserRole } from '@middlewares/roles.guard';
import { ValidationUtils, MongoUtils } from '@common/utils';

/**
 * Controlador para gestión de usuarios del sistema (solo administradores)
 * Ruta: src/controllers/user.controller.ts
 */

@Controller('users')
@Roles(UserRole.ADMIN) // Solo administradores pueden gestionar usuarios
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('UserController');
  }

  /**
   * Crear un nuevo usuario del sistema
   * POST /api/users
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createUserDto: CreateUserDto): Promise<ApiResponseDto<UserResponseDto>> {
    try {
      this.logger.log(`Creating user with email: ${createUserDto.email}`);

      const user = await this.userService.create(createUserDto);

      return ApiResponseDto.success(user, 'Usuario creado exitosamente', HttpStatus.CREATED);
    } catch (error) {
      this.logger.error(`Error creating user: ${createUserDto.email}`, error);
      throw error;
    }
  }

  /**
   * Obtener todos los usuarios con filtros y paginación
   * GET /api/users
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('role') role?: 'admin' | 'librarian',
    @Query('active') active?: string,
    @Query('search') search?: string,
  ): Promise<ApiResponseDto<PaginatedResponseDto<UserResponseDto>>> {
    try {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 20;

      const filters: any = {};

      if (role) {
        filters.role = role;
      }

      if (active !== undefined) {
        filters.active = active === 'true';
      }

      if (search && ValidationUtils.isNotEmpty(search)) {
        filters.search = search.trim();
      }

      this.logger.debug(`Finding users with filters:`, filters);

      const result = await this.userService.findAll(filters, pageNum, limitNum);

      return ApiResponseDto.success(result, 'Usuarios obtenidos exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error finding users', error);
      throw error;
    }
  }

  /**
   * Obtener usuario por ID
   * GET /api/users/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponseDto<UserResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid user ID format: ${id}`);
        throw new Error('ID de usuario inválido');
      }

      this.logger.debug(`Finding user by ID: ${id}`);

      const user = await this.userService.findById(id);

      return ApiResponseDto.success(user, 'Usuario obtenido exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error finding user by ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Actualizar usuario
   * PUT /api/users/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponseDto<UserResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid user ID format: ${id}`);
        throw new Error('ID de usuario inválido');
      }

      this.logger.log(`Updating user: ${id}`);

      const user = await this.userService.update(id, updateUserDto);

      return ApiResponseDto.success(user, 'Usuario actualizado exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error updating user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Desactivar usuario (soft delete)
   * PUT /api/users/:id/deactivate
   */
  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<UserResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid user ID format: ${id}`);
        throw new Error('ID de usuario inválido');
      }

      this.logger.log(`Deactivating user: ${id}`);

      const user = await this.userService.deactivate(id);

      return ApiResponseDto.success(user, 'Usuario desactivado exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error deactivating user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Activar usuario
   * PUT /api/users/:id/activate
   */
  @Put(':id/activate')
  async activate(@Param('id') id: string): Promise<ApiResponseDto<UserResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid user ID format: ${id}`);
        throw new Error('ID de usuario inválido');
      }

      this.logger.log(`Activating user: ${id}`);

      const user = await this.userService.activate(id);

      return ApiResponseDto.success(user, 'Usuario activado exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error activating user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Eliminar usuario permanentemente
   * DELETE /api/users/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid user ID format: ${id}`);
        throw new Error('ID de usuario inválido');
      }

      this.logger.log(`Deleting user permanently: ${id}`);

      await this.userService.delete(id);

      return ApiResponseDto.success(null, 'Usuario eliminado exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error deleting user: ${id}`, error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de usuarios
   * GET /api/users/statistics
   */
  @Get('stats/summary')
  async getStatistics(): Promise<
    ApiResponseDto<{
      total: number;
      active: number;
      inactive: number;
      admins: number;
      librarians: number;
    }>
  > {
    try {
      this.logger.debug('Getting user statistics');

      const stats = await this.userService.getStatistics();

      return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error getting user statistics', error);
      throw error;
    }
  }
}
