// src/modules/resource/controllers/management/publisher.controller.ts
import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    HttpCode,
    HttpStatus,
  } from '@nestjs/common';
  import { PublisherService } from '@modules/resource/services/management/publisher.service';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreatePublisherDto,
    UpdatePublisherDto,
    PublisherResponseDto,
  } from '@modules/resource/dto';
  import { ApiResponseDto } from '@shared/dto/base.dto';
  import { Roles } from '@shared/decorators/auth.decorators';
  import { UserRole } from '@shared/guards/roles.guard';
  import { ValidationUtils, MongoUtils } from '@shared/utils';
  
  @Controller('publishers')
  @Roles(UserRole.LIBRARIAN, UserRole.ADMIN)
  export class PublisherController {
    constructor(
      private readonly publisherService: PublisherService,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('PublisherController');
    }
  
    @Post()
    @HttpCode(HttpStatus.CREATED)
    async create(
      @Body() createPublisherDto: CreatePublisherDto,
    ): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        this.logger.log(`Creating publisher: ${createPublisherDto.name}`);
        const publisher = await this.publisherService.create(createPublisherDto);
        return ApiResponseDto.success(publisher, 'Editorial creada exitosamente', HttpStatus.CREATED);
      } catch (error) {
        this.logger.error(`Error creating publisher: ${createPublisherDto.name}`, error);
        throw error;
      }
    }
  
    @Get()
    async findAllActive(): Promise<ApiResponseDto<PublisherResponseDto[]>> {
      try {
        this.logger.debug('Finding all active publishers');
        const publishers = await this.publisherService.findAllActive();
        return ApiResponseDto.success(
          publishers,
          'Editoriales activas obtenidas exitosamente',
          HttpStatus.OK,
        );
      } catch (error) {
        this.logger.error('Error finding active publishers', error);
        throw error;
      }
    }
  
    @Get(':id')
    async findById(@Param('id') id: string): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.debug(`Finding publisher by ID: ${id}`);
        const publisher = await this.publisherService.findById(id);
        return ApiResponseDto.success(publisher, 'Editorial obtenida exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error finding publisher by ID: ${id}`, error);
        throw error;
      }
    }
  
    @Put(':id')
    async update(
      @Param('id') id: string,
      @Body() updatePublisherDto: UpdatePublisherDto,
    ): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!MongoUtils.isValidObjectId(id)) {
          this.logger.warn(`Invalid publisher ID format: ${id}`);
          throw new Error('ID de editorial inválido');
        }
  
        this.logger.log(`Updating publisher: ${id}`);
        const publisher = await this.publisherService.update(id, updatePublisherDto);
        return ApiResponseDto.success(publisher, 'Editorial actualizada exitosamente', HttpStatus.OK);
      } catch (error) {
        this.logger.error(`Error updating publisher: ${id}`, error);
        throw error;
      }
    }
  
    @Post('find-or-create')
    @HttpCode(HttpStatus.CREATED)
    async findOrCreateByName(
      @Body() body: { name: string },
    ): Promise<ApiResponseDto<PublisherResponseDto>> {
      try {
        if (!body.name || !ValidationUtils.isNotEmpty(body.name)) {
          this.logger.warn('Publisher name is required');
          throw new Error('El nombre de la editorial es requerido');
        }
  
        this.logger.log(`Finding or creating publisher: ${body.name}`);
        const publisher = await this.publisherService.findOrCreateByName(body.name);
  
        return ApiResponseDto.success(
          publisher,
          'Editorial creada/encontrada exitosamente',
          HttpStatus.CREATED,
        );
      } catch (error) {
        this.logger.error(`Error finding or creating publisher: ${body.name}`, error);
        throw error;
      }
    }
  }
  