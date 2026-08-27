import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import type {
  ApiErrorResponse,
  ApiValidationErrorDetail,
} from './api-error.response';

const PUBLIC_ERRORS: Record<number, { code: string; message: string }> = {
  [HttpStatus.BAD_REQUEST]: {
    code: 'VALIDATION_ERROR',
    message: 'Request validation failed',
  },
  [HttpStatus.UNAUTHORIZED]: {
    code: 'AUTHENTICATION_REQUIRED',
    message: 'Authentication required',
  },
  [HttpStatus.FORBIDDEN]: { code: 'FORBIDDEN', message: 'Access denied' },
  [HttpStatus.NOT_FOUND]: { code: 'NOT_FOUND', message: 'Resource not found' },
  [HttpStatus.CONFLICT]: {
    code: 'CONFLICT',
    message: 'Request conflicts with current state',
  },
  [HttpStatus.TOO_MANY_REQUESTS]: {
    code: 'RATE_LIMITED',
    message: 'Too many requests',
  },
};

@Catch()
export class ApiErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : 500;
    const publicError = PUBLIC_ERRORS[statusCode] ?? {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
    };
    const body: ApiErrorResponse = {
      statusCode,
      ...publicError,
      path: request.originalUrl,
    };

    if (statusCode === 400 && exception instanceof HttpException) {
      const details = validationDetails(exception.getResponse());
      if (details.length > 0) body.details = details;
    }

    response.status(statusCode).json(body);
  }
}

function validationDetails(
  response: string | object,
): ApiValidationErrorDetail[] {
  if (typeof response !== 'object' || !('message' in response)) return [];
  const messages = (response as { message?: unknown }).message;
  if (
    !Array.isArray(messages) ||
    !messages.every((message) => typeof message === 'string')
  )
    return [];

  return messages.map((message) => ({
    field: message.split(' ')[0] ?? 'request',
    message,
  }));
}
