// src/modules/resource/repositories/location.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class LocationRepository extends BaseRepositoryImpl<LocationDocument> {
  constructor(@InjectModel(Location.name) private locationModel: Model<LocationDocument>) {
    super(locationModel);
  }

  async findByName(name: string): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  async findByCode(code: string): Promise<LocationDocument | null> {
    return this.locationModel.findOne({ 
      code: { $regex: new RegExp(`^${code}$`, 'i') },
      active: true 
    }).exec();
  }

  async findAllActive(): Promise<LocationDocument[]> {
    return this.locationModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  async deactivate(locationId: string): Promise<LocationDocument | null> {
    return this.locationModel
      .findByIdAndUpdate(locationId, { active: false }, { new: true })
      .exec();
  }

  async activate(locationId: string): Promise<LocationDocument | null> {
    return this.locationModel
      .findByIdAndUpdate(locationId, { active: true }, { new: true })
      .exec();
  }
}