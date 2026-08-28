import type { INestApplication } from '@nestjs/common';
import { AuthService } from '../../../src/auth/auth.service';
import { TokenService } from '../../../src/auth/token.service';
import { createAuthApp, registerBody } from '../../helpers/auth-app';
import { cleanAuthDatabase } from '../../helpers/auth-database';

describe('logout persistence', () => {
  let app: INestApplication;
  let auth: AuthService;
  beforeAll(async () => {
    app = await createAuthApp();
    auth = app.get(AuthService);
  });
  beforeEach(async () => cleanAuthDatabase(app));
  afterAll(async () => app.close());
  it('is idempotent, preserves access validity and leaves sibling renewable', async () => {
    const one = await auth.register(registerBody());
    const two = await auth.login({
      email: one.account.email,
      password: registerBody().password,
    });
    const identity = await app
      .get(TokenService)
      .verifyAccess(one.tokens.accessToken);
    await auth.logout(identity.sid);
    await auth.logout(identity.sid);
    await expect(
      app.get(TokenService).verifyAccess(one.tokens.accessToken),
    ).resolves.toEqual(identity);
    await expect(auth.refresh(one.tokens.refreshToken)).rejects.toBeDefined();
    await expect(auth.refresh(two.tokens.refreshToken)).resolves.toBeDefined();
  });
});
