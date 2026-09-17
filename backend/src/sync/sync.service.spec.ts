import { Test } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { SyncService } from './sync.service';
import { AccessEventsService } from '../access-events/access-events.service';

describe('SyncService (sincronización offline)', () => {
  let service: SyncService;
  let accessEvents: any;

  beforeEach(async () => {
    accessEvents = { register: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      providers: [SyncService, { provide: AccessEventsService, useValue: accessEvents }],
    }).compile();
    service = moduleRef.get(SyncService);
  });

  it('sincroniza un lote de eventos en orden cronológico', async () => {
    accessEvents.register.mockImplementation(async (_org: string, _user: string, item: any) => ({
      event: { id: `event-${item.clientUuid}` },
    }));

    const results = await service.processBatch('org-1', 'user-1', {
      events: [
        { clientUuid: 'b', deviceTimestamp: '2026-09-17T09:00:00Z', qrToken: 't', eventType: 'EXIT', deviceId: 'd' } as any,
        { clientUuid: 'a', deviceTimestamp: '2026-09-17T08:00:00Z', qrToken: 't', eventType: 'ENTRY', deviceId: 'd' } as any,
      ],
    });

    expect(accessEvents.register.mock.calls[0][2].clientUuid).toBe('a');
    expect(accessEvents.register.mock.calls[1][2].clientUuid).toBe('b');
    expect(results).toEqual([
      { clientUuid: 'a', success: true, eventId: 'event-a' },
      { clientUuid: 'b', success: true, eventId: 'event-b' },
    ]);
  });

  it('reporta el error de un ítem sin detener el resto del lote', async () => {
    accessEvents.register
      .mockRejectedValueOnce(new ConflictException('Ya tienes una entrada activa.'))
      .mockResolvedValueOnce({ event: { id: 'event-2' } });

    const results = await service.processBatch('org-1', 'user-1', {
      events: [
        { clientUuid: 'x', qrToken: 't', eventType: 'ENTRY', deviceId: 'd' } as any,
        { clientUuid: 'y', qrToken: 't', eventType: 'ENTRY', deviceId: 'd' } as any,
      ],
    });

    expect(results[0]).toMatchObject({ clientUuid: 'x', success: false });
    expect(results[1]).toMatchObject({ clientUuid: 'y', success: true, eventId: 'event-2' });
  });
});
