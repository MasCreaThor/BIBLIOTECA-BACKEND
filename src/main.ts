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

  // Configurar límites del body-parser para manejar imágenes base64
  app.use(require('express').json({ limit: '10mb' }));
  app.use(require('express').urlencoded({ limit: '10mb', extended: true }));

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
  
  // Log de configuración (solo en desarrollo)
  if (process.env.NODE_ENV === 'development') {
    console.log('🔧 Configuración cargada:');
    console.log('- NODE_ENV:', process.env.NODE_ENV);
    console.log('- MONGODB_URI:', process.env.MONGODB_URI ? 'Configurado' : 'No configurado');
    console.log('- JWT_SECRET:', process.env.JWT_SECRET ? 'Configurado' : 'No configurado');
    console.log('- CORS_ORIGIN:', process.env.CORS_ORIGIN);
  }
}

bootstrap().catch((err) => {
  console.error('Error starting application:', err);
});
