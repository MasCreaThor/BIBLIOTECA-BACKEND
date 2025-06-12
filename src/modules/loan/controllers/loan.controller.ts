// src/modules/loan/controllers/loan.controller.ts
import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { LoanService } from '@modules/loan/services';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreateLoanDto,
    LoanResponseDto,
    LoanSearchDto,
  } from '@modules/loan/dto';
  import { ApiResponseDto, PaginatedResponseDto } from '@shared/dto/base.dto';
  import { Roles, CurrentUserId } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  /**
   * Controlador para gestión de préstamos
   */
  @Controller('loans')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class LoanController {
    constructor(
      private readonly loanService: LoanService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('LoanController');
    }
  
    /**
     * Crear un nuevo préstamo
     * POST /api/loans
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createLoanDto: CreateLoanDto,
      @CurrentUserId() userId: string,
    ): Promise<ApiResponseDto<LoanResponseDto>> {
      try {
        this.logger.log(`Creating loan: Person ${createLoanDto.personId}, Resource ${createLoanDto.resourceId}`);
        
        const loan = await this.loanService.create(createLoanDto, userId);
        
        return ApiResponseDto.success(loan, 'Préstamo registrado exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating loan: Person ${createLoanDto.personId}, Resource ${createLoanDto.resourceId}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener todos los préstamos con filtros y paginación
     * GET /api/loans
     */
    @Get()
    async findAll(
      @Query('page') page: string = '1',
      @Query('limit') limit: string = '20',
      @Query('search') search?: string,
      @Query('personId') personId?: string,
      @Query('resourceId') resourceId?: string,
      @Query('statusId') statusId?: string,
      @Query('isOverdue') isOverdue?: string,
      @Query('dateFrom') dateFrom?: string,
      @Query('dateTo') dateTo?: string,
      @Query('sortBy') sortBy?: string,
      @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    ): Promise<ApiResponseDto<PaginatedResponseDto<LoanResponseDto>>> {
      try {
        const searchDto: LoanSearchDto = {
          page: parseInt(page, 10) || 1,
          limit: Math.min(parseInt(limit, 10) || 20, 100),
          sortBy: sortBy || 'loanDate',
          sortOrder: sortOrder || 'desc',
        };
  
        if (search && ValidationUtils.isNotEmpty(search)) {
          searchDto.search = search.trim();
        }
  
        if (personId && MongoUtils.isValidObjectId(personId)) {
          searchDto.personId = personId;
        }
  
        if (resourceId && MongoUtils.isValidObjectId(resourceId)) {
          searchDto.resourceId = resourceId;
        }
  
        if (statusId && MongoUtils.isValidObjectId(statusId)) {
          searchDto.statusId = statusId;
        }
  
        if (isOverdue !== undefined) {
          searchDto.isOverdue = isOverdue === 'true';
        }
  
        if (dateFrom && ValidationUtils.isNotEmpty(dateFrom)) {
          searchDto.dateFrom = dateFrom;
        }
  
        if (dateTo && ValidationUtils.isNotEmpty(dateTo)) {
          searchDto.dateTo = dateTo;
        }
  
        this.logger.debug('Finding loans with filters:', searchDto);
  
        const result = await this.loanService.findAll(searchDto);
  
        return ApiResponseDto.success(result, 'Préstamos obtenidos exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error finding loans', error);
        throw error;
      }
    }
  
    /**
     * Obtener préstamo por ID
     * GET /api/loans/:id
     */
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<LoanResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid loan ID format: ${id}`);
          throw new Error('ID de préstamo inválido');
        }
  
        this.logger.debug(`Finding loan by ID: ${id}`);
        const loan = await this.loanService.findById(id);
  
        return ApiResponseDto.success(loan, 'Préstamo obtenido exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding loan by ID: ${id}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener préstamos activos de una persona
     * GET /api/loans/person/:personId/active
     */
    @Get('person/:personId/active')
    async findActiveByPerson(
      @Param('personId') personId: string,
    ): Promise<ApiResponseDto<LoanResponseDto[]>> {
      try {
        if (!MongoUtils.isValidObjectId(personId)) {
          this.logger.warn(`Invalid person ID format: ${personId}`);
          throw new Error('ID de persona inválido');
        }
  
        this.logger.debug(`Finding active loans for person: ${personId}`);
        const loans = await this.loanService.findActiveByPerson(personId);
  
        return ApiResponseDto.success(
          loans,
          'Préstamos activos de la persona obtenidos exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error finding active loans for person: ${personId}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener historial de préstamos de una persona
     * GET /api/loans/person/:personId/history
     */
    @Get('person/:personId/history')
    async findHistoryByPerson(
      @Param('personId') personId: string,
      @Query('limit') limit: string = '50',
    ): Promise<ApiResponseDto<LoanResponseDto[]>> {
      try {
        if (!MongoUtils.isValidObjectId(personId)) {
          this.logger.warn(`Invalid person ID format: ${personId}`);
          throw new Error('ID de persona inválido');
        }
  
        const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
  
        this.logger.debug(`Finding loan history for person: ${personId}`);
        const loans = await this.loanService.findHistoryByPerson(personId, limitNum);
  
        return ApiResponseDto.success(
          loans,
          'Historial de préstamos de la persona obtenido exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error finding loan history for person: ${personId}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener historial de préstamos de un recurso
     * GET /api/loans/resource/:resourceId/history
     */
    @Get('resource/:resourceId/history')
    async findHistoryByResource(
      @Param('resourceId') resourceId: string,
      @Query('limit') limit: string = '50',
    ): Promise<ApiResponseDto<LoanResponseDto[]>> {
      try {
        if (!MongoUtils.isValidObjectId(resourceId)) {
          this.logger.warn(`Invalid resource ID format: ${resourceId}`);
          throw new Error('ID de recurso inválido');
        }
  
        const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
  
        this.logger.debug(`Finding loan history for resource: ${resourceId}`);
        const loans = await this.loanService.findHistoryByResource(resourceId, limitNum);
  
        return ApiResponseDto.success(
          loans,
          'Historial de préstamos del recurso obtenido exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error(`Error finding loan history for resource: ${resourceId}`, error);
        throw error;
      }
    }
  
    /**
     * Obtener estadísticas de préstamos
     * GET /api/loans/stats/summary
     */
    @Get('stats/summary')
    async getStatistics(): Promise<
      ApiResponseDto<{
        totalLoans: number;
        activeLoans: number;
        overdueLoans: number;
        returnedThisMonth: number;
        mostBorrowedResources: Array<{ resourceId: string; count: number }>;
      }>
    > {
      try {
        this.logger.debug('Getting loan statistics');
        const stats = await this.loanService.getStatistics();
  
        return ApiResponseDto.success(stats, 'Estadísticas de préstamos obtenidas exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error('Error getting loan statistics', error);
        throw error;
      }
    }
  }
  