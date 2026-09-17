import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SyncService } from './sync.service';
import { SyncBatchDto } from './dto/sync-batch.dto';

@Controller('sync')
@UseGuards(JwtAuthGuard)
export class SyncController {
  constructor(private readonly syncService: SyncService) {}

  @Post('batch')
  processBatch(@CurrentUser() user: AuthenticatedUser, @Body() dto: SyncBatchDto) {
    return this.syncService.processBatch(user.organizationId, user.userId, dto);
  }
}
