// src/modules/loan/services/loan.service.ts - ACTUALIZADO CON GESTIÓN DE STOCK
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LoanRepository, LoanStatusRepository } from '@modules/loan/repositories';
import { ResourceRepository } from '@modules/resource/repositories';
import { LoanValidationService } from './loan-validation.service';
import { LoggerService } from '@shared/services/logger.service';
import {
  CreateLoanDto,
  LoanResponseDto,
  LoanSearchDto,
} from '@modules/loan/dto';
import { PaginatedResponseDto } from '@shared/dto/base.dto';
import { LoanDocument } from '@modules/loan/models';
import { Types } from 'mongoose';
import { ObjectId } from '@shared/types/mongoose.types';
import { MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';

@Injectable()
export class LoanService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly loanStatusRepository: LoanStatusRepository,
    private readonly resourceRepository: ResourceRepository,
    private readonly loanValidationService: LoanValidationService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('LoanService');
  }

  /**
   * ✅ ACTUALIZADO: Crear un nuevo préstamo con gestión de stock
   */
  async create(createDto: CreateLoanDto, userId: string): Promise<LoanResponseDto> {
    this.logger.debug(`Starting loan creation for person ${createDto.personId} and resource ${createDto.resourceId}`);
    
    try {
      // Validar que el usuario existe
      if (!MongoUtils.isValidObjectId(userId)) {
        throw new BadRequestException('ID de usuario inválido');
      }

      // ✅ NUEVA VALIDACIÓN: Validaciones completas incluyendo stock y reglas por tipo
      await this.loanValidationService.validateLoanCreation(
        createDto.personId, 
        createDto.resourceId, 
        createDto.quantity || 1
      );

      // Obtener estado activo
      const activeStatus = await this.loanStatusRepository.findByName('active');
      if (!activeStatus) {
        throw new BadRequestException('Estado de préstamo activo no encontrado');
      }

      // Calcular fecha de vencimiento (15 días por defecto)
      const loanDate = new Date();
      const dueDate = new Date(loanDate);
      dueDate.setDate(dueDate.getDate() + 15);

      // Crear el préstamo
      let statusId: Types.ObjectId;
      if (activeStatus._id instanceof Types.ObjectId) {
        statusId = activeStatus._id;
      } else if (typeof activeStatus._id === 'string' && Types.ObjectId.isValid(activeStatus._id)) {
        statusId = new Types.ObjectId(activeStatus._id);
      } else {
        throw new BadRequestException('El tipo de statusId es inválido');
      }
      const loanData = {
        personId: new Types.ObjectId(createDto.personId),
        resourceId: new Types.ObjectId(createDto.resourceId),
        quantity: createDto.quantity || 1,
        loanDate,
        dueDate,
        statusId,
        observations: createDto.observations?.trim() || undefined,
        loanedBy: new Types.ObjectId(userId),
      };

      const loan = await this.loanRepository.create(loanData);
      if (!loan) {
        throw new BadRequestException('Error al crear el préstamo');
      }

      // ✅ ACTUALIZAR STOCK: Incrementar contador de préstamos actuales
      const stockUpdated = await this.resourceRepository.incrementCurrentLoans(
        createDto.resourceId, 
        createDto.quantity || 1
      );

      if (!stockUpdated) {
        this.logger.warn(`Failed to update stock for resource ${createDto.resourceId} after loan creation`);
        // Continuar, pero registrar warning
      }

      this.logger.log(`Loan created successfully: ${loan._id} (quantity: ${loanData.quantity})`);

      // Buscar el préstamo con populate para devolver
      const populatedLoan = await this.loanRepository.findByIdWithPopulate(
        loan._id instanceof Types.ObjectId ? loan._id.toString() : String(loan._id)
      );
      if (!populatedLoan) {
        throw new NotFoundException('Préstamo creado pero no se pudo recuperar');
      }
      const safeLoan = populatedLoan as LoanDocument;
      return this.transformToResponseDto(safeLoan);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error creating loan: Person ${createDto.personId}, Resource ${createDto.resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        createDto
      });
      throw error;
    }
  }

  /**
   * ✅ MANTENIDO: Buscar préstamo por ID
   */
  async findById(id: string): Promise<LoanResponseDto> {
    this.logger.debug(`Finding loan by ID: ${id}`);

    try {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      const loan = await this.loanRepository.findByIdWithPopulate(id);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      this.logger.debug(`Loan found: ${loan._id}`);
      return this.transformToResponseDto(loan);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan by ID: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * ✅ MANTENIDO: Buscar todos los préstamos con filtros
   */
  async findAll(searchDto: LoanSearchDto): Promise<PaginatedResponseDto<LoanResponseDto>> {
    this.logger.debug('Finding all loans with filters', searchDto);

    try {
      const { page = 1, limit = 20, search, personId, resourceId, statusId, isOverdue } = searchDto;

      // Construir filtros
      const filters: any = {};

      if (personId && MongoUtils.isValidObjectId(personId)) {
        filters.personId = new Types.ObjectId(personId);
      }

      if (resourceId && MongoUtils.isValidObjectId(resourceId)) {
        filters.resourceId = new Types.ObjectId(resourceId);
      }

      if (statusId && MongoUtils.isValidObjectId(statusId)) {
        filters.statusId = new Types.ObjectId(statusId);
      }

      if (isOverdue === true) {
        filters.dueDate = { $lt: new Date() };
        filters.returnedDate = null;
      } else if (isOverdue === false) {
        filters.$or = [
          { returnedDate: { $ne: null } },
          { dueDate: { $gte: new Date() } }
        ];
      }

      // Búsqueda por texto (implementar en repository si es necesario)
      if (search) {
        // Para búsqueda por texto, necesitaríamos agregar populate en la consulta
        this.logger.debug(`Text search requested: ${search}`);
      }

      // ✅ CORRECCIÓN: Obtener todos los préstamos primero
      const allLoans = await this.loanRepository.findWithCompletePopulate(filters);
      
      // ✅ CORRECCIÓN: Aplicar paginación manual de forma más robusta
      const total = allLoans.length;
      const totalPages = Math.ceil(total / limit);
      const currentPage = Math.max(1, Math.min(page, totalPages));
      const startIndex = (currentPage - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLoans = allLoans.slice(startIndex, endIndex);

      const loanDtos = paginatedLoans.map(loan => this.transformToResponseDto(loan));

      return {
        data: loanDtos,
        pagination: {
          total,
          page: currentPage,
          totalPages,
          limit,
          hasNextPage: currentPage < totalPages,
          hasPrevPage: currentPage > 1,
        },
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding loans', {
        error: errorMessage,
        stack: getErrorStack(error),
        searchDto
      });
      
      // ✅ CORRECCIÓN: Retornar respuesta vacía en lugar de lanzar error
      return {
        data: [],
        pagination: {
          total: 0,
          page: 1,
          totalPages: 0,
          limit: 20,
          hasNextPage: false,
          hasPrevPage: false,
        },
      };
    }
  }

  /**
   * ✅ NUEVO: Obtener estadísticas de préstamos
   */
  async getStatistics(): Promise<any> {
    this.logger.debug('Getting loan statistics');

    try {
      const [activeLoans, overdueLoans, totalLoans] = await Promise.all([
        this.loanRepository.findActiveLoans(),
        this.loanRepository.findWithCompletePopulate({ 
          returnedDate: null, 
          dueDate: { $lt: new Date() } 
        }),
        this.loanRepository.count({})
      ]);

      const returnedThisMonth = await this.loanRepository.count({
        returnedDate: { 
          $gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) 
        }
      });

      return {
        totalLoans,
        activeLoans: activeLoans.length,
        overdueLoans: overdueLoans.length,
        returnedThisMonth,
        mostBorrowedResources: [] // Implementar agregación si es necesario
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting loan statistics', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener resumen de préstamos por período
   */
  async getLoanSummary(period: 'today' | 'week' | 'month' | 'year' = 'month'): Promise<any> {
    this.logger.debug(`Getting loan summary for period: ${period}`);

    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const [newLoans, returnedLoans, activeLoans, overdueLoans] = await Promise.all([
        this.loanRepository.count({
          loanDate: { $gte: startDate }
        }),
        this.loanRepository.count({
          returnedDate: { $gte: startDate }
        }),
        this.loanRepository.count({
          returnedDate: null
        }),
        this.loanRepository.count({
          returnedDate: null,
          dueDate: { $lt: now }
        })
      ]);

      const totalLoans = await this.loanRepository.count({});

      return {
        totalLoans,
        newLoans,
        returnedLoans,
        activeLoans,
        overdueLoans,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: now.toISOString()
        }
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error getting loan summary for period: ${period}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener préstamos por rango de fechas
   */
  async getLoansByDateRange(
    startDate: string,
    endDate: string,
    options: { page?: number; limit?: number; search?: string; status?: string }
  ): Promise<PaginatedResponseDto<LoanResponseDto>> {
    this.logger.debug('Getting loans by date range', { startDate, endDate, options });

    try {
      const filters: any = {
        loanDate: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (options.status) {
        const status = await this.loanStatusRepository.findByName(options.status as any);
        if (status) {
          filters.statusId = status._id;
        }
      }

      const loans = await this.loanRepository.findWithCompletePopulate(filters);
      
      // Aplicar paginación
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedLoans = loans.slice(startIndex, endIndex);
      const total = loans.length;
      const totalPages = Math.ceil(total / limit);

      const loanDtos = paginatedLoans.map(loan => this.transformToResponseDto(loan));

      return {
        data: loanDtos,
        pagination: {
          total,
          page,
          totalPages,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
        },
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting loans by date range', {
        error: errorMessage,
        stack: getErrorStack(error),
        startDate,
        endDate,
        options
      });
      throw error;
    }
  }

  /**
   * Renovar un préstamo existente
   */
  async renewLoan(id: string, additionalDays: number, userId: string): Promise<LoanResponseDto> {
    this.logger.debug(`Renewing loan ${id} with ${additionalDays} additional days`);

    try {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      const loan = await this.loanRepository.findByIdWithPopulate(id);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      // Validar que el préstamo está activo
      const activeStatus = await this.loanStatusRepository.findByName('active');
      if (!activeStatus) {
        throw new BadRequestException('Estado de préstamo activo no encontrado');
      }

      // Asegurar que activeStatus._id sea de tipo ObjectId o string
      const activeStatusId = activeStatus._id instanceof Types.ObjectId ? activeStatus._id.toString() : activeStatus._id as string;
      if (!activeStatus || loan.statusId.toString() !== activeStatusId) {
        throw new BadRequestException('Solo se pueden renovar préstamos activos');
      }

      // Calcular nueva fecha de vencimiento
      const newDueDate = new Date(loan.dueDate);
      newDueDate.setDate(newDueDate.getDate() + additionalDays);

      // Actualizar el préstamo
      const updatedLoan = await this.loanRepository.update(id, {
        dueDate: newDueDate,
        renewedBy: new Types.ObjectId(userId),
        renewedAt: new Date()
      });

      if (!updatedLoan) {
        throw new BadRequestException('Error al renovar el préstamo');
      }

      const populatedLoan = await this.loanRepository.findByIdWithPopulate(id);
      return this.transformToResponseDto(populatedLoan!);
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error renewing loan ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        additionalDays
      });
      throw error;
    }
  }

  /**
   * Buscar préstamos activos por persona
   */
  async findActiveByPerson(personId: string): Promise<LoanResponseDto[]> {
    this.logger.debug(`Finding active loans for person ${personId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        throw new BadRequestException('ID de persona inválido');
      }

      const activeStatus = await this.loanStatusRepository.findByName('active');
      if (!activeStatus) {
        throw new BadRequestException('Estado de préstamo activo no encontrado');
      }

      const loans = await this.loanRepository.findWithCompletePopulate({
        personId: new Types.ObjectId(personId),
        statusId: activeStatus._id
      });

      return loans.map(loan => this.transformToResponseDto(loan));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding active loans for person ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * Buscar historial de préstamos por persona
   */
  async findHistoryByPerson(personId: string, limit: number = 20): Promise<LoanResponseDto[]> {
    this.logger.debug(`Finding loan history for person ${personId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        throw new BadRequestException('ID de persona inválido');
      }

      const loans = await this.loanRepository.findWithCompletePopulate({
        personId: new Types.ObjectId(personId)
      });
      const paginatedLoans = loans.slice(0, limit);
      return paginatedLoans.map(loan => this.transformToResponseDto(loan));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan history for person ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * Buscar historial de préstamos por recurso
   */
  async findHistoryByResource(resourceId: string, limit: number = 20): Promise<LoanResponseDto[]> {
    this.logger.debug(`Finding loan history for resource ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        throw new BadRequestException('ID de recurso inválido');
      }

      const loans = await this.loanRepository.findWithCompletePopulate({
        resourceId: new Types.ObjectId(resourceId)
      });
      const paginatedLoans = loans.slice(0, limit);
      return paginatedLoans.map(loan => this.transformToResponseDto(loan));
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan history for resource ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * Verificar si una persona puede realizar préstamos
   */
  async canPersonBorrow(personId: string): Promise<{
    canBorrow: boolean;
    reason?: string;
    activeLoansCount: number;
    hasOverdueLoans: boolean;
    maxLoansAllowed: number;
  }> {
    this.logger.debug(`Checking if person ${personId} can borrow`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        throw new BadRequestException('ID de persona inválido');
      }

      // Obtener préstamos activos de la persona
      const activeStatus = await this.loanStatusRepository.findByName('active');
      if (!activeStatus) {
        throw new BadRequestException('Estado de préstamo activo no encontrado');
      }

      const activeLoans = await this.loanRepository.findWithCompletePopulate({
        personId: new Types.ObjectId(personId),
        statusId: activeStatus._id
      });

      // Verificar si tiene préstamos vencidos
      const hasOverdueLoans = activeLoans.some(loan => 
        loan.dueDate < new Date() && !loan.returnedDate
      );

      // Verificar límite de préstamos activos (por ejemplo, máximo 3)
      const maxActiveLoans = 3;
      const canBorrow = !hasOverdueLoans && activeLoans.length < maxActiveLoans;
      let reason = undefined;
      if (hasOverdueLoans) {
        reason = 'Tiene préstamos vencidos.';
      } else if (activeLoans.length >= maxActiveLoans) {
        reason = 'Ha alcanzado el límite de préstamos activos.';
      }

      return {
        canBorrow,
        reason,
        activeLoansCount: activeLoans.length,
        hasOverdueLoans,
        maxLoansAllowed: maxActiveLoans
      };
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error checking if person ${personId} can borrow`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw error;
    }
  }

  /**
   * ✅ NUEVO: Obtener estadísticas de stock
   */
  async getStockStatistics(): Promise<{
    totalResources: number;
    resourcesWithStock: number;
    resourcesWithoutStock: number;
    totalUnits: number;
    loanedUnits: number;
    availableUnits: number;
  }> {
    this.logger.debug('Getting stock statistics');

    try {
      // ✅ CORRECCIÓN: Usar el repositorio de recursos para obtener estadísticas de stock
      const stats = await this.resourceRepository.getStockStatistics();
      
      this.logger.debug('Stock statistics obtained:', stats);
      return stats;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting stock statistics', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      
      // ✅ CORRECCIÓN: Retornar valores por defecto en caso de error
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
   * ✅ CORREGIDO: Transformar documento de préstamo a DTO de respuesta
   */
  private transformToResponseDto(loan: LoanDocument): LoanResponseDto {
    try {
      const l: any = loan;
      // ✅ CORRECCIÓN: Manejar casos donde los campos poblados podrían ser null
      const person = l.personId && typeof l.personId === 'object' ? {
        _id: l.personId._id?.toString() || '',
        firstName: l.personId.firstName || '',
        lastName: l.personId.lastName || '',
        fullName: l.personId.fullName || '',
        documentNumber: l.personId.documentNumber || undefined,
        grade: l.personId.grade || undefined,
        personType: l.personId.personTypeId ? {
          _id: l.personId.personTypeId._id?.toString() || '',
          name: l.personId.personTypeId.name || '',
          description: l.personId.personTypeId.description || ''
        } : undefined
      } : undefined;

      const resource = l.resourceId && typeof l.resourceId === 'object' ? {
        _id: l.resourceId._id?.toString() || '',
        title: l.resourceId.title || '',
        isbn: l.resourceId.isbn || undefined,
        author: l.resourceId.author || undefined,
        category: l.resourceId.category || undefined,
        available: l.resourceId.available || false,
        totalQuantity: l.resourceId.totalQuantity || 0,
        currentLoansCount: l.resourceId.currentLoansCount || 0,
        availableQuantity: l.resourceId.availableQuantity || 0,
        state: l.resourceId.stateId ? {
          _id: l.resourceId.stateId._id?.toString() || '',
          name: l.resourceId.stateId.name || '',
          description: l.resourceId.stateId.description || '',
          color: l.resourceId.stateId.color || '#000000'
        } : undefined
      } : undefined;

      const status = l.statusId && typeof l.statusId === 'object' ? {
        _id: l.statusId._id?.toString() || '',
        name: l.statusId.name || '',
        description: l.statusId.description || '',
        color: l.statusId.color || '#000000'
      } : undefined;

      const loanedByUser = l.loanedBy && typeof l.loanedBy === 'object' ? {
        _id: l.loanedBy._id?.toString() || '',
        firstName: l.loanedBy.firstName || '',
        lastName: l.loanedBy.lastName || '',
        username: l.loanedBy.username || ''
      } : undefined;

      const returnedByUser = l.returnedBy && typeof l.returnedBy === 'object' ? {
        _id: l.returnedBy._id?.toString() || '',
        firstName: l.returnedBy.firstName || '',
        lastName: l.returnedBy.lastName || '',
        username: l.returnedBy.username || ''
      } : undefined;

      const renewedByUser = l.renewedBy && typeof l.renewedBy === 'object' ? {
        _id: l.renewedBy._id?.toString() || '',
        firstName: l.renewedBy.firstName || '',
        lastName: l.renewedBy.lastName || '',
        username: l.renewedBy.username || ''
      } : undefined;

      return {
        _id: l._id?.toString() || '',
        personId: l.personId?.toString() || '',
        resourceId: l.resourceId?.toString() || '',
        quantity: l.quantity,
        loanDate: l.loanDate,
        dueDate: l.dueDate,
        returnedDate: l.returnedDate,
        statusId: l.statusId?.toString() || '',
        observations: l.observations,
        loanedBy: l.loanedBy?.toString() || '',
        returnedBy: l.returnedBy?.toString(),
        renewedBy: l.renewedBy?.toString(),
        renewedAt: l.renewedAt,
        daysOverdue: l.daysOverdue,
        isOverdue: l.isOverdue,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
        person,
        resource,
        status,
        loanedByUser,
        returnedByUser,
        renewedByUser
      };
    } catch (error) {
      this.logger.error('Error transforming loan to response DTO', {
        error: error instanceof Error ? error.message : String(error),
        loanId: (loan as any)._id?.toString()
      });
      // ✅ CORRECCIÓN: Retornar objeto básico en caso de error
      return {
        _id: (loan as any)._id?.toString() || '',
        personId: (loan as any).personId?.toString() || '',
        resourceId: (loan as any).resourceId?.toString() || '',
        quantity: (loan as any).quantity || 1,
        loanDate: (loan as any).loanDate || new Date(),
        dueDate: (loan as any).dueDate || new Date(),
        returnedDate: (loan as any).returnedDate,
        statusId: (loan as any).statusId?.toString() || '',
        observations: (loan as any).observations,
        loanedBy: (loan as any).loanedBy?.toString() || '',
        returnedBy: (loan as any).returnedBy?.toString(),
        renewedBy: (loan as any).renewedBy?.toString(),
        renewedAt: (loan as any).renewedAt,
        daysOverdue: (loan as any).daysOverdue || 0,
        isOverdue: (loan as any).isOverdue || false,
        createdAt: (loan as any).createdAt || new Date(),
        updatedAt: (loan as any).updatedAt || new Date()
      };
    }
  }
}