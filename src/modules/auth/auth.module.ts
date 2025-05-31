import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controladores internos
import { AuthController } from './controllers/auth.controller';

// Servicios internos
import { AuthService } from './services/auth.service';

// Servicios compartidos (PasswordService ahora está en shared)
import { LoggerService } from '@shared/services';

// Modelos y repositorios de otros módulos
import { User, UserSchema } from '@modules/user/models';
import { UserRepository } from '@modules/user/repositories';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [AuthController],
  providers: [
    // PasswordService ya no se declara aquí, viene de SharedModule global
    AuthService,
    LoggerService,
    UserRepository,
  ],
  exports: [
    AuthService,
    // PasswordService se exporta desde SharedModule
  ],
})
export class AuthModule {}
