// src/modules/resource/models/resource.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Modelo para recursos de la biblioteca (libros, juegos, mapas, etc.)
 */

@Schema({
  timestamps: true,
  collection: 'resources',
})
export class Resource extends Document {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'ResourceType',
  })
  typeId!: Types.ObjectId;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Category',
  })
  categoryId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
    maxlength: 300,
  })
  title!: string;

  @Prop({
    type: [{ type: Types.ObjectId, ref: 'Author' }],
    default: [],
  })
  authorIds!: Types.ObjectId[];

  @Prop({
    type: Types.ObjectId,
    ref: 'Publisher',
  })
  publisherId?: Types.ObjectId;

  @Prop({
    type: Number,
    min: 1,
    default: 1,
  })
  volumes?: number;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'ResourceState',
  })
  stateId!: Types.ObjectId;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Location',
  })
  locationId!: Types.ObjectId;

  @Prop({
    type: String,
    maxlength: 500,
  })
  notes?: string;

  @Prop({
    type: String,
    sparse: true,
  })
  googleBooksId?: string;

  // ✅ CORRECCIÓN: Campo para URL de imagen de portada
  @Prop({
    type: String,
    sparse: true,
    validate: {
      validator: function(url: string) {
        if (!url) return true; // Optional field
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      },
      message: 'La URL de la imagen de portada debe ser válida'
    }
  })
  coverImageUrl?: string;

  @Prop({
    default: true,
  })
  available!: boolean;

  @Prop({
    type: String,
    sparse: true,
    match: [/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, 'ISBN inválido'],
  })
  isbn?: string;

  @Prop({
    type: Number,
    min: 0,
    default: 0,
  })
  totalLoans!: number;

  @Prop({
    type: Date,
  })
  lastLoanDate?: Date;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;
}

export type ResourceDocument = Resource & Document;
export const ResourceSchema = SchemaFactory.createForClass(Resource);

// Índices para optimización
ResourceSchema.index({ title: 'text' });
ResourceSchema.index({ typeId: 1 });
ResourceSchema.index({ categoryId: 1 });
ResourceSchema.index({ available: 1 });
ResourceSchema.index({ stateId: 1 });
ResourceSchema.index({ locationId: 1 });
ResourceSchema.index({ isbn: 1 });
ResourceSchema.index({ authorIds: 1 });
ResourceSchema.index({ publisherId: 1 });
ResourceSchema.index({ googleBooksId: 1 });

// Índice compuesto para búsquedas
ResourceSchema.index({ 
  title: 'text', 
  isbn: 'text' 
}, {
  weights: {
    title: 10,
    isbn: 5
  }
});