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

const ALLOWED_AUTH_ERRORS: Record<string, { status: number; message: string }> =
  {
    EMAIL_ALREADY_REGISTERED: {
      status: HttpStatus.CONFLICT,
      message: 'Email is already registered',
    },
    INVALID_CREDENTIALS: {
      status: HttpStatus.UNAUTHORIZED,
      message: 'Invalid credentials',
    },
    INVALID_REFRESH_TOKEN: {
      status: HttpStatus.UNAUTHORIZED,
      message: 'Invalid refresh token',
    },
    AUTHENTICATION_REQUIRED: {
      status: HttpStatus.UNAUTHORIZED,
      message: 'Authentication required',
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
    const controlledError =
      exception instanceof HttpException
        ? controlledAuthError(exception, statusCode)
        : undefined;
    const publicError = controlledError ??
      PUBLIC_ERRORS[statusCode] ?? {
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

function controlledAuthError(
  exception: HttpException,
  statusCode: number,
): { code: string; message: string } | undefined {
  const response = exception.getResponse();
  if (typeof response !== 'object' || !('code' in response)) return undefined;
  const code = (response as { code?: unknown }).code;
  if (typeof code !== 'string') return undefined;
  const allowed = ALLOWED_AUTH_ERRORS[code];
  if (allowed?.status !== statusCode) return undefined;
  return { code, message: allowed.message };
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
