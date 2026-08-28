import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = ({ value }: { value: unknown }): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterDto {
  @ApiProperty({ example: 'Ana Pérez', minLength: 2, maxLength: 100 })
  @Transform(trim)
  @IsString()
  @Length(2, 100)
  ownerName!: string;

  @ApiProperty({ example: 'ana@example.com', maxLength: 254 })
  @Transform(normalizeEmail)
  @IsString()
  @MaxLength(254)
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'correct horse battery staple',
    minLength: 12,
    maxLength: 128,
    writeOnly: true,
  })
  @IsString()
  @Length(12, 128)
  password!: string;

  @ApiProperty({ example: 'Taller Central', minLength: 2, maxLength: 120 })
  @Transform(trim)
  @IsString()
  @Length(2, 120)
  workshopName!: string;

  @ApiProperty({
    example: 'Av. Siempre Viva 123',
    minLength: 5,
    maxLength: 200,
  })
  @Transform(trim)
  @IsString()
  @Length(5, 200)
  workshopAddress!: string;
}
