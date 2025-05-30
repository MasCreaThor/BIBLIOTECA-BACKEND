import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      // ULTRA CORREGIDO: useFactory síncrono sin Promise spread
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

        // Retornar configuración sin spread de Promise
        return {
          uri,
          ...options, // Ahora es seguro porque options no es una Promise
        };
      },
      inject: [ConfigService],
    }),
  ],
  exports: [MongooseModule],
})
export class DatabaseModule {}
