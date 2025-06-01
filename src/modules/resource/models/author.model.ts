// src/modules/resource/models/author.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para autores de recursos
 */

@Schema({
  timestamps: true,
  collection: 'authors',
})
export class Author extends Document {
  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  name!: string;

  @Prop({
    type: String,
    maxlength: 1000,
  })
  biography?: string;

  @Prop({
    type: String,
    sparse: true,
  })
  googleBooksAuthorId?: string;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type AuthorDocument = Author & Document;
export const AuthorSchema = SchemaFactory.createForClass(Author);

// Índices para optimización
AuthorSchema.index({ active: 1 });
AuthorSchema.index({ name: 'text' });
AuthorSchema.index({ googleBooksAuthorId: 1 });