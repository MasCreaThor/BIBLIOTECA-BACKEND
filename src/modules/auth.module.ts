import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Modelos
import { User, UserSchema } from '@models/user.model';

// Repositorios
import { UserRepository } from '@repositories/user.repository';

// Servicios
import { AuthService } from '@services/auth.service';
import { PasswordService } from '@services/password.service';
import { LoggerService } from '@common/services/logger.service';

// Controladores
import { AuthController } from '@controllers/auth.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [AuthController],
  providers: [
    // Servicios
    AuthService,
    PasswordService,
    LoggerService,

    // Repositorios
    UserRepository,
  ],
  exports: [
    // Exportar servicios para usar en otros módulos
    AuthService,
    PasswordService,
    UserRepository,
  ],
})
export class AuthModule {}