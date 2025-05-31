import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PersonRepository } from '@repositories/person.repository';
import { PersonTypeRepository } from '@repositories/person-type.repository';
import { LoggerService } from '@common/services/logger.service';
import {
  CreatePersonDto,
  UpdatePersonDto,
  PersonResponseDto,
  PersonSearchDto,
  CreatePersonTypeDto,
  UpdatePersonTypeDto,
  PersonTypeResponseDto,
} from '@common/dto/person.dto';
import { PaginatedResponseDto } from '@common/dto/base.dto';
import { PersonDocument } from '@models/person.model';
import { PersonTypeDocument } from '@models/person-type.model';
import { MongoUtils } from '@common/utils';

/**
 * Servicio para gestión de personas (estudiantes y docentes)
 * Ruta: src/services/person.service.ts
 */

@Injectable()
export class PersonService {
  constructor(
    private readonly personRepository: PersonRepository,
    private readonly personTypeRepository: PersonTypeRepository,
    private readonly logger: LoggerService,
  ) {
    this.logger.setContext('PersonService');
  }

  /**
   * Crear una nueva persona
   */
  async create(createPersonDto: CreatePersonDto): Promise<PersonResponseDto> {
    const { firstName, lastName, documentNumber, grade, personTypeId } = createPersonDto;

    try {
      // Verificar que el tipo de persona existe
      if (!MongoUtils.isValidObjectId(personTypeId)) {
        throw new BadRequestException('ID de tipo de persona inválido');
      }

      const personType = await this.personTypeRepository.findById(personTypeId);
      if (!personType || !personType.active) {
        throw new BadRequestException('Tipo de persona no válido');
      }

      // Verificar si ya existe una persona con el mismo número de documento (si se proporciona)
      if (documentNumber) {
        const existingPerson = await this.personRepository.findByDocumentNumber(documentNumber);
        if (existingPerson) {
          throw new ConflictException('Ya existe una persona con este número de documento');
        }
      }

      // Crear persona
      const personData = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        documentNumber: documentNumber?.trim(),
        grade: grade?.trim(),
        personTypeId: MongoUtils.toObjectId(personTypeId),
        active: true,
      };

      const createdPerson = await this.personRepository.create(personData);

      this.logger.log(`Person created successfully: ${firstName} ${lastName} (${personType.name})`);

      return this.mapToResponseDto(createdPerson);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error creating person: ${firstName} ${lastName}`, error);
      throw new BadRequestException('Error al crear la persona');
    }
  }

  /**
   * Obtener persona por ID
   */
  async findById(id: string): Promise<PersonResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const person = await this.personRepository.findById(id);

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return this.mapToResponseDto(person);
  }

  /**
   * Obtener persona por número de documento
   */
  async findByDocumentNumber(documentNumber: string): Promise<PersonResponseDto> {
    const person = await this.personRepository.findByDocumentNumber(documentNumber);

    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    return this.mapToResponseDto(person);
  }

  /**
   * Buscar personas con filtros y paginación
   */
  async findAll(searchDto: PersonSearchDto): Promise<PaginatedResponseDto<PersonResponseDto>> {
    const { page = 1, limit = 20, search, personType, grade, documentNumber, status } = searchDto;

    const filters: any = {};

    if (status) {
      filters.active = status === 'active';
    }

    if (personType) {
      const personTypeDoc = await this.personTypeRepository.findByName(personType);
      if (personTypeDoc) {
        // CORREGIDO: Conversion segura de _id
        filters.personType = (personTypeDoc._id as any).toString();
      }
    }

    if (grade) {
      filters.grade = grade;
    }

    if (documentNumber) {
      filters.documentNumber = documentNumber;
    }

    if (search) {
      filters.search = search;
    }

    const result = await this.personRepository.findWithFilters(filters, page, limit);
    const mappedData = result.data.map((person) => this.mapToResponseDto(person));

    return new PaginatedResponseDto(mappedData, result.total, result.page, limit);
  }

  /**
   * Actualizar persona
   */
  async update(id: string, updatePersonDto: UpdatePersonDto): Promise<PersonResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const existingPerson = await this.personRepository.findById(id);
    if (!existingPerson) {
      throw new NotFoundException('Persona no encontrada');
    }

    try {
      const updateData: any = {};

      // Actualizar campos básicos
      if (updatePersonDto.firstName) {
        updateData.firstName = updatePersonDto.firstName.trim();
      }

      if (updatePersonDto.lastName) {
        updateData.lastName = updatePersonDto.lastName.trim();
      }

      if (updatePersonDto.grade !== undefined) {
        updateData.grade = updatePersonDto.grade?.trim();
      }

      if (updatePersonDto.active !== undefined) {
        updateData.active = updatePersonDto.active;
      }

      // Verificar número de documento único
      if (
        updatePersonDto.documentNumber &&
        updatePersonDto.documentNumber !== existingPerson.documentNumber
      ) {
        const existingDoc = await this.personRepository.findByDocumentNumber(
          updatePersonDto.documentNumber,
        );
        // CORREGIDO: Conversion segura de _id
        if (existingDoc && (existingDoc._id as any).toString() !== id) {
          throw new ConflictException('Ya existe una persona con este número de documento');
        }
        updateData.documentNumber = updatePersonDto.documentNumber.trim();
      }

      // Verificar tipo de persona
      if (updatePersonDto.personTypeId) {
        if (!MongoUtils.isValidObjectId(updatePersonDto.personTypeId)) {
          throw new BadRequestException('ID de tipo de persona inválido');
        }

        const personType = await this.personTypeRepository.findById(updatePersonDto.personTypeId);
        if (!personType || !personType.active) {
          throw new BadRequestException('Tipo de persona no válido');
        }
        updateData.personTypeId = MongoUtils.toObjectId(updatePersonDto.personTypeId);
      }

      const updatedPerson = await this.personRepository.update(id, updateData);

      if (!updatedPerson) {
        throw new NotFoundException('Persona no encontrada');
      }

      this.logger.log(
        `Person updated successfully: ${updatedPerson.firstName} ${updatedPerson.lastName}`,
      );

      return this.mapToResponseDto(updatedPerson);
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      this.logger.error(`Error updating person: ${id}`, error);
      throw new BadRequestException('Error al actualizar la persona');
    }
  }

  /**
   * Desactivar persona (soft delete)
   */
  async deactivate(id: string): Promise<PersonResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const deactivatedPerson = await this.personRepository.deactivate(id);

    if (!deactivatedPerson) {
      throw new NotFoundException('Persona no encontrada');
    }

    this.logger.log(
      `Person deactivated: ${deactivatedPerson.firstName} ${deactivatedPerson.lastName}`,
    );

    return this.mapToResponseDto(deactivatedPerson);
  }

  /**
   * Activar persona
   */
  async activate(id: string): Promise<PersonResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const activatedPerson = await this.personRepository.activate(id);

    if (!activatedPerson) {
      throw new NotFoundException('Persona no encontrada');
    }

    this.logger.log(`Person activated: ${activatedPerson.firstName} ${activatedPerson.lastName}`);

    return this.mapToResponseDto(activatedPerson);
  }

  /**
   * Eliminar persona permanentemente
   */
  async delete(id: string): Promise<void> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de persona inválido');
    }

    const person = await this.personRepository.findById(id);
    if (!person) {
      throw new NotFoundException('Persona no encontrada');
    }

    // TODO: Verificar que no tenga préstamos activos antes de eliminar

    const deleted = await this.personRepository.delete(id);

    if (!deleted) {
      throw new NotFoundException('Persona no encontrada');
    }

    this.logger.log(`Person deleted permanently: ${person.firstName} ${person.lastName}`);
  }

  /**
   * Obtener estadísticas de personas
   */
  async getStatistics(): Promise<{
    total: number;
    students: number;
    teachers: number;
    byGrade: Array<{ grade: string; count: number }>;
  }> {
    return this.personRepository.getStatistics();
  }

  // === GESTIÓN DE TIPOS DE PERSONA ===

  /**
   * Crear tipo de persona
   */
  async createPersonType(createPersonTypeDto: CreatePersonTypeDto): Promise<PersonTypeResponseDto> {
    const { name, description } = createPersonTypeDto;

    try {
      // Verificar si ya existe
      const existing = await this.personTypeRepository.findByName(name);
      if (existing) {
        throw new ConflictException('El tipo de persona ya existe');
      }

      const personTypeData = {
        name,
        description: description.trim(),
        active: true,
      };

      const createdPersonType = await this.personTypeRepository.create(personTypeData);

      this.logger.log(`PersonType created successfully: ${name}`);

      return this.mapPersonTypeToResponseDto(createdPersonType);
    } catch (error) {
      if (error instanceof ConflictException || error instanceof BadRequestException) {
        throw error;
      }

      this.logger.error(`Error creating person type: ${name}`, error);
      throw new BadRequestException('Error al crear el tipo de persona');
    }
  }

  /**
   * Obtener todos los tipos de persona
   */
  async findAllPersonTypes(): Promise<PersonTypeResponseDto[]> {
    const personTypes = await this.personTypeRepository.findAllActive();
    return personTypes.map((pt) => this.mapPersonTypeToResponseDto(pt));
  }

  /**
   * Obtener tipo de persona por ID
   */
  async findPersonTypeById(id: string): Promise<PersonTypeResponseDto> {
    if (!MongoUtils.isValidObjectId(id)) {
      throw new BadRequestException('ID de tipo de persona inválido');
    }

    const personType = await this.personTypeRepository.findById(id);

    if (!personType) {
      throw new NotFoundException('Tipo de persona no encontrado');
    }

    return this.mapPersonTypeToResponseDto(personType);
  }

  /**
   * Mapear entidad persona a DTO de respuesta
   */
  private mapToResponseDto(person: PersonDocument): PersonResponseDto {
    // Obtener personType si está poblado, o crear estructura básica
    let personType: any = undefined;

    // Verificar si personType está poblado
    if (person.populated('personTypeId')) {
      const populatedType = person.personTypeId as any;
      personType = {
        _id: populatedType._id?.toString() || populatedType.toString(),
        name: populatedType.name || '',
        description: populatedType.description || '',
      };
    }

    return {
      // CORREGIDO: Conversion segura de _id
      _id: (person._id as any).toString(),
      firstName: person.firstName,
      lastName: person.lastName,
      fullName: person.fullName,
      documentNumber: person.documentNumber,
      grade: person.grade,
      personTypeId: person.personTypeId.toString(),
      personType,
      active: person.active,
      createdAt: person.createdAt,
      updatedAt: person.updatedAt,
    };
  }

  /**
   * Mapear entidad tipo de persona a DTO de respuesta
   */
  private mapPersonTypeToResponseDto(personType: PersonTypeDocument): PersonTypeResponseDto {
    return {
      // CORREGIDO: Conversion segura de _id
      _id: (personType._id as any).toString(),
      name: personType.name,
      description: personType.description,
      active: personType.active,
      createdAt: personType.createdAt,
      updatedAt: personType.updatedAt,
    };
  }
}
