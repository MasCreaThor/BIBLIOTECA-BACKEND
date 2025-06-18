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
  ParseIntPipe,
  DefaultValuePipe,
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
import { ValidationUtils, MongoUtils, getErrorMessage, getErrorStack } from '@shared/utils';
import { LoanValidationService } from '@modules/loan/services/loan-validation.service';

/**
 * Controlador para gestión de préstamos
 */
@Controller('loans')
@Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
export class LoanController {
  constructor(
    private readonly loanService: LoanService,
    private readonly logger: LoggerService,
    private readonly loanValidationService: LoanValidationService,
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
    this.logger.log(`Creating loan: Person ${createLoanDto.personId}, Resource ${createLoanDto.resourceId}, User ${userId}`);
    
    try {
      const loan = await this.loanService.create(createLoanDto, userId);
      
      this.logger.log(`Loan created successfully: ${loan._id}`);
      return ApiResponseDto.success(
        loan, 
        'Préstamo registrado exitosamente', 
        HttpStatus.CREATED
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error creating loan: Person ${createLoanDto.personId}, Resource ${createLoanDto.resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        createLoanDto
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener todos los préstamos con filtros y paginación
   * GET /api/loans
   */
  @Get()
  async findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('personId') personId?: string,
    @Query('resourceId') resourceId?: string,
    @Query('statusId') statusId?: string,
    @Query('status') status?: string,
    @Query('isOverdue') isOverdue?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<ApiResponseDto<PaginatedResponseDto<LoanResponseDto>>> {
    this.logger.debug(`Finding all loans with filters`, {
      page, limit, search, personId, resourceId, statusId, status, isOverdue, dateFrom, dateTo
    });

    try {
      const searchDto: LoanSearchDto = {
        page,
        limit,
        search,
        personId,
        resourceId,
        statusId,
        status: status as 'active' | 'returned' | 'overdue' | 'lost' | undefined,
        isOverdue: isOverdue === 'true' ? true : isOverdue === 'false' ? false : undefined,
        dateFrom,
        dateTo,
        sortBy,
        sortOrder,
      };

      this.logger.debug(`Search DTO created:`, searchDto);

      const result = await this.loanService.findAll(searchDto);
      
      this.logger.debug(`Found ${result.data.length} loans out of ${result.pagination.total} total`);
      return ApiResponseDto.success(
        result,
        'Préstamos obtenidos exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error finding loans', {
        error: errorMessage,
        stack: getErrorStack(error),
        filters: { page, limit, search, personId, resourceId, statusId, status }
      });
      throw new Error(errorMessage);
    }
  }

  // ✅ RUTAS ESPECÍFICAS PRIMERO - Estas van ANTES que las rutas con parámetros

  /**
   * Obtener estadísticas de préstamos
   * GET /api/loans/statistics
   */
  @Get('statistics')
  async getStatistics(): Promise<ApiResponseDto<{
    totalLoans: number;
    activeLoans: number;
    overdueLoans: number;
    returnedThisMonth: number;
    mostBorrowedResources: Array<{ resourceId: string; count: number }>;
  }>> {
    this.logger.debug('Getting loan statistics');

    try {
      const stats = await this.loanService.getStatistics();
      
      this.logger.debug('Loan statistics:', stats);
      return ApiResponseDto.success(
        stats,
        'Estadísticas de préstamos obtenidas exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting loan statistics', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener resumen de préstamos por período
   * GET /api/loans/summary
   */
  @Get('summary')
  async getLoanSummary(
    @Query('period') period: 'today' | 'week' | 'month' | 'year' = 'month',
  ): Promise<ApiResponseDto<{
    totalLoans: number;
    newLoans: number;
    returnedLoans: number;
    overdueLoans: number;
    activeLoans: number;
    period: string;
    dateRange: { start: string; end: string };
  }>> {
    this.logger.debug(`Getting loan summary for period: ${period}`);

    try {
      const summary = await this.loanService.getLoanSummary(period);
      
      this.logger.debug('Loan summary:', summary);
      return ApiResponseDto.success(
        summary,
        'Resumen de préstamos obtenido exitosamente',
        HttpStatus.OK
      );
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
   * Obtener préstamos por rango de fechas
   * GET /api/loans/by-date-range
   */
  @Get('by-date-range')
  async getLoansByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ): Promise<ApiResponseDto<PaginatedResponseDto<LoanResponseDto>>> {
    this.logger.debug('Getting loans by date range', {
      startDate, endDate, page, limit, search, status
    });

    try {
      const result = await this.loanService.getLoansByDateRange(
        startDate,
        endDate,
        { page, limit, search, status }
      );
      
      this.logger.debug(`Found ${result.data.length} loans out of ${result.pagination.total} total`);
      return ApiResponseDto.success(
        result,
        'Préstamos por rango de fechas obtenidos exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting loans by date range', {
        error: errorMessage,
        stack: getErrorStack(error),
        filters: { startDate, endDate, page, limit, search, status }
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener estadísticas de stock
   * GET /api/loans/stock-stats
   */
  @Get('stock-stats')
  async getStockStatistics(): Promise<ApiResponseDto<{
    totalResources: number;
    resourcesWithStock: number;
    resourcesWithoutStock: number;
    totalUnits: number;
    loanedUnits: number;
    availableUnits: number;
  }>> {
    this.logger.debug('Getting stock statistics');

    try {
      // ✅ CORRECCIÓN: Usar el servicio de recursos para obtener estadísticas de stock
      const stats = await this.loanService.getStockStatistics();
      
      this.logger.debug('Stock statistics:', stats);
      return ApiResponseDto.success(
        stats,
        'Estadísticas de stock obtenidas exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error('Error getting stock statistics', {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  // ✅ RUTAS CON PARÁMETROS AL FINAL - Estas van DESPUÉS de las rutas específicas

  /**
   * Obtener préstamo por ID
   * GET /api/loans/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponseDto<LoanResponseDto>> {
    this.logger.debug(`Finding loan by ID: ${id}`);

    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid loan ID format: ${id}`);
        throw new Error('ID de préstamo inválido');
      }

      const loan = await this.loanService.findById(id);
      
      this.logger.debug(`Loan found: ${loan._id}`);
      return ApiResponseDto.success(
        loan, 
        'Préstamo obtenido exitosamente', 
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan by ID: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Renovar un préstamo
   * POST /api/loans/:id/renew
   */
  @Post(':id/renew')
  async renewLoan(
    @Param('id') id: string,
    @Body() body: { additionalDays?: number },
    @CurrentUserId() userId: string,
  ): Promise<ApiResponseDto<LoanResponseDto>> {
    this.logger.debug(`Renewing loan: ${id}, User: ${userId}`);

    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid loan ID format: ${id}`);
        throw new Error('ID de préstamo inválido');
      }

      const additionalDays = body.additionalDays ?? 0;
      const loan = await this.loanService.renewLoan(id, additionalDays, userId);
      
      this.logger.debug(`Loan renewed successfully: ${loan._id}`);
      return ApiResponseDto.success(
        loan,
        'Préstamo renovado exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error renewing loan: ${id}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        userId,
        additionalDays: body.additionalDays
      });
      throw new Error(errorMessage);
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
    this.logger.debug(`Finding active loans for person: ${personId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        this.logger.warn(`Invalid person ID format: ${personId}`);
        throw new Error('ID de persona inválido');
      }

      const loans = await this.loanService.findActiveByPerson(personId);
      
      this.logger.debug(`Found ${loans.length} active loans for person ${personId}`);
      return ApiResponseDto.success(
        loans,
        'Préstamos activos obtenidos exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding active loans for person: ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener historial de préstamos de una persona
   * GET /api/loans/person/:personId/history
   */
  @Get('person/:personId/history')
  async findHistoryByPerson(
    @Param('personId') personId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<ApiResponseDto<LoanResponseDto[]>> {
    this.logger.debug(`Finding loan history for person: ${personId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        this.logger.warn(`Invalid person ID format: ${personId}`);
        throw new Error('ID de persona inválido');
      }

      const loans = await this.loanService.findHistoryByPerson(personId, limit);
      
      this.logger.debug(`Found ${loans.length} loans in history for person ${personId}`);
      return ApiResponseDto.success(
        loans,
        'Historial de préstamos obtenido exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan history for person: ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Obtener historial de préstamos de un recurso
   * GET /api/loans/resource/:resourceId/history
   */
  @Get('resource/:resourceId/history')
  async findHistoryByResource(
    @Param('resourceId') resourceId: string,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit: number,
  ): Promise<ApiResponseDto<LoanResponseDto[]>> {
    this.logger.debug(`Finding loan history for resource: ${resourceId}`);

    try {
      if (!MongoUtils.isValidObjectId(resourceId)) {
        this.logger.warn(`Invalid resource ID format: ${resourceId}`);
        throw new Error('ID de recurso inválido');
      }

      const loans = await this.loanService.findHistoryByResource(resourceId, limit);
      
      this.logger.debug(`Found ${loans.length} loans in history for resource ${resourceId}`);
      return ApiResponseDto.success(
        loans,
        'Historial de préstamos del recurso obtenido exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error finding loan history for resource: ${resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Verificar si una persona puede pedir préstamos
   * GET /api/loans/person/:personId/can-borrow
   */
  @Get('person/:personId/can-borrow')
  async canPersonBorrow(
    @Param('personId') personId: string,
  ): Promise<ApiResponseDto<{
    canBorrow: boolean;
    reason?: string;
    activeLoansCount?: number;
    hasOverdueLoans?: boolean;
    maxLoansAllowed?: number;
  }>> {
    this.logger.debug(`Checking if person can borrow: ${personId}`);

    try {
      if (!MongoUtils.isValidObjectId(personId)) {
        this.logger.warn(`Invalid person ID format: ${personId}`);
        throw new Error('ID de persona inválido');
      }

      const canBorrowResult = await this.loanService.canPersonBorrow(personId);
      this.logger.debug(`Person ${personId} can borrow: ${canBorrowResult.canBorrow}`);
      return ApiResponseDto.success(
        canBorrowResult,
        'Verificación de préstamo realizada exitosamente',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error checking if person can borrow: ${personId}`, {
        error: errorMessage,
        stack: getErrorStack(error)
      });
      throw new Error(errorMessage);
    }
  }

  /**
   * Validar datos de préstamo antes de crear
   * POST /api/loans/validate
   */
  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validateLoan(
    @Body() createLoanDto: CreateLoanDto,
  ): Promise<ApiResponseDto<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    personInfo?: {
      canBorrow: boolean;
      activeLoansCount: number;
      hasOverdueLoans: boolean;
      maxLoansAllowed: number;
    };
    resourceInfo?: {
      totalQuantity: number;
      currentLoans: number;
      availableQuantity: number;
      canLoan: boolean;
    };
  }>> {
    this.logger.log(`Validating loan: Person ${createLoanDto.personId}, Resource ${createLoanDto.resourceId}, Quantity ${createLoanDto.quantity || 1}`);
    
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      let personInfo: any = null;
      let resourceInfo: any = null;

      // Validar persona
      try {
        personInfo = await this.loanService.canPersonBorrow(createLoanDto.personId);
        if (!personInfo.canBorrow) {
          errors.push(personInfo.reason || 'La persona no puede realizar préstamos');
        }
      } catch (error: any) {
        errors.push(`Error al validar persona: ${error.message}`);
      }

      // Validar recurso
      try {
        resourceInfo = await this.loanValidationService.getResourceAvailabilityInfo(createLoanDto.resourceId);
        if (!resourceInfo.canLoan) {
          errors.push('Recurso no disponible: stock insuficiente');
        }
      } catch (error: any) {
        errors.push(`Error al validar recurso: ${error.message}`);
      }

      // Validar cantidad
      const quantity = createLoanDto.quantity || 1;
      if (quantity < 1) {
        errors.push('La cantidad debe ser al menos 1');
      } else if (quantity > 5) {
        errors.push('La cantidad no puede exceder 5 unidades');
      }

      // Validar disponibilidad de stock si tenemos información del recurso
      if (resourceInfo && quantity > resourceInfo.availableQuantity) {
        errors.push(`Cantidad solicitada (${quantity}) excede la disponibilidad (${resourceInfo.availableQuantity})`);
      }

      // Validar límites de préstamos si tenemos información de la persona
      if (personInfo && personInfo.activeLoansCount >= personInfo.maxLoansAllowed) {
        errors.push(`La persona ya tiene ${personInfo.activeLoansCount} préstamos activos (máximo: ${personInfo.maxLoansAllowed})`);
      }

      // Advertencias
      if (personInfo && personInfo.hasOverdueLoans) {
        warnings.push('La persona tiene préstamos vencidos');
      }

      if (resourceInfo && resourceInfo.availableQuantity <= 2) {
        warnings.push(`Stock bajo: solo quedan ${resourceInfo.availableQuantity} unidades disponibles`);
      }

      const isValid = errors.length === 0;

      this.logger.log(`Loan validation completed: ${isValid ? 'VALID' : 'INVALID'} - ${errors.length} errors, ${warnings.length} warnings`);
      
      return ApiResponseDto.success(
        {
          isValid,
          errors,
          warnings,
          personInfo,
          resourceInfo,
        },
        isValid ? 'Préstamo válido' : 'Préstamo inválido',
        HttpStatus.OK
      );
    } catch (error: unknown) {
      const errorMessage = getErrorMessage(error);
      this.logger.error(`Error validating loan: Person ${createLoanDto.personId}, Resource ${createLoanDto.resourceId}`, {
        error: errorMessage,
        stack: getErrorStack(error),
        createLoanDto
      });
      throw new Error(errorMessage);
    }
  }
}