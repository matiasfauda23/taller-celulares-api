import { ValidationPipe } from '@nestjs/common';

export const validateDto = async <T extends object>(
  type: new () => T,
  value: unknown,
): Promise<T> =>
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }).transform(value, { type: 'body', metatype: type }) as Promise<T>;
