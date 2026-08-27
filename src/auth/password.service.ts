import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHmac } from 'node:crypto';
import type { AppConfiguration } from '../config/configuration';

@Injectable()
export class PasswordService {
  private readonly pepper: string;
  private readonly rounds: 12;

  constructor(config: ConfigService<AppConfiguration, true>) {
    this.pepper = config.get('security.passwordPepper', { infer: true });
    this.rounds = config.get('security.bcryptRounds', { infer: true });
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(this.prehash(password), this.rounds);
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return bcrypt.compare(this.prehash(password), passwordHash);
  }

  private prehash(password: string): string {
    return createHmac('sha384', this.pepper)
      .update(password, 'utf8')
      .digest('base64');
  }
}
