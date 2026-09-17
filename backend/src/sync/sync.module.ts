import { Module } from '@nestjs/common';
import { SyncService } from './sync.service';
import { SyncController } from './sync.controller';
import { AccessEventsModule } from '../access-events/access-events.module';

@Module({
  imports: [AccessEventsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
