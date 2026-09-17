import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAreaDto {
  @IsString() @IsNotEmpty() code: string;
  @IsString() @IsNotEmpty() name: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() siteId?: string;
}
