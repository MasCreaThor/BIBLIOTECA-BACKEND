import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Controladores internos
import { AuthController } from './controllers/auth.controller';

// Servicios internos
import { AuthService } from './services/auth.service';
import { BootstrapService } from './services/bootstrap.service';

// Servicios compartidos (PasswordService ahora está en shared)
import { LoggerService } from '@shared/services';

// Modelos y repositorios de otros módulos
import { User, UserSchema } from '@modules/user/models';
import { UserRepository } from '@modules/user/repositories';

// Modelos y repositorios de auth
import { PasswordResetToken, PasswordResetTokenSchema } from './models/password-reset-token.model';
import { PasswordResetTokenRepository } from './repositories/password-reset-token.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema }
    ])
  ],
  controllers: [AuthController],
  providers: [
    // PasswordService ya no se declara aquí, viene de SharedModule global
    AuthService,
    BootstrapService,
    LoggerService,
    UserRepository,
    PasswordResetTokenRepository,
  ],
  exports: [
    AuthService,
    BootstrapService,
    // PasswordService se exporta desde SharedModule
  ],
})
export class AuthModule {}
