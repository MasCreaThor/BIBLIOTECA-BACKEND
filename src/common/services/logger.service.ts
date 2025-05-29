import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logger: winston.Logger;

  constructor(private configService?: ConfigService) {
    // Si no se proporciona ConfigService, usar valores predeterminados
    const environment =
      this.configService?.get<string>('app.environment') || process.env.NODE_ENV || 'development';

    // Definir formatos de log según el entorno
    const formats = [
      winston.format.timestamp(),
      environment === 'development' ? winston.format.colorize() : winston.format.json(),
      winston.format.printf(({ timestamp, level, message, context, trace }) => {
        return `${timestamp} [${context || 'Application'}] ${level}: ${message}${trace ? `\n${trace}` : ''}`;
      }),
    ];

    // Configurar transports
    const transports: winston.transport[] = [new winston.transports.Console()];

    // Crear la instancia del logger
    this.logger = winston.createLogger({
      level: environment === 'development' ? 'debug' : 'info',
      format: winston.format.combine(...formats),
      transports,
    });
  }

  setContext(context: string): this {
    this.context = context;
    return this;
  }

  log(message: any, ...optionalParams: any[]): void {
    // Extraer context si está presente
    const context =
      optionalParams.length && typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams.pop()
        : this.context;

    this.logger.info(message, { context });
  }

  error(message: any, ...optionalParams: any[]): void {
    // Extraer stack trace y context si están presentes
    const context =
      optionalParams.length && typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams.pop()
        : this.context;

    const trace =
      optionalParams.length && optionalParams[0] instanceof Error
        ? optionalParams[0].stack
        : optionalParams.length && typeof optionalParams[0] === 'string'
          ? optionalParams[0]
          : undefined;

    this.logger.error(message, { context, trace });
  }

  warn(message: any, ...optionalParams: any[]): void {
    const context =
      optionalParams.length && typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams.pop()
        : this.context;

    this.logger.warn(message, { context });
  }

  debug(message: any, ...optionalParams: any[]): void {
    const context =
      optionalParams.length && typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams.pop()
        : this.context;

    this.logger.debug(message, { context });
  }

  verbose(message: any, ...optionalParams: any[]): void {
    const context =
      optionalParams.length && typeof optionalParams[optionalParams.length - 1] === 'string'
        ? optionalParams.pop()
        : this.context;

    this.logger.verbose(message, { context });
  }
}
