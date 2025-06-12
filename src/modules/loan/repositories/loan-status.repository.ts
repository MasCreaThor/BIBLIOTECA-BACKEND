// src/modules/loan/repositories/loan-status.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { LoanStatus, LoanStatusDocument } from '@modules/loan/models';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class LoanStatusRepository extends BaseRepositoryImpl<LoanStatusDocument> {
  constructor(@InjectModel(LoanStatus.name) private loanStatusModel: Model<LoanStatusDocument>) {
    super(loanStatusModel);
  }

  /**
   * Buscar estado de préstamo por nombre
   */
  async findByName(name: 'active' | 'returned' | 'overdue' | 'lost'): Promise<LoanStatusDocument | null> {
    return this.loanStatusModel.findOne({ name, active: true }).exec();
  }

  /**
   * Buscar todos los estados activos
   */
  async findAllActive(): Promise<LoanStatusDocument[]> {
    return this.loanStatusModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  /**
   * Obtener estado "activo"
   */
  async getActiveStatus(): Promise<LoanStatusDocument | null> {
    return this.findByName('active');
  }

  /**
   * Obtener estado "devuelto"
   */
  async getReturnedStatus(): Promise<LoanStatusDocument | null> {
    return this.findByName('returned');
  }

  /**
   * Obtener estado "vencido"
   */
  async getOverdueStatus(): Promise<LoanStatusDocument | null> {
    return this.findByName('overdue');
  }

  /**
   * Obtener estado "perdido"
   */
  async getLostStatus(): Promise<LoanStatusDocument | null> {
    return this.findByName('lost');
  }
}

