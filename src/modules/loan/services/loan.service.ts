// src/modules/loan/services/loan.service.ts
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
   * Crear un nuevo préstamo - VERSIÓN CORREGIDA
   */
  async create(createDto: CreateLoanDto, userId: string): Promise<LoanResponseDto> {
    this.logger.debug(`Starting loan creation for person ${createDto.personId} and resource ${createDto.resourceId}`);
    
    try {
      // Validar que el usuario existe
      if (!MongoUtils.isValidObjectId(userId)) {
        throw new BadRequestException('ID de usuario inválido');
      }

      // Obtener estado activo
      const activeStatus = await this.loanStatusRepository.getActiveStatus();
      if (!activeStatus) {
        throw new BadRequestException('Estado de préstamo "activo" no encontrado');
      }

      // Crear el préstamo
      const loan = await this.loanRepository.create({
        personId: new Types.ObjectId(createDto.personId),
        resourceId: new Types.ObjectId(createDto.resourceId),
        quantity: createDto.quantity || 1,
        loanDate: new Date(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días por defecto
        statusId: activeStatus._id as Types.ObjectId,
        loanedBy: new Types.ObjectId(userId),
        observations: createDto.observations
      });

      return this.mapToResponseDto(loan);
    } catch (error) {
      this.logger.error('Error creating loan', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        createDto,
        userId
      });
      throw new BadRequestException('Error al crear el préstamo: ' + getErrorMessage(error));
    }
  }

  /**
   * Obtener préstamo por ID
   */
  async findById(id: string): Promise<LoanResponseDto> {
    this.logger.debug(`Finding loan by ID: ${id}`);
    
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de préstamo inválido');
    }

    const loan = await this.loanRepository.findById(id);
    if (!loan) {
      throw new NotFoundException('Préstamo no encontrado');
    }

    return this.mapToResponseDto(loan);
  }

  /**
   * Buscar préstamos con filtros y paginación
   */
  async findAll(searchDto: LoanSearchDto): Promise<PaginatedResponseDto<LoanResponseDto>> {
    const { 
      page = 1, 
      limit = 20, 
      search, 
      personId, 
      resourceId, 
      statusId, 
      isOverdue,
      dateFrom,
      dateTo
    } = searchDto;

    this.logger.debug(`Searching loans with filters`, { 
      page, limit, search, personId, resourceId, statusId, isOverdue 
    });

    const filters: any = {};

    if (personId) {
      if (!MongoUtils.isValidObjectId(personId)) {
        throw new BadRequestException('ID de persona inválido');
      }
      filters.personId = personId;
    }

    if (resourceId) {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        throw new BadRequestException('ID de recurso inválido');
      }
      filters.resourceId = resourceId;
    }

    if (statusId) {
      if (!MongoUtils.isValidObjectId(statusId)) {
        throw new BadRequestException('ID de estado inválido');
      }
      filters.statusId = statusId;
    }

    if (isOverdue !== undefined) {
      filters.isOverdue = isOverdue;
    }

    if (dateFrom) {
      filters.dateFrom = new Date(dateFrom);
    }

    if (dateTo) {
      filters.dateTo = new Date(dateTo);
    }

    if (search) {
      filters.search = search;
    }

    const result = await this.loanRepository.findWithFilters(filters, page, limit);
    const mappedData = result.data.map((loan) => this.mapToResponseDto(loan));

    return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
  }

  /**
   * Obtener préstamos activos de una persona
   */
  async findActiveByPerson(personId: string): Promise<LoanResponseDto[]> {
    this.logger.debug(`Finding active loans for person: ${personId}`);
    
    if (!MongoUtils.isValidObjectId(personId)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const loans = await this.loanRepository.findActiveByPerson(personId);
    return loans.map((loan) => this.mapToResponseDto(loan));
  }

  /**
   * Obtener historial de préstamos de una persona
   */
  async findHistoryByPerson(personId: string, limit: number = 50): Promise<LoanResponseDto[]> {
    this.logger.debug(`Finding loan history for person: ${personId}`);
    
    if (!MongoUtils.isValidObjectId(personId)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const loans = await this.loanRepository.findHistoryByPerson(personId, limit);
    return loans.map((loan) => this.mapToResponseDto(loan));
  }

  /**
   * Obtener historial de préstamos de un recurso
   */
  async findHistoryByResource(resourceId: string, limit: number = 50): Promise<LoanResponseDto[]> {
    this.logger.debug(`Finding loan history for resource: ${resourceId}`);
    
    if (!MongoUtils.isValidObjectId(resourceId)) {
      throw new BadRequestException('ID de recurso inválido');
    }

    const loans = await this.loanRepository.findHistoryByResource(resourceId, limit);
    return loans.map((loan) => this.mapToResponseDto(loan));
  }

  /**
   * Obtener estadísticas de préstamos
   */
  async getStatistics(): Promise<{
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    returnedThisMonth: number;
    mostBorrowedResources: Array<{ resourceId: string; count: number }>;
  }> {
    this.logger.debug('Getting loan statistics');
    return this.loanRepository.getStatistics();
  }

  /**
   * Verificar si una persona puede pedir préstamos
   */
  async canPersonBorrow(personId: string): Promise<{
    canBorrow: boolean;
    reason?: string;
    activeLoansCount?: number;
    hasOverdueLoans?: boolean;
    maxLoansAllowed?: number;
  }> {
    this.logger.debug(`Checking if person can borrow: ${personId}`);
    
    if (!MongoUtils.isValidObjectId(personId)) {
      return { 
        canBorrow: false, 
        reason: 'ID de persona inválido' 
      };
    }

    return this.loanValidationService.canPersonBorrow(personId);
  }

  /**
   * Obtener préstamos vencidos
   */
  async getOverdueLoans(limit: number = 50): Promise<LoanResponseDto[]> {
    try {
      const loans = await this.loanRepository.findOverdue();
      return loans
        .slice(0, limit)
        .map((loan: LoanDocument) => this.mapToResponseDto(loan));
    } catch (error) {
      this.logger.error('Error getting overdue loans', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw new BadRequestException('Error al obtener préstamos vencidos: ' + getErrorMessage(error));
    }
  }

  /**
   * Actualizar préstamos vencidos (marcar como overdue)
   */
  async updateOverdueLoans(): Promise<number> {
    this.logger.log('Starting overdue loans update process');
    
    try {
      const overdueStatus = await this.loanStatusRepository.findByName('overdue');
      if (!overdueStatus) {
        this.logger.warn('Overdue status not found, skipping update');
        return 0;
      }

      const today = new Date();
      const updatedCount = await this.loanRepository.updateOverdueLoans(
        overdueStatus._id as Types.ObjectId,
        today
      );
      
      this.logger.log(`Updated ${updatedCount} loans to overdue status`);
      return updatedCount;
    } catch (error) {
      this.logger.error('Error updating overdue loans', {
        error: getErrorMessage(error),
        stack: getErrorStack(error)
      });
      throw new BadRequestException('Error al actualizar préstamos vencidos: ' + getErrorMessage(error));
    }
  }

  /**
   * Obtener resumen de préstamos por período
   */
  async getLoanSummary(period: 'today' | 'week' | 'month' | 'year'): Promise<{
    totalLoans: number;
    newLoans: number;
    returnedLoans: number;
    overdueLoans: number;
    activeLoans: number;
    period: string;
    dateRange: { start: string; end: string };
  }> {
    this.logger.debug(`Getting loan summary for period: ${period}`);

    try {
      // Calcular rango de fechas según el período
      const now = new Date();
      let startDate: Date;
      let endDate = now;

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

      // Obtener estadísticas
      const stats = await this.getStatistics();
      
      // Obtener préstamos nuevos del período
      const newLoans = await this.loanRepository.countByDateRange(startDate, endDate);
      
      const summary = {
        totalLoans: stats.totalLoans,
        newLoans,
        returnedLoans: stats.returnedThisMonth,
        overdueLoans: stats.overdueLoans,
        activeLoans: stats.activeLoans,
        period,
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      };

      this.logger.debug(`Loan summary for ${period}:`, summary);
      return summary;
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error getting loan summary for period: ${period}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Buscar préstamos por rango de fechas
   */
  async findByDateRange(
    startDate: string,
    endDate: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ): Promise<PaginatedResponseDto<LoanResponseDto>> {
    this.logger.debug(`Finding loans by date range: ${startDate} to ${endDate}`);

    try {
      if (!startDate || !endDate) {
        throw new Error('Fechas de inicio y fin son requeridas');
      }

      // Validar formato de fechas
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Formato de fecha inválido');
      }

      if (start > end) {
        throw new Error('La fecha de inicio debe ser anterior a la fecha de fin');
      }

      const searchDto: LoanSearchDto = {
        page: options.page || 1,
        limit: options.limit || 20,
        search: options.search,
        dateFrom: startDate,
        dateTo: endDate,
        sortBy: 'loanDate',
        sortOrder: 'desc',
      };

      if (options.status) {
        const status = await this.loanStatusRepository.findByName(options.status);
        if (status) {
          searchDto.statusId = (status._id as Types.ObjectId).toString();
        }
      }

      return this.findAll(searchDto);
    } catch (error) {
      this.logger.error('Error finding loans by date range', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        filters: { startDate, endDate, ...options }
      });
      throw new Error(getErrorMessage(error));
    }
  }

  /**
   * Renovar un préstamo
   */
  async renewLoan(id: string, additionalDays?: number, userId?: string): Promise<LoanResponseDto> {
    this.logger.debug(`Renewing loan: ${id}, additional days: ${additionalDays || 15}`);

    try {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de préstamo inválido');
      }

      const loan = await this.loanRepository.findById(id);
      if (!loan) {
        throw new NotFoundException('Préstamo no encontrado');
      }

      // Validar que el préstamo esté activo
      const activeStatus = await this.loanStatusRepository.getActiveStatus();
      if (!activeStatus) {
        throw new BadRequestException('Estado de préstamo "activo" no encontrado');
      }

      if (loan.statusId.toString() !== (activeStatus._id as Types.ObjectId).toString()) {
        throw new BadRequestException('Solo se pueden renovar préstamos activos');
      }

      // Calcular nueva fecha de vencimiento
      const days = additionalDays || 15;
      if (days < 1 || days > 30) {
        throw new BadRequestException('Los días adicionales deben estar entre 1 y 30');
      }

      const newDueDate = new Date(loan.dueDate);
      newDueDate.setDate(newDueDate.getDate() + days);

      // Actualizar el préstamo
      const updatedLoan = await this.loanRepository.update(id, {
        dueDate: newDueDate,
        renewedBy: userId ? new Types.ObjectId(userId) : undefined,
        renewedAt: new Date()
      });

      if (!updatedLoan) {
        throw new NotFoundException('No se pudo actualizar el préstamo');
      }

      this.logger.debug(`Loan renewed successfully: ${id}`);
      return this.mapToResponseDto(updatedLoan);
    } catch (error) {
      this.logger.error(`Error renewing loan: ${id}`, {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        additionalDays,
        userId
      });
      throw new BadRequestException('Error al renovar el préstamo: ' + getErrorMessage(error));
    }
  }

  /**
   * Obtener préstamos por rango de fechas
   */
  async getLoansByDateRange(
    startDate: string,
    endDate: string,
    options: {
      page?: number;
      limit?: number;
      search?: string;
      status?: string;
    }
  ): Promise<PaginatedResponseDto<LoanResponseDto>> {
    this.logger.debug('Getting loans by date range', {
      startDate,
      endDate,
      options
    });

    try {
      const result = await this.loanRepository.findByDateRange(
        startDate,
        endDate,
        options
      );

      const mappedData = result.data.map((loan) => this.mapToResponseDto(loan));
      return new PaginatedResponseDto(
        mappedData,
        result.total,
        result.page,
        result.limit
      );
    } catch (error) {
      this.logger.error('Error getting loans by date range', {
        error: getErrorMessage(error),
        stack: getErrorStack(error),
        startDate,
        endDate,
        options
      });
      throw error;
    }
  }

  /**
   * Mapear entidad a DTO de respuesta
   */
  private mapToResponseDto(loan: LoanDocument): LoanResponseDto {
    const responseDto: LoanResponseDto = {
      _id: (loan._id as any).toString(),
      personId: loan.personId.toString(),
      resourceId: loan.resourceId.toString(),
      quantity: loan.quantity,
      loanDate: loan.loanDate,
      dueDate: loan.dueDate,
      returnedDate: loan.returnedDate,
      statusId: loan.statusId.toString(),
      observations: loan.observations,
      loanedBy: loan.loanedBy.toString(),
      returnedBy: loan.returnedBy?.toString(),
      renewedBy: loan.renewedBy?.toString(),
      renewedAt: loan.renewedAt,
      daysOverdue: loan.daysOverdue,
      isOverdue: loan.isOverdue,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
    };

    // Mapear información poblada si está disponible
    if (loan.populated('personId') && loan.personId) {
      const person = loan.personId as any;
      responseDto.person = {
        _id: person._id?.toString(),
        firstName: person.firstName,
        lastName: person.lastName,
        fullName: person.fullName || `${person.firstName} ${person.lastName}`.trim(),
        documentNumber: person.documentNumber,
        grade: person.grade,
        personType: person.personType ? {
          _id: person.personType._id?.toString(),
          name: person.personType.name,
          description: person.personType.description,
        } : undefined,
      };
    }

    if (loan.populated('resourceId') && loan.resourceId) {
      const resource = loan.resourceId as any;
      responseDto.resource = {
        _id: resource._id?.toString(),
        title: resource.title,
        isbn: resource.isbn,
        author: resource.author,
        category: resource.category,
        available: resource.available,
        state: resource.state ? {
          _id: resource.state._id?.toString(),
          name: resource.state.name,
          description: resource.state.description,
          color: resource.state.color,
        } : undefined,
      };
    }

    if (loan.populated('statusId') && loan.statusId) {
      const status = loan.statusId as any;
      responseDto.status = {
        _id: status._id?.toString(),
        name: status.name,
        description: status.description,
        color: status.color,
      };
    }

    if (loan.populated('loanedBy') && loan.loanedBy) {
      const user = loan.loanedBy as any;
      responseDto.loanedByUser = {
        _id: user._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      };
    }

    if (loan.populated('returnedBy') && loan.returnedBy) {
      const user = loan.returnedBy as any;
      responseDto.returnedByUser = {
        _id: user._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      };
    }

    if (loan.populated('renewedBy') && loan.renewedBy) {
      const user = loan.renewedBy as any;
      responseDto.renewedByUser = {
        _id: user._id?.toString(),
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
      };
    }

    return responseDto;
  }
}