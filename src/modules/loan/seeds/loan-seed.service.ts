// src/modules/loan/seeds/loan-seed.service.ts
import { Injectable } from '@nestjs/common';
import { LoanStatusRepository } from '@modules/loan/repositories';
import { LoggerService } from '@shared/services/logger.service';

/**
 * Servicio para sembrar datos iniciales de préstamos
 */
@Injectable()
export class LoanSeedService {
  constructor(
    private readonly loanStatusRepository: LoanStatusRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LoanSeedService');
  }

  /**
   * Ejecutar todas las siembras de préstamos
   */
  async seedAll(): Promise<void> {
    this.logger.log('Starting loan data seeding...');

    try {
      await this.seedLoanStatuses();
      this.logger.log('Loan data seeding completed successfully');
    } catch (error) {
      this.logger.error('Error during loan data seeding', error);
      throw error;
    }
  }

  /**
   * Sembrar estados de préstamos iniciales
   */
  private async seedLoanStatuses(): Promise<void> {
    this.logger.log('Seeding loan statuses...');

    const loanStatuses = [
      {
        name: 'active' as const,
        description: 'Préstamo activo - recurso en poder del usuario',
        color: '#007bff', // Azul
        active: true,
      },
      {
        name: 'returned' as const,
        description: 'Préstamo devuelto - recurso regresado a la biblioteca',
        color: '#28a745', // Verde
        active: true,
      },
      {
        name: 'overdue' as const,
        description: 'Préstamo vencido - fecha límite superada',
        color: '#ffc107', // Amarillo
        active: true,
      },
      {
        name: 'lost' as const,
        description: 'Recurso perdido - no devuelto y declarado como perdido',
        color: '#dc3545', // Rojo
        active: true,
      },
    ];

    for (const statusData of loanStatuses) {
      const existing = await this.loanStatusRepository.findByName(statusData.name);

      if (!existing) {
        await this.loanStatusRepository.create(statusData);
        this.logger.log(`Created loan status: ${statusData.name}`);
      } else {
        this.logger.debug(`Loan status already exists: ${statusData.name}`);
      }
    }

    this.logger.log('Loan statuses seeding completed');
  }

  /**
   * Verificar integridad de datos de préstamos
   */
  async verifyLoanDataIntegrity(): Promise<{
    hasLoanStatuses: boolean;
    loanStatusesCount: number;
  }> {
    const loanStatuses = await this.loanStatusRepository.findAllActive();

    return {
      hasLoanStatuses: loanStatuses.length >= 4, // active, returned, overdue, lost
      loanStatusesCount: loanStatuses.length,
    };
  }

  /**
   * Limpiar datos de préstamos (solo para desarrollo/testing)
   */
  async clearLoanData(): Promise<void> {
    this.logger.warn('Clearing loan data...');

    try {
      await this.loanStatusRepository.bulkDelete({});
      this.logger.log('Loan data cleared successfully');
    } catch (error) {
      this.logger.error('Error clearing loan data', error);
      throw error;
    }
  }
}