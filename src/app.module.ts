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

// Módulos de funcionalidad
import { AuthModule } from './modules/auth.module';
import { UserModule } from './modules/user.module';
import { PersonModule } from './modules/person.module';
import { SeedModule } from '@common/seeds/seed.module';

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

    // Módulos de funcionalidad - EPIC-2
    AuthModule,
    UserModule,
    PersonModule,
    SeedModule,

    // Próximos módulos - EPIC-3+
    // ResourceModule,
    // LoanModule,
    // ReportModule,
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
