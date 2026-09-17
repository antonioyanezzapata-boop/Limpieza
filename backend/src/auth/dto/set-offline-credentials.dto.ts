import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class SetOfflineCredentialsDto {
  @IsString()
  @MinLength(6)
  currentPassword: string;

  @IsString()
  @Matches(/^\d{4,6}$/, { message: 'El PIN debe tener entre 4 y 6 dígitos numéricos.' })
  pin: string;
}
