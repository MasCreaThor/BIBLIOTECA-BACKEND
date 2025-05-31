import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';

// Configuración
import appConfig from '@config/app.config';
import { DatabaseModule } from '@config/database.module';

// Módulo compartido GLOBAL
import { SharedModule } from '@shared/shared.module';

// Infraestructura compartida
import { GlobalExceptionFilter } from '@shared/exceptions';
import { AuthGuard, RolesGuard } from '@shared/guards';

// Módulos de funcionalidad
import { UserModule } from '@modules/user';
import { AuthModule } from '@modules/auth';
import { PersonModule } from '@modules/person';
import { SeedModule } from '@database/seeds/seed.module';

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

    // JWT
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

    // MÓDULO COMPARTIDO GLOBAL - Debe ir ANTES que otros módulos
    SharedModule,

    // Módulos de funcionalidad
    UserModule,
    AuthModule,
    PersonModule,
    SeedModule,
  ],
  controllers: [],
  providers: [
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
