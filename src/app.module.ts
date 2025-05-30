import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

// Configuración
import appConfig from '@config/app.config';
import { DatabaseModule } from '@config/database.module';

// Infraestructura
import { GlobalExceptionFilter } from './infrastructure/exceptions/global-exception.filter';
import { LoggerService } from '@common/services/logger.service';

// Guards
import { AuthGuard } from '@middlewares/auth.guard';
import { RolesGuard } from '@middlewares/roles.guard';

@Module({
  imports: [
    // Configuración global
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      envFilePath: `.env.${process.env.NODE_ENV || 'development'}`,
    }),

    // Base de datos
    DatabaseModule,

    // JWT - Función síncrona corregida
    JwtModule.registerAsync({
      global: true,
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('app.jwt.secret'),
        signOptions: {
          expiresIn: configService.get<string>('app.jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),

    // Aquí se agregarán los módulos de funcionalidad
    // UserModule,
    // ResourceModule,
    // LoanModule,
    // etc.
  ],
  controllers: [],
  providers: [
    // Logger service
    LoggerService,

    // Filtro global de excepciones
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },

    // Guards globales
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
