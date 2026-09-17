import { Module } from '@nestjs/common';
import { QrCodesService } from './qr-codes.service';
import { QrCodesController } from './qr-codes.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [QrCodesController],
  providers: [QrCodesService],
  exports: [QrCodesService],
})
export class QrCodesModule {}
