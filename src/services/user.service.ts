import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { UserRepository } from '@repositories/user.repository';
import { PasswordService } from './password.service';
import { LoggerService } from '@common/services/logger.service';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from '@common/dto/auth.dto';
import { PaginatedResponseDto } from '@common/dto/base.dto';
import { UserDocument } from '@models/user.model';
import { MongoUtils } from '@common/utils';

/**
 * Servicio para gestión de usuarios del sistema
 */

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly passwordService: PasswordService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('UserService');
  }

  /**
   * Crear un nuevo usuario del sistema
   */
  async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const { email, password, role } = createUserDto;

    try {
      // Verificar si el email ya existe
      const existingUser = await this.userRepository.findByEmail(email);
      if (existingUser) {
        throw new ConflictException('El email ya está registrado');
      }

      // Validar fortaleza de la contraseña
      const passwordValidation = this.passwordService.validatePasswordStrength(password);
      if (!passwordValidation.isValid) {
        throw new BadRequestException(passwordValidation.errors.join('. '));
      }

      // Encriptar contraseña
      const hashedPassword = await this.passwordService.hashPassword(password);

      // Crear usuario
      const userData = {
        email,
        password: hashedPassword,
        role: role,
        active: true,
      };

      const createdUser = await this.userRepository.create(userData);

      this.logger.log(`User created successfully: ${email} with role: ${role}`);

      return this.mapToResponseDto(createdUser);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      this.logger.error(`Error creating user: ${email}`, error);
      throw new BadRequestException('Error al crear el usuario');
    }
  }

  /**
   * Obtener usuario por ID
   */
  async findById(id: string): Promise<UserResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const user = await this.userRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Obtener usuario por email
   */
  async findByEmail(email: string): Promise<UserResponseDto> {
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return this.mapToResponseDto(user);
  }

  /**
   * Obtener todos los usuarios con filtros y paginación
   */
  async findAll(
    filters: {
      role?: 'admin' | 'librarian';
      active?: boolean;
      search?: string;
    } = {},
    page: number = 1,
    limit: number = 20,
  ): Promise<PaginatedResponseDto<UserResponseDto>> {
    const result = await this.userRepository.findWithFilters(filters, page, limit);

    const mappedData = result.data.map((user) => this.mapToResponseDto(user));

    return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
  }

  /**
   * Actualizar usuario
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    try {
      const updateData: any = {};

      // Actualizar email si se proporciona
      if (updateUserDto.email && updateUserDto.email !== existingUser.email) {
        const emailExists = await this.userRepository.findByEmail(updateUserDto.email);
        if (emailExists) {
          throw new ConflictException('El email ya está registrado');
        }
        updateData.email = updateUserDto.email;
      }

      // Actualizar contraseña si se proporciona
      if (updateUserDto.password) {
        const passwordValidation = this.passwordService.validatePasswordStrength(
          updateUserDto.password,
        );
        if (!passwordValidation.isValid) {
          throw new BadRequestException(passwordValidation.errors.join('. '));
        }
        updateData.password = await this.passwordService.hashPassword(updateUserDto.password);
      }

      // Actualizar rol si se proporciona
      if (updateUserDto.role) {
        updateData.role = updateUserDto.role;
      }

      const updatedUser = await this.userRepository.update(id, updateData);

      if (!updatedUser) {
        throw new NotFoundException('Usuario no encontrado');
      }

      this.logger.log(`User updated successfully: ${updatedUser.email}`);

      return this.mapToResponseDto(updatedUser);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error updating user: ${id}`, error);
      throw new BadRequestException('Error al actualizar el usuario');
    }
  }

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivate(id: string): Promise<UserResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    // Verificar que no es el último admin
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === 'admin') {
      const adminCount = await this.userRepository.countByRole('admin');
      if (adminCount <= 1) {
        throw new ForbiddenException('No se puede desactivar el último administrador');
      }
    }

    const deactivatedUser = await this.userRepository.deactivate(id);

    if (!deactivatedUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    this.logger.log(`User deactivated: ${deactivatedUser.email}`);

    return this.mapToResponseDto(deactivatedUser);
  }

  /**
   * Activar usuario
   */
  async activate(id: string): Promise<UserResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    const activatedUser = await this.userRepository.activate(id);

    if (!activatedUser) {
      throw new NotFoundException('Usuario no encontrado');
    }

    this.logger.log(`User activated: ${activatedUser.email}`);

    return this.mapToResponseDto(activatedUser);
  }

  /**
   * Eliminar usuario permanentemente
   */
  async delete(id: string): Promise<void> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de usuario inválido');
    }

    // Verificar que no es el último admin
    const user = await this.userRepository.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (user.role === 'admin') {
      const adminCount = await this.userRepository.countByRole('admin');
      if (adminCount <= 1) {
        throw new ForbiddenException('No se puede eliminar el último administrador');
      }
    }

    const deleted = await this.userRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('Usuario no encontrado');
    }

    this.logger.log(`User deleted permanently: ${user.email}`);
  }

  /**
   * Obtener estadísticas de usuarios
   */
  async getStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    admins: number;
    librarians: number;
  }> {
    const [total, active, admins, librarians] = await Promise.all([
      this.userRepository.count({}),
      this.userRepository.count({ active: true }),
      this.userRepository.countByRole('admin'),
      this.userRepository.countByRole('librarian'),
    ]);

    return {
      total,
      active,
      inactive: total - active,
      admins,
      librarians,
    };
  }

  /**
   * Verificar si existe al menos un administrador
   */
  async hasAdminUser(): Promise<boolean> {
    return this.userRepository.hasAdminUser();
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(user: UserDocument): UserResponseDto {
    return {
      _id: (user._id as any).toString(),
      email: user.email,
      role: user.role,
      active: user.active,
      lastLogin: user.lastLogin,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
