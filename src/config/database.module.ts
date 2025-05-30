import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        // Obtener configuración de forma segura y síncrona
        const databaseConfig = configService.get('app.database');

        if (!databaseConfig) {
          throw new Error('Database configuration not found');
        }

        // Destructurar de forma segura
        const { uri, options } = databaseConfig as {
          uri: string;
          options: Record<string, unknown>;
        };

        return {
          uri,
          ...options,
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
