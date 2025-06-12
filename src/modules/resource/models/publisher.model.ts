// src/modules/resource/models/publisher.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para editoriales
 */

@Schema({
  timestamps: true,
  collection: 'publishers',
})
export class Publisher extends Document {
  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  name!: string;

  @Prop({
    type: String,
    maxlength: 500,
  })
  description?: string;

  @Prop({
    type: String,
    sparse: true,
    index: true,
  })
  googleBooksPublisherId?: string;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type PublisherDocument = Publisher & Document;
export const PublisherSchema = SchemaFactory.createForClass(Publisher);

// Índices para optimización
PublisherSchema.index({ active: 1 });
PublisherSchema.index({ name: 'text' });