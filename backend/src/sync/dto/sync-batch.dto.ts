import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { RegisterEventDto } from '../../access-events/dto/register-event.dto';

export class SyncBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @ValidateNested({ each: true })
  @Type(() => RegisterEventDto)
  events: RegisterEventDto[];
}
