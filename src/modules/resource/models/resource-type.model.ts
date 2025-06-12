// src/modules/resource/models/resource-type.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para tipos de recursos (book, game, map, bible)
 */

@Schema({
  timestamps: true,
  collection: 'resource_types',
})
export class ResourceType extends Document {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['book', 'game', 'map', 'bible'],
  })
  name!: 'book' | 'game' | 'map' | 'bible';

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  description!: string;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type ResourceTypeDocument = ResourceType & Document;
export const ResourceTypeSchema = SchemaFactory.createForClass(ResourceType);

// Índices para optimización
ResourceTypeSchema.index({ active: 1 });