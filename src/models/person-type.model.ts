import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Modelo para tipos de persona (estudiante, docente)
 */

@Schema({
  timestamps: true,
  collection: 'person_types',
})
export class PersonType extends Document {
  @Prop()
  _id!: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['student', 'teacher'],
  })
  name!: 'student' | 'teacher';

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

export type PersonTypeDocument = PersonType & Document;
export const PersonTypeSchema = SchemaFactory.createForClass(PersonType);

// Índices para optimización
PersonTypeSchema.index({ active: 1 });