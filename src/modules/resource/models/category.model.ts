// src/modules/resource/models/category.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para categorías de recursos (matemáticas, sociales, diccionarios, etc.)
 */

@Schema({
  timestamps: true,
  collection: 'categories',
})
export class Category extends Document {
  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  description!: string;

  @Prop({
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hexadecimal válido'],
    default: '#6c757d',
  })
  color!: string;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type CategoryDocument = Category & Document;
export const CategorySchema = SchemaFactory.createForClass(Category);

// Índices para optimización
CategorySchema.index({ active: 1 });
CategorySchema.index({ name: 1 });
CategorySchema.index({ name: 'text' });