import { IsIn, IsOptional, IsString } from 'class-validator';

export class ReportFiltersDto {
  @IsOptional() @IsString() dateFrom?: string;
  @IsOptional() @IsString() dateTo?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsString() areaId?: string;
  @IsOptional() @IsString() floor?: string;
  @IsOptional() @IsString() zone?: string;
  @IsOptional() @IsIn(['OPEN', 'COMPLETED', 'INCONSISTENT', 'CORRECTED']) status?: string;
  @IsOptional() @IsIn(['morning', 'afternoon', 'night']) shift?: string;
  @IsOptional() @IsIn(['xlsx', 'csv', 'pdf']) format?: string;
}
