import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Modelo para usuarios del sistema (administrador y bibliotecario)
 */

@Schema({
  timestamps: true,
  collection: 'users',
})
export class User extends Document {
  @Prop({
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Email inválido'],
  })
  email!: string;

  @Prop({
    required: true,
    minlength: 8,
  })
  password!: string;

  @Prop({
    required: true,
    enum: ['admin', 'librarian'],
  })
  role!: 'admin' | 'librarian';

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  lastLogin?: Date;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;

  // Método virtual para excluir password en serialización
  toJSON(): Partial<User> {
    const userObject = this.toObject();
    delete userObject.password;
    return userObject;
  }
}

export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);

// Índices para optimización
UserSchema.index({ active: 1 });
UserSchema.index({ role: 1 });