import { Module } from '@nestjs/common';
import { AccessEventsService } from './access-events.service';
import { AccessEventsController } from './access-events.controller';
import { AuditModule } from '../audit/audit.module';
import { QrCodesModule } from '../qr-codes/qr-codes.module';

@Module({
  imports: [AuditModule, QrCodesModule],
  controllers: [AccessEventsController],
  providers: [AccessEventsService],
  exports: [AccessEventsService],
})
export class AccessEventsModule {}
