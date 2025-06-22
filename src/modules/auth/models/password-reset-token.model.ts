import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Modelo para tokens de recuperación de contraseña
 */
@Schema({
  timestamps: true,
  collection: 'password_reset_tokens',
})
export class PasswordResetToken extends Document {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'User',
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
  })
  token!: string;

  @Prop({
    required: true,
    default: Date.now,
    expires: 3600, // Expira en 1 hora (3600 segundos)
  })
  expiresAt!: Date;

  @Prop({
    default: false,
  })
  used!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type PasswordResetTokenDocument = PasswordResetToken & Document;
export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken); 