import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
export class CreateDeviceDto {
  @ApiProperty({ format: 'uuid' }) @IsUUID() clientId!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) brand!: string;
  @ApiProperty() @IsString() @MinLength(1) @MaxLength(100) model!: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(60)
  color?: string;
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  physicalCondition!: string;
}
