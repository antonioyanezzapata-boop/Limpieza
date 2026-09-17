import { Test } from '@nestjs/testing';
import { AuditService } from './audit.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuditService (auditoría)', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(async () => {
    prisma = { auditLog: { create: jest.fn().mockResolvedValue({ id: 'log-1' }) } };
    const moduleRef = await Test.createTestingModule({
      providers: [AuditService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AuditService);
  });

  it('registra el valor anterior y nuevo de una corrección con su motivo', async () => {
    await service.record({
      organizationId: 'org-1',
      actorUserId: 'supervisor-1',
      action: 'CORRECT',
      entity: 'CleaningSession',
      entityId: 'session-1',
      previousValue: { exitTimestamp: '2026-09-17T09:00:00Z' },
      newValue: { exitTimestamp: '2026-09-17T09:15:00Z' },
      reason: 'Error de registro reportado por trabajador.',
    });

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'CORRECT',
        entity: 'CleaningSession',
        reason: 'Error de registro reportado por trabajador.',
        previousValue: { exitTimestamp: '2026-09-17T09:00:00Z' },
        newValue: { exitTimestamp: '2026-09-17T09:15:00Z' },
      }),
    });
  });
});
