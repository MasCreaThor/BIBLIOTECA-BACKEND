// src/modules/resource/models/location.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para ubicaciones/estantes de recursos
 */

@Schema({
  timestamps: true,
  collection: 'locations',
})
export class Location extends Document {
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
    maxlength: 50,
  })
  code?: string;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type LocationDocument = Location & Document;
export const LocationSchema = SchemaFactory.createForClass(Location);

// Índices para optimización
LocationSchema.index({ active: 1 });
LocationSchema.index({ name: 1 });
LocationSchema.index({ code: 1 });
LocationSchema.index({ name: 'text' });