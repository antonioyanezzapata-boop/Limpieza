import { HttpException, Injectable } from '@nestjs/common';
import { AccessEventsService } from '../access-events/access-events.service';
import { SyncBatchDto } from './dto/sync-batch.dto';

export interface SyncItemResult {
  clientUuid: string;
  success: boolean;
  eventId?: string;
  error?: string;
}

@Injectable()
export class SyncService {
  constructor(private readonly accessEvents: AccessEventsService) {}

  /**
   * Processes the mobile app's offline queue. Each item is registered
   * through the exact same path as a live scan, so business rules 1-6
   * apply identically; clientUuid makes replays of an already-synced item
   * a no-op instead of a duplicate record (spec #23 "protección contra
   * duplicados"). Ordered sequentially (not Promise.all) so entry/exit
   * pairs captured offline are applied in the order they happened.
   */
  async processBatch(organizationId: string, userId: string, dto: SyncBatchDto): Promise<SyncItemResult[]> {
    const sorted = [...dto.events].sort((a, b) => {
      const dateA = a.deviceTimestamp ? new Date(a.deviceTimestamp).getTime() : 0;
      const dateB = b.deviceTimestamp ? new Date(b.deviceTimestamp).getTime() : 0;
      return dateA - dateB;
    });

    const results: SyncItemResult[] = [];
    for (const item of sorted) {
      try {
        const { event } = await this.accessEvents.register(organizationId, userId, item);
        results.push({ clientUuid: item.clientUuid, success: true, eventId: event.id });
      } catch (error) {
        const message = error instanceof HttpException ? error.message : 'Error al sincronizar el registro.';
        results.push({ clientUuid: item.clientUuid, success: false, error: message });
      }
    }
    return results;
  }
}
