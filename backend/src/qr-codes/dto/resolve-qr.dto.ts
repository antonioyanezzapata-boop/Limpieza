import { IsNotEmpty, IsString } from 'class-validator';

export class ResolveQrDto {
  @IsString()
  @IsNotEmpty()
  token: string;
}
