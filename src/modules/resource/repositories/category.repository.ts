// src/modules/resource/repositories/category.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Category, CategoryDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class CategoryRepository extends BaseRepositoryImpl<CategoryDocument> {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {
    super(categoryModel);
  }

  async findByName(name: string): Promise<CategoryDocument | null> {
    return this.categoryModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  async findAllActive(): Promise<CategoryDocument[]> {
    return this.categoryModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  async deactivate(categoryId: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { active: false }, { new: true })
      .exec();
  }

  async activate(categoryId: string): Promise<CategoryDocument | null> {
    return this.categoryModel
      .findByIdAndUpdate(categoryId, { active: true }, { new: true })
      .exec();
  }
}



