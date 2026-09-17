import { IsIn, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  emailOrEmployeeCode: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsOptional()
  @IsIn(['android', 'ios', 'web'])
  devicePlatform?: string;
}
