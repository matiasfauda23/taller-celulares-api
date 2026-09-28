import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  MeResponseDto,
  RefreshResponseDto,
} from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAccessGuard } from './guards/jwt-access.guard';
import type { TokenIdentity } from './token.service';

type AuthenticatedRequest = Request & { user: TokenIdentity };

const publicErrorExample = (
  statusCode: number,
  code: string,
  path: string,
) => ({
  statusCode,
  code,
  message: code.replaceAll('_', ' ').toLowerCase(),
  path,
});

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register an account and workshop' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({
    example: publicErrorExample(
      409,
      'EMAIL_ALREADY_REGISTERED',
      '/auth/register',
    ),
  })
  @ApiResponse({ status: 400, description: 'Request validation failed' })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  register(@Body() input: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(input);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Create an independent session' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    example: publicErrorExample(401, 'INVALID_CREDENTIALS', '/auth/login'),
  })
  @ApiResponse({ status: 400, description: 'Request validation failed' })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  login(@Body() input: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(input);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh credential' })
  @ApiOkResponse({ type: RefreshResponseDto })
  @ApiUnauthorizedResponse({
    example: publicErrorExample(401, 'INVALID_REFRESH_TOKEN', '/auth/refresh'),
  })
  @ApiResponse({ status: 400, description: 'Request validation failed' })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  refresh(@Body() input: RefreshDto): Promise<RefreshResponseDto> {
    return this.auth.refresh(input.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAccessGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke the current session' })
  @ApiNoContentResponse({ description: 'Session revoked or already revoked' })
  @ApiUnauthorizedResponse({
    example: publicErrorExample(401, 'AUTHENTICATION_REQUIRED', '/auth/logout'),
  })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.auth.logout(request.user.sid);
  }

  @Get('me')
  @UseGuards(JwtAccessGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the authenticated public profile' })
  @ApiOkResponse({ type: MeResponseDto })
  @ApiUnauthorizedResponse({
    example: publicErrorExample(401, 'AUTHENTICATION_REQUIRED', '/auth/me'),
  })
  @ApiResponse({ status: 429, description: 'Rate limited' })
  me(@Req() request: AuthenticatedRequest): Promise<MeResponseDto> {
    return this.auth.me(request.user.sub);
  }
}
