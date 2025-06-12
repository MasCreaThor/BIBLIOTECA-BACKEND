import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Modelo para personas registradas (estudiantes y docentes)
 */

@Schema({
  timestamps: true,
  collection: 'people',
})
export class Person extends Document {
  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  firstName!: string;

  @Prop({
    required: true,
    trim: true,
    maxlength: 100,
  })
  lastName!: string;

  @Prop({
    trim: true,
    unique: true,
    sparse: true,
    maxlength: 20,
  })
  documentNumber?: string;

  @Prop({
    trim: true,
    maxlength: 50,
  })
  grade?: string;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'PersonType',
  })
  personTypeId!: Types.ObjectId;

  @Prop({
    default: true,
  })
  active!: boolean;

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;

  // Virtual para el nombre completo
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}

export type PersonDocument = Person & Document;
export const PersonSchema = SchemaFactory.createForClass(Person);

// Índices para optimización
//PersonSchema.index({ firstName: 1, lastName: 1 });
//PersonSchema.index({ personTypeId: 1 });
//PersonSchema.index({ active: 1 });
//PersonSchema.index({ grade: 1 });

// Índice compuesto para búsquedas
PersonSchema.index({ firstName: 'text', lastName: 'text', documentNumber: 'text' });