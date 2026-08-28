import type { Request } from 'express';
import type { TokenIdentity } from '../auth/token.service';
export type AuthenticatedRequest = Request & { user: TokenIdentity };
