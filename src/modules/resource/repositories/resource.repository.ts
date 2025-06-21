// src/modules/resource/repositories/resource.repository.ts - ACTUALIZADO CON GESTIÓN DE STOCK
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resource, ResourceDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';
import { LoggerService } from '@shared/services/logger.service';
import { MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';

@Injectable()
export class ResourceRepository extends BaseRepositoryImpl<ResourceDocument> {
  constructor(
    @InjectModel(Resource.name) private resourceModel: Model<ResourceDocument>,
    private readonly logger: LoggerService,
  ) {
    super(resourceModel);
    this.logger.setContext('ResourceRepository');
  }

  // ✅ MÉTODOS EXISTENTES MANTENIDOS

  /**
   * Buscar por ID con populate completo
   */
  async findByIdWithPopulate(id: string): Promise<ResourceDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      return await this.resourceModel
        .findById(id)
        .populate([
          { path: 'typeId', select: 'name description' },
          { path: 'categoryId', select: 'name description color' },
          { path: 'authorIds', select: 'name' },
          { path: 'publisherId', select: 'name' },
          { path: 'stateId', select: 'name description color' },
          { path: 'locationId', select: 'name description' }
        ])
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding resource by ID with populate: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * Buscar recursos con filtros
   */
  async findWithFilters(filters: any): Promise<ResourceDocument[]> {
    try {
      const query: any = {};

      // ✅ CORREGIDO: Manejo de búsqueda por texto
      if (filters.search && filters.search.trim()) {
        const searchTerm = filters.search.trim();
        
        // Usar búsqueda de texto completo si está disponible
        try {
          query.$text = { $search: searchTerm };
        } catch (error) {
          // Si falla la búsqueda de texto, usar búsqueda por regex
          query.$or = [
            { title: { $regex: searchTerm, $options: 'i' } },
            { isbn: { $regex: searchTerm, $options: 'i' } },
            { notes: { $regex: searchTerm, $options: 'i' } }
          ];
        }
      }

      if (filters.typeId) {
        query.typeId = new Types.ObjectId(filters.typeId);
      }

      if (filters.categoryId) {
        query.categoryId = new Types.ObjectId(filters.categoryId);
      }

      if (filters.available !== undefined) {
        query.available = filters.available;
      }

      if (filters.stateId) {
        query.stateId = new Types.ObjectId(filters.stateId);
      }

      if (filters.locationId) {
        query.locationId = new Types.ObjectId(filters.locationId);
      }

      if (filters.authorId) {
        query.authorIds = new Types.ObjectId(filters.authorId);
      }

      if (filters.publisherId) {
        query.publisherId = new Types.ObjectId(filters.publisherId);
      }

      // ✅ CORREGIDO: Filtro por stock disponible (sin usar $expr junto con $text)
      if (filters.hasStock !== undefined) {
        if (filters.hasStock) {
          // Para recursos con stock, usar una consulta separada
          query.$and = query.$and || [];
          query.$and.push({
            $expr: {
              $gt: [
                { $subtract: ['$totalQuantity', '$currentLoansCount'] },
                0
              ]
            }
          });
        } else {
          // Para recursos sin stock
          query.$and = query.$and || [];
          query.$and.push({
            $expr: {
              $lte: [
                { $subtract: ['$totalQuantity', '$currentLoansCount'] },
                0
              ]
            }
          });
        }
      }

      // ✅ MEJORADO: Si hay búsqueda de texto y filtros de stock, usar consulta separada
      let resources: ResourceDocument[];
      
      if (filters.search && filters.hasStock !== undefined) {
        // Consulta separada para evitar conflictos entre $text y $expr
        const textQuery = { $text: { $search: filters.search.trim() } };
        const stockQuery = { ...query };
        delete stockQuery.$text;
        
        const textResults = await this.resourceModel.find(textQuery).exec();
        const stockResults = await this.resourceModel.find(stockQuery).exec();
        
        // Combinar resultados
        const textIds = new Set(textResults.map((r: any) => r._id?.toString()).filter(Boolean));
        const stockIds = new Set(stockResults.map((r: any) => r._id?.toString()).filter(Boolean));
        
        const combinedIds = Array.from(new Set([...textIds, ...stockIds]));
        resources = await this.resourceModel
          .find({ _id: { $in: combinedIds } })
          .populate([
            { path: 'typeId', select: 'name description' },
            { path: 'categoryId', select: 'name description color' },
            { path: 'authorIds', select: 'name' },
            { path: 'publisherId', select: 'name' },
            { path: 'stateId', select: 'name description color' },
            { path: 'locationId', select: 'name description' }
          ])
          .sort({ title: 1 })
          .exec();
      } else {
        // Consulta normal
        resources = await this.resourceModel
          .find(query)
          .populate([
            { path: 'typeId', select: 'name description' },
            { path: 'categoryId', select: 'name description color' },
            { path: 'authorIds', select: 'name' },
            { path: 'publisherId', select: 'name' },
            { path: 'stateId', select: 'name description color' },
            { path: 'locationId', select: 'name description' }
          ])
          .sort({ title: 1 })
          .exec();
      }

      // ✅ MEJORADO: Filtro adicional por autores si hay búsqueda
      if (filters.search && resources.length > 0) {
        const searchTerm = filters.search.toLowerCase();
        resources = resources.filter(resource => {
          // Buscar en título, ISBN, notas y autores
          const titleMatch = resource.title.toLowerCase().includes(searchTerm);
          const isbnMatch = resource.isbn?.toLowerCase().includes(searchTerm);
          const notesMatch = resource.notes?.toLowerCase().includes(searchTerm);
          
          // Buscar en autores populados
          const authorMatch = resource.authorIds?.some((author: any) => 
            author.name?.toLowerCase().includes(searchTerm)
          );

          return titleMatch || isbnMatch || notesMatch || authorMatch;
        });
      }

      return resources;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding resources with filters', {
        error: errorMessage,
        stack: getErrorStack(error),
        filters
      });
      return [];
    }
  }

  /**
   * Actualizar disponibilidad
   */
  async updateAvailability(id: string, available: boolean): Promise<ResourceDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        return null;
      }

      return await this.resourceModel
        .findByIdAndUpdate(
          id,
          { available },
          { new: true }
        )
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error updating availability for resource: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        available
      });
      return null;
    }
  }

  // ✅ NUEVOS MÉTODOS PARA GESTIÓN DE STOCK

  /**
   * ✅ NUEVO: Incrementar contador de préstamos actuales
   */
  async incrementCurrentLoans(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { 
              currentLoansCount: quantity,
              totalLoans: quantity
            },
            $set: {
              lastLoanDate: new Date()
            }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Incremented loans for resource ${resourceId}: +${quantity} (total: ${result.currentLoansCount})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error incrementing current loans for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Decrementar contador de préstamos actuales
   */
  async decrementCurrentLoans(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { 
              currentLoansCount: -quantity
            }
          },
          { new: true }
        )
        .exec();

      if (result) {
        // Asegurar que no sea negativo
        if (result.currentLoansCount < 0) {
          await this.resourceModel
            .findByIdAndUpdate(
              resourceId,
              { currentLoansCount: 0 },
              { new: true }
            )
            .exec();
          
          this.logger.warn(`Reset negative currentLoansCount for resource ${resourceId}`);
        }

        this.logger.debug(`Decremented loans for resource ${resourceId}: -${quantity} (total: ${Math.max(0, result.currentLoansCount)})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error decrementing current loans for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Obtener información de stock de un recurso
   */
  async getStockInfo(resourceId: string): Promise<{
    totalQuantity: number;
    currentLoansCount: number;
    availableQuantity: number;
    hasStock: boolean;
  } | null> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return null;
      }

      const resource = await this.resourceModel
        .findById(resourceId, 'totalQuantity currentLoansCount available')
        .exec();

      if (!resource) {
        return null;
      }

      const availableQuantity = Math.max(0, resource.totalQuantity - resource.currentLoansCount);

      return {
        totalQuantity: resource.totalQuantity,
        currentLoansCount: resource.currentLoansCount,
        availableQuantity,
        hasStock: resource.available && availableQuantity > 0
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error getting stock info for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * ✅ NUEVO: Sincronizar contador de préstamos con datos reales
   */
  async syncCurrentLoansCount(resourceId: string, realCurrentLoans: number): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { currentLoansCount: Math.max(0, realCurrentLoans) },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Synced currentLoansCount for resource ${resourceId}: ${realCurrentLoans}`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error syncing current loans count for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        realCurrentLoans
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Buscar recursos con stock disponible
   */
  async findResourcesWithStock(limit?: number): Promise<ResourceDocument[]> {
    try {
      let query = this.resourceModel
        .find({
          available: true,
          $expr: {
            $gt: [
              { $subtract: ['$totalQuantity', '$currentLoansCount'] },
              0
            ]
          }
        })
        .populate([
          { path: 'typeId', select: 'name description' },
          { path: 'categoryId', select: 'name description color' },
          { path: 'authorIds', select: 'name' },
          { path: 'stateId', select: 'name description color' }
        ])
        .sort({ title: 1 });

      if (limit && limit > 0) {
        query = query.limit(limit);
      }

      return await query.exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding resources with stock', {
        error: errorMessage,
        stack: getErrorStack(error),
        limit
      });
      return [];
    }
  }

  /**
   * ✅ NUEVO: Buscar recursos sin stock
   */
  async findResourcesWithoutStock(): Promise<ResourceDocument[]> {
    try {
      return await this.resourceModel
        .find({
          $or: [
            { available: false },
            {
              $expr: {
                $lte: [
                  { $subtract: ['$totalQuantity', '$currentLoansCount'] },
                  0
                ]
              }
            }
          ]
        })
        .populate([
          { path: 'typeId', select: 'name description' },
          { path: 'categoryId', select: 'name description color' },
          { path: 'authorIds', select: 'name' },
          { path: 'stateId', select: 'name description color' }
        ])
        .sort({ title: 1 })
        .exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding resources without stock', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return [];
    }
  }

  /**
   * ✅ NUEVO: Actualizar cantidad total de un recurso
   */
  async updateTotalQuantity(resourceId: string, newTotalQuantity: number): Promise<ResourceDocument | null> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return null;
      }

      if (newTotalQuantity < 1) {
        throw new Error('La cantidad total debe ser mayor a 0');
      }

      const resource = await this.resourceModel.findById(resourceId).exec();
      if (!resource) {
        throw new Error('Recurso no encontrado');
      }

      // Verificar que la nueva cantidad no sea menor a los préstamos actuales
      if (newTotalQuantity < resource.currentLoansCount) {
        throw new Error(
          `La nueva cantidad (${newTotalQuantity}) no puede ser menor a los préstamos actuales (${resource.currentLoansCount})`
        );
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { totalQuantity: newTotalQuantity },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Updated total quantity for resource ${resourceId}: ${newTotalQuantity}`);
      }

      return result;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error updating total quantity for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        newTotalQuantity
      });
      return null;
    }
  }

  /**
   * ✅ NUEVO: Obtener estadísticas de stock general
   */
  async getStockStatistics(): Promise<{
    totalResources: number;
    resourcesWithStock: number;
    resourcesWithoutStock: number;
    totalUnits: number;
    loanedUnits: number;
    availableUnits: number;
  }> {
    try {
      const result = await this.resourceModel
        .aggregate([
          {
            $group: {
              _id: null,
              totalResources: { $sum: 1 },
              resourcesWithStock: {
                $sum: {
                  $cond: [
                    {
                      $and: [
                        { $eq: ['$available', true] },
                        { $gt: [{ $subtract: ['$totalQuantity', '$currentLoansCount'] }, 0] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              resourcesWithoutStock: {
                $sum: {
                  $cond: [
                    {
                      $or: [
                        { $eq: ['$available', false] },
                        { $lte: [{ $subtract: ['$totalQuantity', '$currentLoansCount'] }, 0] }
                      ]
                    },
                    1,
                    0
                  ]
                }
              },
              totalUnits: { $sum: '$totalQuantity' },
              loanedUnits: { $sum: '$currentLoansCount' },
              availableUnits: {
                $sum: { $subtract: ['$totalQuantity', '$currentLoansCount'] }
              }
            }
          }
        ])
        .exec();

      if (result.length > 0) {
        return result[0];
      }

      return {
        totalResources: 0,
        resourcesWithStock: 0,
        resourcesWithoutStock: 0,
        totalUnits: 0,
        loanedUnits: 0,
        availableUnits: 0
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting stock statistics', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return {
        totalResources: 0,
        resourcesWithStock: 0,
        resourcesWithoutStock: 0,
        totalUnits: 0,
        loanedUnits: 0,
        availableUnits: 0
      };
    }
  }

  /**
   * Buscar recurso por ISBN
   */
  async findByISBN(isbn: string): Promise<ResourceDocument | null> {
    try {
      if (!isbn) return null;
      return await this.resourceModel.findOne({ isbn }).exec();
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding resource by ISBN: ${isbn}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return null;
    }
  }

  /**
   * Contar recursos por autor
   */
  async countByAuthor(authorId: string): Promise<number> {
    return this.resourceModel.countDocuments({ authorIds: authorId }).exec();
  }

  /**
   * Contar recursos por categoría
   */
  async countByCategory(categoryId: string): Promise<number> {
    return this.resourceModel.countDocuments({ categoryId }).exec();
  }

  /**
   * Contar recursos por ubicación
   */
  async countByLocation(locationId: string): Promise<number> {
    return this.resourceModel.countDocuments({ locationId }).exec();
  }

  // ✅ NUEVOS MÉTODOS PARA GESTIÓN GRANULAR DE STOCK

  /**
   * ✅ NUEVO: Marcar unidades como perdidas
   */
  async markUnitsAsLost(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      // Verificar que hay suficientes unidades disponibles
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        return false;
      }

      const availableQuantity = resource.totalQuantity - resource.currentLoansCount - resource.lostQuantity - resource.damagedQuantity - resource.maintenanceQuantity;
      
      if (availableQuantity < quantity) {
        this.logger.warn(`Cannot mark ${quantity} units as lost for resource ${resourceId}. Available: ${availableQuantity}`);
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { lostQuantity: quantity }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Marked ${quantity} units as lost for resource ${resourceId} (total lost: ${result.lostQuantity})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error marking units as lost for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Marcar unidades como dañadas
   */
  async markUnitsAsDamaged(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      // Verificar que hay suficientes unidades disponibles
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        return false;
      }

      const availableQuantity = resource.totalQuantity - resource.currentLoansCount - resource.lostQuantity - resource.damagedQuantity - resource.maintenanceQuantity;
      
      if (availableQuantity < quantity) {
        this.logger.warn(`Cannot mark ${quantity} units as damaged for resource ${resourceId}. Available: ${availableQuantity}`);
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { damagedQuantity: quantity }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Marked ${quantity} units as damaged for resource ${resourceId} (total damaged: ${result.damagedQuantity})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error marking units as damaged for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Marcar unidades en mantenimiento
   */
  async markUnitsInMaintenance(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      // Verificar que hay suficientes unidades disponibles
      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        return false;
      }

      const availableQuantity = resource.totalQuantity - resource.currentLoansCount - resource.lostQuantity - resource.damagedQuantity - resource.maintenanceQuantity;
      
      if (availableQuantity < quantity) {
        this.logger.warn(`Cannot mark ${quantity} units in maintenance for resource ${resourceId}. Available: ${availableQuantity}`);
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { maintenanceQuantity: quantity }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Marked ${quantity} units in maintenance for resource ${resourceId} (total maintenance: ${result.maintenanceQuantity})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error marking units in maintenance for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Restaurar unidades perdidas (cuando se encuentran)
   */
  async restoreLostUnits(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const resource = await this.resourceModel.findById(resourceId);
      if (!resource || resource.lostQuantity < quantity) {
        this.logger.warn(`Cannot restore ${quantity} lost units for resource ${resourceId}. Current lost: ${resource?.lostQuantity || 0}`);
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { lostQuantity: -quantity }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Restored ${quantity} lost units for resource ${resourceId} (remaining lost: ${result.lostQuantity})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error restoring lost units for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Restaurar unidades dañadas (cuando se reparan)
   */
  async restoreDamagedUnits(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const resource = await this.resourceModel.findById(resourceId);
      if (!resource || resource.damagedQuantity < quantity) {
        this.logger.warn(`Cannot restore ${quantity} damaged units for resource ${resourceId}. Current damaged: ${resource?.damagedQuantity || 0}`);
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { damagedQuantity: -quantity }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Restored ${quantity} damaged units for resource ${resourceId} (remaining damaged: ${result.damagedQuantity})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error restoring damaged units for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Restaurar unidades en mantenimiento
   */
  async restoreMaintenanceUnits(resourceId: string, quantity: number = 1): Promise<boolean> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return false;
      }

      const resource = await this.resourceModel.findById(resourceId);
      if (!resource || resource.maintenanceQuantity < quantity) {
        this.logger.warn(`Cannot restore ${quantity} maintenance units for resource ${resourceId}. Current maintenance: ${resource?.maintenanceQuantity || 0}`);
        return false;
      }

      const result = await this.resourceModel
        .findByIdAndUpdate(
          resourceId,
          { 
            $inc: { maintenanceQuantity: -quantity }
          },
          { new: true }
        )
        .exec();

      if (result) {
        this.logger.debug(`Restored ${quantity} maintenance units for resource ${resourceId} (remaining maintenance: ${result.maintenanceQuantity})`);
        return true;
      }

      return false;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error restoring maintenance units for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        quantity
      });
      return false;
    }
  }

  /**
   * ✅ NUEVO: Obtener información completa de stock
   */
  async getCompleteStockInfo(resourceId: string): Promise<{
    totalQuantity: number;
    currentLoansCount: number;
    lostQuantity: number;
    damagedQuantity: number;
    maintenanceQuantity: number;
    availableQuantity: number;
    unavailableQuantity: number;
    hasStock: boolean;
  } | null> {
    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        return null;
      }

      const resource = await this.resourceModel.findById(resourceId);
      if (!resource) {
        return null;
      }

      const availableQuantity = Math.max(0, resource.totalQuantity - resource.currentLoansCount - resource.lostQuantity - resource.damagedQuantity - resource.maintenanceQuantity);
      const unavailableQuantity = resource.lostQuantity + resource.damagedQuantity + resource.maintenanceQuantity;

      return {
        totalQuantity: resource.totalQuantity,
        currentLoansCount: resource.currentLoansCount,
        lostQuantity: resource.lostQuantity,
        damagedQuantity: resource.damagedQuantity,
        maintenanceQuantity: resource.maintenanceQuantity,
        availableQuantity,
        unavailableQuantity,
        hasStock: resource.available && availableQuantity > 0
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error getting complete stock info for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      return null;
    }
  }
}