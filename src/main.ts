import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { LoggerService } from '@shared/services/logger.service';

async function bootstrap() {
  // Crear la aplicación sin desactivar el logger por defecto inicialmente
  const app = await NestFactory.create(AppModule);

  // Obtener el ConfigService
  const configService = app.get(ConfigService);

  // Obtener el LoggerService
  const loggerService = app.get(LoggerService);
  loggerService.setContext('Bootstrap');

  // Config. prefijo global para la API
  const apiPrefix = configService.get<string>('app.apiPrefix', 'api');
  app.setGlobalPrefix(apiPrefix);

  // Configuración de validación global
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors();

  // Iniciar el servidor
  const port = configService.get<number>('app.port', 3000);
  await app.listen(port);

  const url = await app.getUrl();
  console.log(`Application is running on: ${url}/${apiPrefix}`);
  loggerService.log(`Application running on port ${port}`);
}

bootstrap().catch((err) => {
  console.error('Error starting application:', err);
});
