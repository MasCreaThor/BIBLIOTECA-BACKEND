import { Types, Document } from 'mongoose';

export type ObjectId = Types.ObjectId;

export interface BaseDocument {
  _id: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface PopulatedDocument<T> extends Document {
  populated(path: string): boolean;
}