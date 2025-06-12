// src/modules/loan/models/loan.model.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

/**
 * Modelo para préstamos de recursos
 */
@Schema({
  timestamps: true,
  collection: 'loans',
})
export class Loan extends Document {
  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Person',
  })
  personId!: Types.ObjectId;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'Resource',
  })
  resourceId!: Types.ObjectId;

  @Prop({
    type: Number,
    min: 1,
    default: 1,
  })
  quantity!: number;

  @Prop({
    required: true,
    type: Date,
    default: Date.now,
  })
  loanDate!: Date;

  @Prop({
    required: true,
    type: Date,
  })
  dueDate!: Date;

  @Prop({
    type: Date,
    default: null,
  })
  returnedDate?: Date;

  @Prop({
    required: true,
    type: Types.ObjectId,
    ref: 'LoanStatus',
  })
  statusId!: Types.ObjectId;

  @Prop({
    type: String,
    maxlength: 500,
  })
  observations?: string;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  loanedBy!: Types.ObjectId; // Usuario que registró el préstamo

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
  })
  returnedBy?: Types.ObjectId; // Usuario que registró la devolución

  @Prop()
  createdAt!: Date;

  @Prop()
  updatedAt!: Date;

  // Virtual para calcular días de retraso
  get daysOverdue(): number {
    if (!this.returnedDate && new Date() > this.dueDate) {
      const diffTime = new Date().getTime() - this.dueDate.getTime();
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    return 0;
  }

  // Virtual para verificar si está vencido
  get isOverdue(): boolean {
    return !this.returnedDate && new Date() > this.dueDate;
  }
}

export type LoanDocument = Loan & Document;
export const LoanSchema = SchemaFactory.createForClass(Loan);