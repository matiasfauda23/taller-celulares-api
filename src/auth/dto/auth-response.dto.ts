import { ApiProperty } from '@nestjs/swagger';

export class AccountPublicDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Pérez' })
  ownerName!: string;

  @ApiProperty({ example: 'ana@example.com' })
  email!: string;
}

export class WorkshopPublicDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Taller Central' })
  name!: string;

  @ApiProperty({ example: 'Av. Siempre Viva 123' })
  address!: string;
}

export class AuthTokensDto {
  @ApiProperty({ example: '<jwt>' })
  accessToken!: string;

  @ApiProperty({ example: '<jwt>' })
  refreshToken!: string;

  @ApiProperty({ example: 900 })
  accessExpiresIn!: number;

  @ApiProperty({ example: 604800 })
  refreshExpiresIn!: number;
}

export class AuthResponseDto {
  @ApiProperty({ type: AccountPublicDto })
  account!: AccountPublicDto;

  @ApiProperty({ type: WorkshopPublicDto })
  workshop!: WorkshopPublicDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}

export class RefreshResponseDto {
  @ApiProperty({ type: AuthTokensDto })
  tokens!: AuthTokensDto;
}

export class MeResponseDto {
  @ApiProperty({ type: AccountPublicDto })
  account!: AccountPublicDto;

  @ApiProperty({ type: WorkshopPublicDto })
  workshop!: WorkshopPublicDto;
}
