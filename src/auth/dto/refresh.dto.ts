import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ example: '<jwt>', writeOnly: true })
  @IsString()
  @IsNotEmpty()
  refreshToken!: string;
}
