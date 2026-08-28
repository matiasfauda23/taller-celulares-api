import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { ApiErrorFilter } from './common/errors/api-error.filter';
import type { AppConfiguration } from './config/configuration';

export function configureApplication(app: NestExpressApplication): void {
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Mobile Repair Shop API')
    .setDescription('Public authentication API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  SwaggerModule.setup(
    'api/docs',
    app,
    SwaggerModule.createDocument(app, swaggerConfig),
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  configureApplication(app);
  const config = app.get(ConfigService<AppConfiguration, true>);

  await app.listen(config.get('runtime.port', { infer: true }));
}

if (require.main === module) void bootstrap();
