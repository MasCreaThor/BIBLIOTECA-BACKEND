// src/modules/resource/services/management/publisher.service.ts
import {
    Injectable,
    ConflictException,
    NotFoundException,
    BadRequestException,
  } from '@nestjs/common';
  import { PublisherRepository } from '@modules/resource/repositories';
  import { LoggerService } from '@shared/services/logger.service';
  import {
    CreatePublisherDto,
    UpdatePublisherDto,
    PublisherResponseDto,
  } from '@modules/resource/dto';
  import { PublisherDocument } from '@modules/resource/models';
  import { MongoUtils } from '@shared/utils';
  
  @Injectable()
  export class PublisherService {
    constructor(
      private readonly publisherRepository: PublisherRepository,
      private readonly logger: LoggerService,
    ) {
      this.logger.setContext('PublisherService');
    }
  
    async create(createPublisherDto: CreatePublisherDto): Promise<PublisherResponseDto> {
      const { name, description } = createPublisherDto;
  
      const existingPublisher = await this.publisherRepository.findByName(name);
      if (existingPublisher) {
        throw new ConflictException('Ya existe una editorial con este nombre');
      }
  
      const publisherData = {
        name: name.trim(),
        description: description?.trim(),
        active: true,
      };
  
      const createdPublisher = await this.publisherRepository.create(publisherData);
      this.logger.log(`Publisher created successfully: ${name}`);
  
      return this.mapToResponseDto(createdPublisher);
    }
  
    async findById(id: string): Promise<PublisherResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      const publisher = await this.publisherRepository.findById(id);
      if (!publisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      return this.mapToResponseDto(publisher);
    }
  
    async findAllActive(): Promise<PublisherResponseDto[]> {
      const publishers = await this.publisherRepository.findAllActive();
      return publishers.map(publisher => this.mapToResponseDto(publisher));
    }
  
    async findOrCreateByName(publisherName: string): Promise<PublisherResponseDto> {
      const publisher = await this.publisherRepository.findOrCreateByName(publisherName);
      return this.mapToResponseDto(publisher);
    }
  
    async update(id: string, updatePublisherDto: UpdatePublisherDto): Promise<PublisherResponseDto> {
      if (!MongoUtils.isValidObjectId(id)) {
        throw new BadRequestException('ID de editorial inválido');
      }
  
      const existingPublisher = await this.publisherRepository.findById(id);
      if (!existingPublisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      const updateData: any = {};
  
      if (updatePublisherDto.name && updatePublisherDto.name !== existingPublisher.name) {
        const existingByName = await this.publisherRepository.findByName(updatePublisherDto.name);
        if (existingByName && (existingByName._id as any).toString() !== id) {
          throw new ConflictException('Ya existe una editorial con este nombre');
        }
        updateData.name = updatePublisherDto.name.trim();
      }
  
      if (updatePublisherDto.description !== undefined) {
        updateData.description = updatePublisherDto.description?.trim();
      }
  
      if (updatePublisherDto.active !== undefined) {
        updateData.active = updatePublisherDto.active;
      }
  
      const updatedPublisher = await this.publisherRepository.update(id, updateData);
      if (!updatedPublisher) {
        throw new NotFoundException('Editorial no encontrada');
      }
  
      this.logger.log(`Publisher updated successfully: ${updatedPublisher.name}`);
      return this.mapToResponseDto(updatedPublisher);
    }
  
    private mapToResponseDto(publisher: PublisherDocument): PublisherResponseDto {
      return {
        _id: (publisher._id as any).toString(),
        name: publisher.name,
        description: publisher.description,
        active: publisher.active,
        createdAt: publisher.createdAt,
        updatedAt: publisher.updatedAt,
      };
    }
  }
