import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

// Componentes internos
import { UserController } from './controllers';
import { UserService } from './services';
import { UserRepository } from './repositories';
import { User, UserSchema } from './models';

// Servicios compartidos (PasswordService viene de SharedModule global)
import { LoggerService } from '@shared/services';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])
  ],
  controllers: [UserController],
  providers: [
    UserService,
    UserRepository,
    LoggerService,
    // PasswordService ya no se declara aquí, viene de SharedModule global
  ],
  exports: [
    UserService,
    UserRepository,
  ],
})
export class UserModule {}
