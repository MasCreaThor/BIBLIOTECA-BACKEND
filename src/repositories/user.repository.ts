import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '@models/user.model';
import { BaseRepositoryImpl } from './base.repository';

/**
 * Repositorio para usuarios del sistema
 * Ruta: src/repositories/user.repository.ts
 */

@Injectable()
export class UserRepository extends BaseRepositoryImpl<UserDocument> {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {
    super(userModel);
  }

  /**
   * Buscar usuario por email
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /**
   * Buscar usuario por email incluyendo password (para autenticación)
   */
  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
  }

  /**
   * Buscar usuarios activos
   */
  async findActiveUsers(): Promise<UserDocument[]> {
    return this.userModel.find({ active: true }).exec();
  }

  /**
   * Buscar usuarios por rol
   */
  async findByRole(role: 'admin' | 'librarian'): Promise<UserDocument[]> {
    return this.userModel.find({ role, active: true }).exec();
  }

  /**
   * Contar usuarios por rol
   */
  async countByRole(role: 'admin' | 'librarian'): Promise<number> {
    return this.userModel.countDocuments({ role, active: true }).exec();
  }

  /**
   * Actualizar último login
   */
  async updateLastLogin(userId: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { lastLogin: new Date() }, { new: true })
      .exec();
  }

  /**
   * Desactivar usuario (soft delete)
   */
  async deactivate(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { active: false }, { new: true }).exec();
  }

  /**
   * Activar usuario
   */
  async activate(userId: string): Promise<UserDocument | null> {
    return this.userModel.findByIdAndUpdate(userId, { active: true }, { new: true }).exec();
  }

  /**
   * Verificar si existe un admin
   */
  async hasAdminUser(): Promise<boolean> {
    const count = await this.userModel.countDocuments({ role: 'admin', active: true }).exec();
    return count > 0;
  }

  /**
   * Buscar usuarios con filtros y paginación
   */
  async findWithFilters(
    filters: {
      role?: 'admin' | 'librarian';
      active?: boolean;
      search?: string;
    },
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    data: UserDocument[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query: any = {};

    if (filters.role) {
      query.role = filters.role;
    }

    if (filters.active !== undefined) {
      query.active = filters.active;
    }

    if (filters.search) {
      query.email = { $regex: filters.search, $options: 'i' };
    }

    const skip = (page - 1) * limit;
    const total = await this.userModel.countDocuments(query).exec();
    const totalPages = Math.ceil(total / limit);

    const data = await this.userModel
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();

    return {
      data,
      total,
      page,
      totalPages,
    };
  }

  /**
   * Actualizar password
   */
  async updatePassword(userId: string, hashedPassword: string): Promise<UserDocument | null> {
    return this.userModel
      .findByIdAndUpdate(userId, { password: hashedPassword }, { new: true })
      .exec();
  }
}
