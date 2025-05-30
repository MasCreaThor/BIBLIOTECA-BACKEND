import { Injectable, LoggerService as NestLoggerService } from '@nestjs/common';
import * as winston from 'winston';
import { ConfigService } from '@nestjs/config';

interface LogParams {
  context?: string;
  trace?: string;
  meta: Record<string, unknown>;
}

@Injectable()
export class LoggerService implements NestLoggerService {
  private context?: string;
  private logger: winston.Logger;

  constructor(private configService?: ConfigService) {
    // Obtener configuración del entorno
    const environment =
      this.configService?.get<string>('app.environment') || process.env.NODE_ENV || 'development';

    const logLevel =
      this.configService?.get<string>('app.logging.level') ||
      (environment === 'production' ? 'info' : 'debug');

    // Configurar formatos según el entorno
    const formats = [
      winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss',
      }),
      winston.format.errors({ stack: true }),
      // CORREGIDO: Template literals con tipado seguro
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        const ctx = String(context || this.context || 'Application');
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        const traceStr = trace ? `\n${String(trace)}` : '';
        return `${String(timestamp)} [${ctx}] ${String(level).toUpperCase()}: ${String(message)}${metaStr}${traceStr}`;
      }),
    ];

    // Agregar colorización solo en desarrollo
    if (environment === 'development') {
      formats.splice(1, 0, winston.format.colorize({ all: true }));
    }

    // Configurar transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        level: logLevel,
        handleExceptions: true,
        handleRejections: true,
      }),
    ];

    // Agregar archivo de logs en producción
    if (environment === 'production') {
      const logDirectory = this.configService?.get<string>('app.logging.directory') || 'logs';

      transports.push(
        new winston.transports.File({
          filename: `${logDirectory}/error.log`,
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
        new winston.transports.File({
          filename: `${logDirectory}/combined.log`,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
        }),
      );
    }

    // Crear la instancia del logger
    this.logger = winston.createLogger({
      level: logLevel,
      format: winston.format.combine(...formats),
      transports,
      exitOnError: false,
    });

    // Capturar excepciones no manejadas
    this.logger.exceptions.handle(new winston.transports.Console());

    this.logger.rejections.handle(new winston.transports.Console());
  }

  /**
   * Establecer el contexto para los logs
   */
  setContext(context: string): this {
    this.context = context;
    return this;
  }

  /**
   * Log de información general - CORREGIDO: Tipado seguro
   */
  log(message: string, ...optionalParams: unknown[]): void {
    const params = this.extractParams(optionalParams);
    this.logger.info(String(message), {
      context: params.context || this.context,
      ...params.meta,
    });
  }

  /**
   * Log de errores - CORREGIDO: Tipado seguro
   */
  error(message: string, ...optionalParams: unknown[]): void {
    const params = this.extractParams(optionalParams);
    this.logger.error(String(message), {
      context: params.context || this.context,
      trace: params.trace,
      ...params.meta,
    });
  }

  /**
   * Log de advertencias - CORREGIDO: Tipado seguro
   */
  warn(message: string, ...optionalParams: unknown[]): void {
    const params = this.extractParams(optionalParams);
    this.logger.warn(String(message), {
      context: params.context || this.context,
      ...params.meta,
    });
  }

  /**
   * Log de debug - CORREGIDO: Tipado seguro
   */
  debug(message: string, ...optionalParams: unknown[]): void {
    const params = this.extractParams(optionalParams);
    this.logger.debug(String(message), {
      context: params.context || this.context,
      ...params.meta,
    });
  }

  /**
   * Log verbose - CORREGIDO: Tipado seguro
   */
  verbose(message: string, ...optionalParams: unknown[]): void {
    const params = this.extractParams(optionalParams);
    this.logger.silly(String(message), {
      context: params.context || this.context,
      ...params.meta,
    });
  }

  /**
   * Log de inicio de aplicación
   */
  applicationStart(port: number, environment: string, url?: string): void {
    this.logger.info('🚀 Application started successfully', {
      context: 'Bootstrap',
      port,
      environment,
      url,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Log de conexión a base de datos
   */
  databaseConnected(uri: string): void {
    // Ocultar credenciales en la URI para logging
    const safeUri = uri.replace(/\/\/.*@/, '//***:***@');
    this.logger.info('🗄️ Database connected successfully', {
      context: 'Database',
      uri: safeUri,
    });
  }

  /**
   * Log de operaciones HTTP
   */
  httpRequest(method: string, url: string, statusCode: number, duration?: number): void {
    const level = statusCode >= 400 ? 'warn' : 'info';
    this.logger[level](`${method} ${url} - ${statusCode}`, {
      context: 'HTTP',
      method,
      url,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    });
  }

  /**
   * Extraer parámetros opcionales con tipado seguro - CORREGIDO
   */
  private extractParams(optionalParams: unknown[]): LogParams {
    if (!optionalParams.length) return { meta: {} };

    const lastParam = optionalParams[optionalParams.length - 1];
    const context = typeof lastParam === 'string' ? lastParam : undefined;

    // Buscar stack trace de forma segura
    let trace: string | undefined;
    for (const param of optionalParams) {
      if (param instanceof Error && param.stack) {
        trace = param.stack;
        break;
      }
      if (typeof param === 'string' && param.includes('\n')) {
        trace = param;
        break;
      }
    }

    // Extraer metadatos de forma segura
    const meta: Record<string, unknown> = {};
    for (const param of optionalParams) {
      if (
        typeof param === 'object' &&
        param !== null &&
        !(param instanceof Error) &&
        param !== lastParam
      ) {
        Object.assign(meta, param as Record<string, unknown>);
      }
    }

    return {
      context,
      trace,
      meta,
    };
  }
}
