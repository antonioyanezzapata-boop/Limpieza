import { IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';
import { RoleName } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() identification?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsEnum(RoleName) role?: RoleName;
}
