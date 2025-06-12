// src/modules/loan/models/loan-status.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Modelo para estados de préstamos
 */
@Schema({
  timestamps: true,
  collection: 'loan_statuses',
})
export class LoanStatus extends Document {
  @Prop({
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    enum: ['active', 'returned', 'overdue', 'lost'],
  })
  name!: 'active' | 'returned' | 'overdue' | 'lost';

  @Prop({
    required: true,
    trim: true,
    maxlength: 200,
  })
  description!: string;

  @Prop({
    type: String,
    match: [/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color debe ser un código hexadecimal válido'],
    default: '#007bff',
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

export type LoanStatusDocument = LoanStatus & Document;
export const LoanStatusSchema = SchemaFactory.createForClass(LoanStatus);

// Índices para optimización
LoanStatusSchema.index({ active: 1 });