import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AccountsModule } from '../accounts/accounts.module';
import { WorkshopsModule } from '../workshops/workshops.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import { AuthResponseMapper } from './mappers/auth-response.mapper';
import { PasswordService } from './password.service';
import { SessionService } from './session.service';
import { JwtAccessStrategy } from './strategies/jwt-access.strategy';
import { TokenService } from './token.service';

@Module({
  imports: [
    JwtModule.register({}),
    PassportModule.register({ defaultStrategy: 'jwt-access' }),
    AccountsModule,
    WorkshopsModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    AuthResponseMapper,
    JwtAccessStrategy,
    JwtAccessGuard,
  ],
  exports: [AuthService, PasswordService, TokenService, SessionService],
})
export class AuthModule {}
