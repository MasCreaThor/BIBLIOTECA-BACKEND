// src/modules/resource/models/resource-state.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para estados de recursos (good, deteriorated, damaged, lost)
 */

@Schema({
  timestamps: true,
  collection: 'resource_states',
})
export class ResourceState extends Document {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['good', 'deteriorated', 'damaged', 'lost'],
  })
  name!: 'good' | 'deteriorated' | 'damaged' | 'lost';

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  description!: string;

  @Prop({
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hexadecimal válido'],
    default: '#28a745',
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

export type ResourceStateDocument = ResourceState & Document;
export const ResourceStateSchema = SchemaFactory.createForClass(ResourceState);

// Índices para optimización
ResourceStateSchema.index({ active: 1 });
ResourceStateSchema.index({ name: 1 });