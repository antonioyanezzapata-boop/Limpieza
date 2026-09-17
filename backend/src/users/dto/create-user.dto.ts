import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { RoleName } from '@prisma/client';

export class CreateUserDto {
  @IsString() @IsNotEmpty() firstName: string;
  @IsString() @IsNotEmpty() lastName: string;
  @IsString() @IsNotEmpty() identification: string;
  @IsString() @IsNotEmpty() employeeCode: string;
  @IsEmail() email: string;
  @IsOptional() @IsString() phone?: string;
  @IsEnum(RoleName) role: RoleName;
  @IsString() @MinLength(8) password: string;
}
