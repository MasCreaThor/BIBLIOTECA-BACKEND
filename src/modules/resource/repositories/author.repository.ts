// src/modules/resource/repositories/author.repository.ts
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Author, AuthorDocument } from '@modules/resource/models';
import { BaseRepositoryImpl } from '@shared/repositories';

@Injectable()
export class AuthorRepository extends BaseRepositoryImpl<AuthorDocument> {
  constructor(@InjectModel(Author.name) private authorModel: Model<AuthorDocument>) {
    super(authorModel);
  }

  async findByName(name: string): Promise<AuthorDocument | null> {
    return this.authorModel.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      active: true 
    }).exec();
  }

  async findAllActive(): Promise<AuthorDocument[]> {
    return this.authorModel.find({ active: true }).sort({ name: 1 }).exec();
  }

  // Renombrar el método para evitar conflicto con la clase base
  async searchAuthorsByText(searchTerm: string, limit: number = 20): Promise<AuthorDocument[]> {
    return this.authorModel
      .find({
        name: { $regex: searchTerm, $options: 'i' },
        active: true
      })
      .sort({ name: 1 })
      .limit(limit)
      .exec();
  }

  async findOrCreateByNames(authorNames: string[]): Promise<AuthorDocument[]> {
    const authors: AuthorDocument[] = [];

    for (const name of authorNames) {
      const cleanName = name.trim();
      if (!cleanName) continue;

      let author = await this.findByName(cleanName);
      
      if (!author) {
        author = await this.create({
          name: cleanName,
          active: true,
        });
      }

      authors.push(author);
    }

    return authors;
  }

  async deactivate(authorId: string): Promise<AuthorDocument | null> {
    return this.authorModel
      .findByIdAndUpdate(authorId, { active: false }, { new: true })
      .exec();
  }

  async activate(authorId: string): Promise<AuthorDocument | null> {
    return this.authorModel
      .findByIdAndUpdate(authorId, { active: true }, { new: true })
      .exec();
  }
}