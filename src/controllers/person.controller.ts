import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PersonService } from '@services/person.service';
import { LoggerService } from '@common/services/logger.service';
import {
  CreatePersonDto,
  UpdatePersonDto,
  PersonResponseDto,
  PersonSearchDto,
  CreatePersonTypeDto,
  PersonTypeResponseDto,
} from '@common/dto/person.dto';
import { ApiResponseDto, PaginatedResponseDto } from '@common/dto/base.dto';
import { Roles } from '@common/decorators/auth.decorators';
import { UserRole } from '@middlewares/roles.guard';
import { ValidationUtils, MongoUtils } from '@common/utils';

/**
 * Controlador para gestión de personas (estudiantes y docentes)
 */

@Controller('people')
@Roles(UserRole.LIBRARIAN, UserRole.ADMIN) // Bibliotecarios y administradores
export class PersonController {
  constructor(
    private readonly personService: PersonService,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PersonController');
  }

  /**
   * Crear una nueva persona
   * POST /api/people
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createPersonDto: CreatePersonDto,
  ): Promise<ApiResponseDto<PersonResponseDto>> {
    try {
      this.logger.log(`Creating person: ${createPersonDto.firstName} ${createPersonDto.lastName}`);

      const person = await this.personService.create(createPersonDto);

      return ApiResponseDto.success(person, 'Persona creada exitosamente', HttpStatus.CREATED);
    } catch (error) {
      this.logger.error(
        `Error creating person: ${createPersonDto.firstName} ${createPersonDto.lastName}`,
        error,
      );
      throw error;
    }
  }

  /**
   * Obtener todas las personas con filtros y paginación
   * GET /api/people
   */
  @Get()
  async findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('search') search?: string,
    @Query('personType') personType?: 'student' | 'teacher',
    @Query('grade') grade?: string,
    @Query('documentNumber') documentNumber?: string,
    @Query('status') status?: 'active' | 'inactive',
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<ApiResponseDto<PaginatedResponseDto<PersonResponseDto>>> {
    try {
      const searchDto: PersonSearchDto = {
        page: parseInt(page, 10) || 1,
        limit: Math.min(parseInt(limit, 10) || 20, 100), // Máximo 100
        sortBy: sortBy || 'firstName',
        sortOrder: sortOrder || 'asc',
      };

      if (search && ValidationUtils.isNotEmpty(search)) {
        searchDto.search = search.trim();
      }

      if (personType && (personType === 'student' || personType === 'teacher')) {
        searchDto.personType = personType;
      }

      if (grade && ValidationUtils.isNotEmpty(grade)) {
        searchDto.grade = grade.trim();
      }

      if (documentNumber && ValidationUtils.isNotEmpty(documentNumber)) {
        searchDto.documentNumber = documentNumber.trim();
      }

      if (status) {
        searchDto.status = status;
      }

      this.logger.debug('Finding people with filters:', searchDto);

      const result = await this.personService.findAll(searchDto);

      return ApiResponseDto.success(result, 'Personas obtenidas exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error finding people', error);
      throw error;
    }
  }

