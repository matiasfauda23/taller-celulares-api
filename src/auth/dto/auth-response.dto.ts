export class AccountPublicDto {
  id!: string;
  ownerName!: string;
  email!: string;
}

export class WorkshopPublicDto {
  id!: string;
  name!: string;
  address!: string;
}

export class AuthTokensDto {
  accessToken!: string;
  refreshToken!: string;
  accessExpiresIn!: number;
  refreshExpiresIn!: number;
}

export class AuthResponseDto {
  account!: AccountPublicDto;
  workshop!: WorkshopPublicDto;
  tokens!: AuthTokensDto;
}
