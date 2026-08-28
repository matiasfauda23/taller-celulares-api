import type { INestApplication } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { configureApplication } from '../../src/main';

export const registerBody = (email = 'ana@example.com') => ({
  ownerName: 'Ana Pérez',
  email,
  password: 'correct horse battery staple',
  workshopName: 'Taller Central',
  workshopAddress: 'Main Street 123',
});

export async function createAuthApp(): Promise<INestApplication> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();
  const app = module.createNestApplication<NestExpressApplication>();
  configureApplication(app);
  await app.init();
  return app;
}
