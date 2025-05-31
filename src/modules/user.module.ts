import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Modelos
import { User, UserSchema } from '@models/user.model';

// Repositorios
import { UserRepository } from '@repositories/user.repository';

// Servicios
import { UserService } from '@services/user.service';
import { PasswordService } from '@services/password.service';
import { LoggerService } from '@common/services/logger.service';

// Controladores
import { UserController } from '@controllers/user.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  controllers: [UserController],
  providers: [
    // Servicios
    UserService,
    PasswordService,
    LoggerService,

    // Repositorios
    UserRepository,
  ],
  exports: [
    // Exportar servicios para usar en otros módulos
    UserService,
    UserRepository,
  ],
})
export class UserModule {}