  /**
   * Obtener persona por ID
   * GET /api/people/:id
   */
  @Get(':id')
  async findById(@Param('id') id: string): Promise<ApiResponseDto<PersonResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid person ID format: ${id}`);
        throw new Error('ID de persona inválido');
      }

      this.logger.debug(`Finding person by ID: ${id}`);

      const person = await this.personService.findById(id);

      return ApiResponseDto.success(person, 'Persona obtenida exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error finding person by ID: ${id}`, error);
      throw error;
    }
  }

  /**
   * Buscar persona por número de documento
   * GET /api/people/document/:documentNumber
   */
  @Get('document/:documentNumber')
  async findByDocumentNumber(
    @Param('documentNumber') documentNumber: string,
  ): Promise<ApiResponseDto<PersonResponseDto>> {
    try {
      if (!ValidationUtils.isNotEmpty(documentNumber)) {
        this.logger.warn(`Invalid document number: ${documentNumber}`);
        throw new Error('Número de documento inválido');
      }

      this.logger.debug(`Finding person by document number: ${documentNumber}`);

      const person = await this.personService.findByDocumentNumber(documentNumber);

      return ApiResponseDto.success(person, 'Persona obtenida exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error finding person by document: ${documentNumber}`, error);
      throw error;
    }
  }

  /**
   * Actualizar persona
   * PUT /api/people/:id
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePersonDto: UpdatePersonDto,
  ): Promise<ApiResponseDto<PersonResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid person ID format: ${id}`);
        throw new Error('ID de persona inválido');
      }

      this.logger.log(`Updating person: ${id}`);

      const person = await this.personService.update(id, updatePersonDto);

      return ApiResponseDto.success(person, 'Persona actualizada exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error updating person: ${id}`, error);
      throw error;
    }
  }

  /**
   * Desactivar persona (soft delete)
   * PUT /api/people/:id/deactivate
   */
  @Put(':id/deactivate')
  async deactivate(@Param('id') id: string): Promise<ApiResponseDto<PersonResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid person ID format: ${id}`);
        throw new Error('ID de persona inválido');
      }

      this.logger.log(`Deactivating person: ${id}`);

      const person = await this.personService.deactivate(id);

      return ApiResponseDto.success(person, 'Persona desactivada exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error deactivating person: ${id}`, error);
      throw error;
    }
  }

  /**
   * Activar persona
   * PUT /api/people/:id/activate
   */
  @Put(':id/activate')
  async activate(@Param('id') id: string): Promise<ApiResponseDto<PersonResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid person ID format: ${id}`);
        throw new Error('ID de persona inválido');
      }

      this.logger.log(`Activating person: ${id}`);

      const person = await this.personService.activate(id);

      return ApiResponseDto.success(person, 'Persona activada exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error activating person: ${id}`, error);
      throw error;
    }
  }

  /**
   * Eliminar persona permanentemente
   * DELETE /api/people/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async delete(@Param('id') id: string): Promise<ApiResponseDto<null>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid person ID format: ${id}`);
        throw new Error('ID de persona inválido');
      }

      this.logger.log(`Deleting person permanently: ${id}`);

      await this.personService.delete(id);

      return ApiResponseDto.success(null, 'Persona eliminada exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error(`Error deleting person: ${id}`, error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de personas
   * GET /api/people/stats/summary
   */
  @Get('stats/summary')
  async getStatistics(): Promise<
    ApiResponseDto<{
      total: number;
      students: number;
      teachers: number;
      byGrade: Array<{ grade: string; count: number }>;
    }>
  > {
    try {
      this.logger.debug('Getting people statistics');

      const stats = await this.personService.getStatistics();

      return ApiResponseDto.success(stats, 'Estadísticas obtenidas exitosamente', HttpStatus.OK);
    } catch (error) {
      this.logger.error('Error getting people statistics', error);
      throw error;
    }
  }

  // === ENDPOINTS PARA TIPOS DE PERSONA ===

  /**
   * Crear tipo de persona
   * POST /api/people/types
   */
  @Post('types')
  @Roles(UserRole.ADMIN) // Solo admins pueden crear tipos
  @HttpCode(HttpStatus.CREATED)
  async createPersonType(
    @Body() createPersonTypeDto: CreatePersonTypeDto,
  ): Promise<ApiResponseDto<PersonTypeResponseDto>> {
    try {
      this.logger.log(`Creating person type: ${createPersonTypeDto.name}`);

      const personType = await this.personService.createPersonType(createPersonTypeDto);

      return ApiResponseDto.success(
        personType,
        'Tipo de persona creado exitosamente',
        HttpStatus.CREATED,
      );
    } catch (error) {
      this.logger.error(`Error creating person type: ${createPersonTypeDto.name}`, error);
      throw error;
    }
  }

  /**
   * Obtener todos los tipos de persona
   * GET /api/people/types
   */
  @Get('types/all')
  async findAllPersonTypes(): Promise<ApiResponseDto<PersonTypeResponseDto[]>> {
    try {
      this.logger.debug('Finding all person types');

      const personTypes = await this.personService.findAllPersonTypes();

      return ApiResponseDto.success(
        personTypes,
        'Tipos de persona obtenidos exitosamente',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error('Error finding person types', error);
      throw error;
    }
  }

  /**
   * Obtener tipo de persona por ID
   * GET /api/people/types/:id
   */
  @Get('types/:id')
  async findPersonTypeById(
    @Param('id') id: string,
  ): Promise<ApiResponseDto<PersonTypeResponseDto>> {
    try {
      if (!MongoUtils.isValidObjectId(id)) {
        this.logger.warn(`Invalid person type ID format: ${id}`);
        throw new Error('ID de tipo de persona inválido');
      }

      this.logger.debug(`Finding person type by ID: ${id}`);

      const personType = await this.personService.findPersonTypeById(id);

      return ApiResponseDto.success(
        personType,
        'Tipo de persona obtenido exitosamente',
        HttpStatus.OK,
      );
    } catch (error) {
      this.logger.error(`Error finding person type by ID: ${id}`, error);
      throw error;
    }
  }
}
