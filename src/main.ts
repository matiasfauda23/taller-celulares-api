import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './common/errors/api-error.filter';
import type { AppConfiguration } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService<AppConfiguration, true>);

  app.use(helmet());
  app.enableCors({
    origin: config.get('security.corsAllowedOrigins', { infer: true }),
  });
  app.set('trust proxy', config.get('security.trustProxy', { infer: true }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new ApiErrorFilter());

  await app.listen(config.get('runtime.port', { infer: true }));
}

void bootstrap();
