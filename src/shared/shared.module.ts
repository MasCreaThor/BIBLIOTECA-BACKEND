import { Module, Global } from '@nestjs/common';
import { LoggerService } from './services/logger.service';
import { PasswordService } from './services/password.service';

/**
 * Módulo compartido global con servicios comunes
 * @Global hace que los servicios estén disponibles en toda la aplicación
 */
@Global()
@Module({
  providers: [
    LoggerService,
    PasswordService,
  ],
  exports: [
    LoggerService,
    PasswordService,
  ],
})
export class SharedModule {}
