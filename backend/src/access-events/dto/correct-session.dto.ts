import { IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CorrectSessionDto {
  @IsOptional()
  @IsISO8601()
  entryTimestamp?: string;

  @IsOptional()
  @IsISO8601()
  exitTimestamp?: string;

  @IsOptional()
  @IsString()
  areaId?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsString()
  @IsNotEmpty({ message: 'El motivo de modificación es obligatorio.' })
  reason: string;
}
