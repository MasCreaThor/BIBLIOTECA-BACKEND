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
  import { MongoUtils } from '@shared/utils';
  
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
     * Crear un nuevo préstamo
     */
    async create(createDto: CreateLoanDto, userId: string): Promise<LoanResponseDto> {
      try {
        const activeStatus = await this.loanStatusRepository.getActiveStatus();
        if (!activeStatus) {
          throw new BadRequestException('Estado de préstamo "activo" no encontrado');
        }
  
        const loanData = {
          personId: new Types.ObjectId(createDto.personId),
          resourceId: new Types.ObjectId(createDto.resourceId),
          quantity: createDto.quantity || 1,
          loanDate: new Date(),
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 días por defecto
          statusId: activeStatus._id as ObjectId,
          observations: createDto.observations,
          loanedBy: new Types.ObjectId(userId),
        };
  
        const createdLoan = await this.loanRepository.create(loanData);
        return this.mapToResponseDto(createdLoan);
      } catch (error) {
        this.logger.error('Error creating loan', error);
        throw new BadRequestException('Error al crear el préstamo');
      }
    }
  
    /**
     * Obtener préstamo por ID
     */
    async findById(id: string): Promise<LoanResponseDto> {
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
  
      const filters: any = {};
  
      if (personId) {
        filters.personId = personId;
      }
  
      if (resourceId) {
        filters.resourceId = resourceId;
      }
  
      if (statusId) {
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
      return this.loanRepository.getStatistics();
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
          fullName: person.fullName || `${person.firstName} ${person.lastName}`,
          documentNumber: person.documentNumber,
          grade: person.grade,
        };
      }
  
      if (loan.populated('resourceId') && loan.resourceId) {
        const resource = loan.resourceId as any;
        responseDto.resource = {
          _id: resource._id?.toString(),
          title: resource.title,
          isbn: resource.isbn,
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
  
      return responseDto;
    }
  }