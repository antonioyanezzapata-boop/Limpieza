import { IsOptional, IsString } from 'class-validator';

export class UpdateAreaDto {
  @IsOptional() @IsString() code?: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsString() description?: string;
}
