import { ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import {
  InjectThrottlerOptions,
  InjectThrottlerStorage,
  ThrottlerGuard,
} from '@nestjs/throttler';
import type { ThrottlerModuleOptions } from '@nestjs/throttler/dist/throttler-module-options.interface';
import type { ThrottlerStorage } from '@nestjs/throttler/dist/throttler-storage.interface';
import type { ThrottlerRequest } from '@nestjs/throttler/dist/throttler.guard.interface';
import { createHmac } from 'node:crypto';
import type { AppConfiguration } from '../../config/configuration';

@Injectable()
export class AuthThrottlerGuard extends ThrottlerGuard {
  constructor(
    @InjectThrottlerOptions() options: ThrottlerModuleOptions,
    @InjectThrottlerStorage() storage: ThrottlerStorage,
    reflector: Reflector,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {
    super(options, storage, reflector);
  }

  protected override handleRequest(props: ThrottlerRequest): Promise<boolean> {
    const identityPolicy = props.throttler.name?.endsWith('-email') ?? false;
    return super.handleRequest({
      ...props,
      getTracker: identityPolicy
        ? (request) =>
            this.emailTracker(
              (request.body as Record<string, unknown> | undefined)?.email,
            )
        : (request) => this.originTracker(request),
    });
  }

  protected override async throwThrottlingException(
    context: ExecutionContext,
    detail: Parameters<ThrottlerGuard['throwThrottlingException']>[1],
  ): Promise<void> {
    context
      .switchToHttp()
      .getResponse<{ header(name: string, value: number): void }>()
      .header('Retry-After', detail.timeToBlockExpire);
    return super.throwThrottlingException(context, detail);
  }

  emailTracker(value: unknown): string {
    const normalized =
      typeof value === 'string' ? value.trim().toLowerCase() : '';
    return createHmac(
      'sha256',
      this.config.get('security.rateLimitKeySecret', { infer: true }),
    )
      .update(normalized, 'utf8')
      .digest('hex');
  }

  originTracker(request: Record<string, unknown>): string {
    const ip = request.ip;
    return typeof ip === 'string' && ip.length > 0 ? ip : 'unknown-origin';
  }
}
