import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response, Request } from 'express';
import { LoggerService } from '@common/services/logger.service';

interface ErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}

interface HttpExceptionResponse {
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {
    this.logger.setContext('GlobalExceptionFilter');
  }

  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determinar el código de estado y los detalles del error
    const status =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extraer los detalles del mensaje de error
    let errorMessage: string | string[] = exception.message;
    let errorName = exception.name;

    if (exception instanceof HttpException) {
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const exceptionResponseObj = exceptionResponse as HttpExceptionResponse;
        errorMessage = exceptionResponseObj.message || errorMessage;
        errorName = exceptionResponseObj.error || errorName;
      }
    }

    // Crear respuesta de error estructurada
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message: errorMessage,
      error: errorName,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log según nivel de severidad
    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${status}: ${JSON.stringify(errorMessage)}`,
        exception.stack || 'No stack trace available',
      );
    } else if (status >= 400) {
      this.logger.warn(
        `${request.method} ${request.url} - ${status}: ${JSON.stringify(errorMessage)}`,
      );
    }

    // Enviar respuesta al cliente
    response.status(status).json(errorResponse);
  }
}
