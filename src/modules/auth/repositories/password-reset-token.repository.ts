import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { PasswordResetToken, PasswordResetTokenDocument } from '../models/password-reset-token.model';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class PasswordResetTokenRepository extends BaseRepositoryImpl<PasswordResetTokenDocument> {
  constructor(
    @InjectModel(PasswordResetToken.name)
    private readonly passwordResetTokenModel: Model<PasswordResetTokenDocument>,
  ) {
    super(passwordResetTokenModel);
  }

  /**
   * Crear un nuevo token de recuperación
   */
  async createToken(userId: string, token: string): Promise<PasswordResetTokenDocument> {
    const resetToken = new this.passwordResetTokenModel({
      userId: new Types.ObjectId(userId),
      token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hora
    });

    return resetToken.save();
  }

  /**
   * Buscar token por valor
   */
  async findByToken(token: string): Promise<PasswordResetTokenDocument | null> {
    return this.passwordResetTokenModel.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  /**
   * Buscar token por usuario
   */
  async findByUserId(userId: string): Promise<PasswordResetTokenDocument | null> {
    return this.passwordResetTokenModel.findOne({
      userId: new Types.ObjectId(userId),
      used: false,
      expiresAt: { $gt: new Date() },
    }).exec();
  }

  /**
   * Marcar token como usado
   */
  async markAsUsed(token: string): Promise<void> {
    await this.passwordResetTokenModel.updateOne(
      { token },
      { used: true }
    ).exec();
  }

  /**
   * Eliminar tokens expirados
   */
  async deleteExpiredTokens(): Promise<void> {
    await this.passwordResetTokenModel.deleteMany({
      expiresAt: { $lt: new Date() }
    }).exec();
  }

  /**
   * Eliminar todos los tokens de un usuario
   */
  async deleteUserTokens(userId: string): Promise<void> {
    await this.passwordResetTokenModel.deleteMany({
      userId: new Types.ObjectId(userId)
    }).exec();
  }
} 