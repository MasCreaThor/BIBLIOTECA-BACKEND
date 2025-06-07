// src/modules/resource/repositories/publisher.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publisher, PublisherDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class PublisherRepository extends BaseRepositoryImpl<PublisherDocument> {
  constructor(@InjectModel(Publisher.name) private publisherModel: Model<PublisherDocument>) {
    super(publisherModel);
  }

  async findByName(name: string): Promise<PublisherDocument | null> {
    return this.publisherModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  async findAllActive(): Promise<PublisherDocument[]> {
    return this.publisherModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  async findOrCreateByName(publisherName: string): Promise<PublisherDocument> {
    const cleanName = publisherName.trim();
    
    let publisher = await this.findByName(cleanName);
    
    if (!publisher) {
      publisher = await this.create({
        name: cleanName,
        active: true,
      });
    }

    return publisher;
  }

  async deactivate(publisherId: string): Promise<PublisherDocument | null> {
    return this.publisherModel
      .findByIdAndUpdate(publisherId, { active: false }, { new: true })
      .exec();
  }

  async activate(publisherId: string): Promise<PublisherDocument | null> {
    return this.publisherModel
      .findByIdAndUpdate(publisherId, { active: true }, { new: true })
      .exec();
  }
}
