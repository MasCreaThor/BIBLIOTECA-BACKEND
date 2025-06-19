import { Command, CommandRunner } from 'nest-commander';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Resource, ResourceDocument } from '@modules/resource/models';
import { LoggerService } from '@shared/services/logger.service';

@Injectable()
@Command({
  name: 'migrate:resource-stock',
  description: 'Migrar recursos existentes para agregar campos de stock granular',
})
export class ResourceStockMigrationCommand extends CommandRunner {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    private readonly logger: LoggerService,
  ) {
    super();
    this.logger.setContext('ResourceStockMigrationCommand');
  }

  async run(): Promise<void> {
    this.logger.log('🚀 Iniciando migración de stock granular para recursos...');

    try {
      // Contar recursos totales
      const totalResources = await this.resourceModel.countDocuments();
      this.logger.log(`📊 Total de recursos a migrar: ${totalResources}`);

      if (totalResources === 0) {
        this.logger.log('✅ No hay recursos para migrar');
        return;
      }

      // Actualizar todos los recursos que no tengan los nuevos campos
      const result = await this.resourceModel.updateMany(
        {
          $or: [
            { lostQuantity: { $exists: false } },
            { damagedQuantity: { $exists: false } },
            { maintenanceQuantity: { $exists: false } }
          ]
        },
        {
          $set: {
            lostQuantity: 0,
            damagedQuantity: 0,
            maintenanceQuantity: 0
          }
        }
      );

      this.logger.log(`✅ Migración completada:`);
      this.logger.log(`   - Recursos actualizados: ${result.modifiedCount}`);
      this.logger.log(`   - Recursos sin cambios: ${totalResources - result.modifiedCount}`);

      // Verificar que la migración fue exitosa
      const resourcesWithoutNewFields = await this.resourceModel.countDocuments({
        $or: [
          { lostQuantity: { $exists: false } },
          { damagedQuantity: { $exists: false } },
          { maintenanceQuantity: { $exists: false } }
        ]
      });

      if (resourcesWithoutNewFields === 0) {
        this.logger.log('✅ Todos los recursos tienen los nuevos campos de stock');
      } else {
        this.logger.warn(`⚠️  ${resourcesWithoutNewFields} recursos aún no tienen los nuevos campos`);
      }

      // Mostrar estadísticas de stock
      const stockStats = await this.getStockStatistics();
      this.logger.log('📈 Estadísticas de stock después de la migración:');
      this.logger.log(`   - Total de recursos: ${stockStats.totalResources}`);
      this.logger.log(`   - Recursos con stock disponible: ${stockStats.resourcesWithStock}`);
      this.logger.log(`   - Recursos sin stock: ${stockStats.resourcesWithoutStock}`);
      this.logger.log(`   - Unidades totales: ${stockStats.totalUnits}`);
      this.logger.log(`   - Unidades prestadas: ${stockStats.loanedUnits}`);
      this.logger.log(`   - Unidades disponibles: ${stockStats.availableUnits}`);
      this.logger.log(`   - Unidades perdidas: ${stockStats.lostUnits}`);
      this.logger.log(`   - Unidades dañadas: ${stockStats.damagedUnits}`);
      this.logger.log(`   - Unidades en mantenimiento: ${stockStats.maintenanceUnits}`);

    } catch (error) {
      this.logger.error('❌ Error durante la migración:', error);
      throw error;
    }
  }

  private async getStockStatistics(): Promise<{
    totalResources: number;
    resourcesWithStock: number;
    resourcesWithoutStock: number;
    totalUnits: number;
    loanedUnits: number;
    availableUnits: number;
    lostUnits: number;
    damagedUnits: number;
    maintenanceUnits: number;
  }> {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalResources: { $sum: 1 },
          totalUnits: { $sum: '$totalQuantity' },
          loanedUnits: { $sum: '$currentLoansCount' },
          lostUnits: { $sum: '$lostQuantity' },
          damagedUnits: { $sum: '$damagedQuantity' },
          maintenanceUnits: { $sum: '$maintenanceQuantity' }
        }
      },
      {
        $project: {
          _id: 0,
          totalResources: 1,
          totalUnits: 1,
          loanedUnits: 1,
          lostUnits: 1,
          damagedUnits: 1,
          maintenanceUnits: 1,
          availableUnits: {
            $subtract: [
              '$totalUnits',
              { $add: ['$loanedUnits', '$lostUnits', '$damagedUnits', '$maintenanceUnits'] }
            ]
          }
        }
      }
    ];

    const stats = await this.resourceModel.aggregate(pipeline);
    const result = stats[0] || {
      totalResources: 0,
      totalUnits: 0,
      loanedUnits: 0,
      lostUnits: 0,
      damagedUnits: 0,
      maintenanceUnits: 0,
      availableUnits: 0
    };

    // Contar recursos con y sin stock
    const resourcesWithStock = await this.resourceModel.countDocuments({
      $expr: {
        $gt: [
          {
            $subtract: [
              '$totalQuantity',
              { $add: ['$currentLoansCount', '$lostQuantity', '$damagedQuantity', '$maintenanceQuantity'] }
            ]
          },
          0
        ]
      }
    });

    return {
      ...result,
      resourcesWithStock,
      resourcesWithoutStock: result.totalResources - resourcesWithStock
    };
  }
} 