import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import configuration from './config/configuration';
import { validateEnvironment } from './config/env.validation';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthThrottlerGuard } from './common/security/auth-throttler.guard';

const isRoute =
  (method: string, path: string) =>
  (context: {
    switchToHttp(): {
      getRequest(): {
        method?: string;
        route?: { path?: string };
        originalUrl?: string;
      };
    };
  }): boolean => {
    const request = context.switchToHttp().getRequest();
    const requestPath =
      request.route?.path ?? request.originalUrl?.split('?')[0];
    return request.method === method && requestPath === path;
  };

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        { name: 'global', ttl: 60_000, limit: 100 },
        {
          name: 'register-origin',
          ttl: 3_600_000,
          limit: 5,
          skipIf: (context) => !isRoute('POST', '/auth/register')(context),
        },
        {
          name: 'register-email',
          ttl: 3_600_000,
          limit: 3,
          skipIf: (context) => !isRoute('POST', '/auth/register')(context),
        },
        {
          name: 'login-origin',
          ttl: 900_000,
          limit: 20,
          skipIf: (context) => !isRoute('POST', '/auth/login')(context),
        },
        {
          name: 'login-email',
          ttl: 900_000,
          limit: 5,
          skipIf: (context) => !isRoute('POST', '/auth/login')(context),
        },
      ],
    }),
    PrismaModule,
    AuthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: AuthThrottlerGuard }],
})
export class AppModule {}
