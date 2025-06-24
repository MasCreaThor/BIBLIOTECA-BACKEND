import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { BaseDocument } from '@shared/interfaces/base.interfaces';

export type SystemConfigDocument = SystemConfig & BaseDocument;

@Schema({
  timestamps: true,
  collection: 'system_configs',
})
export class SystemConfig {
  @Prop({
    type: String,
    required: true,
    default: 'Biblioteca Escolar',
    trim: true,
  })
  sidebarTitle!: string;

  @Prop({
    type: String,
    required: true,
    default: 'Sistema de Biblioteca',
    trim: true,
  })
  sidebarSubtitle!: string;

  @Prop({
    type: String,
    required: true,
    default: 'FiBook',
    trim: true,
  })
  sidebarIcon!: string; // Nombre del icono de react-icons/fi

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  sidebarIconUrl?: string; // URL de imagen personalizada

  @Prop({
    type: String,
    required: false,
  })
  sidebarIconImage?: string; // Imagen en base64 (data URL)

  @Prop({
    type: String,
    required: true,
    default: '1.0.0',
    trim: true,
  })
  version!: string;

  @Prop({
    type: Boolean,
    default: true,
  })
  active!: boolean;

  @Prop({
    type: String,
    required: false,
    trim: true,
  })
  description?: string;

  @Prop({
    type: Date,
    default: Date.now,
  })
  lastUpdated!: Date;
}

export const SystemConfigSchema = SchemaFactory.createForClass(SystemConfig);

// Índices
SystemConfigSchema.index({ active: 1 });
SystemConfigSchema.index({ createdAt: -1 }); 