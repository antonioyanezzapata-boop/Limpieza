import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { AccessEventsService } from './access-events.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';

describe('AccessEventsService', () => {
  let service: AccessEventsService;
  let prisma: any;
  let qrCodes: any;

  const organizationId = 'org-1';
  const userId = 'user-1';
  const areaId = 'area-1';
  const qrId = 'qr-1';

  const activeUser = { id: userId, organizationId, status: 'ACTIVE', deletedAt: null };

  const makeTx = () => ({
    accessEvent: { create: jest.fn().mockResolvedValue({ id: 'event-1' }) },
    cleaningSession: { create: jest.fn(), update: jest.fn() },
  });

  beforeEach(async () => {
    prisma = {
      accessEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 'event-1', area: { name: 'Quirófano 01' } }),
      },
      user: { findFirst: jest.fn().mockResolvedValue(activeUser) },
      cleaningSession: { findFirst: jest.fn().mockResolvedValue(null), findUnique: jest.fn() },
      device: { upsert: jest.fn() },
      $transaction: jest.fn(async (cb) => cb(makeTx())),
    };

    qrCodes = {
      resolve: jest.fn().mockResolvedValue({ qrId, area: { id: areaId, name: 'Quirófano 01' } }),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AccessEventsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: QrCodesService, useValue: qrCodes },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'minSecondsBetweenRegistrations' ? 5 : false) },
        },
      ],
    }).compile();

    service = moduleRef.get(AccessEventsService);
  });

  it('registra una ENTRADA válida cuando no hay sesión abierta', async () => {
    const result = await service.register(organizationId, userId, {
      qrToken: 'hospital://area/token-1',
      eventType: 'ENTRY' as any,
      deviceId: 'device-1',
      clientUuid: 'uuid-1',
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.event.id).toBe('event-1');
  });

  it('rechaza una SALIDA sin entrada activa (regla 1)', async () => {
    prisma.cleaningSession.findFirst.mockResolvedValue(null);

    await expect(
      service.register(organizationId, userId, {
        qrToken: 'hospital://area/token-1',
        eventType: 'EXIT' as any,
        deviceId: 'device-1',
        clientUuid: 'uuid-2',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('rechaza una ENTRADA duplicada en la misma área (regla 2)', async () => {
    prisma.cleaningSession.findFirst.mockResolvedValue({
      id: 'session-1',
      entryEvent: { serverTimestamp: new Date() },
    });

    await expect(
      service.register(organizationId, userId, {
        qrToken: 'hospital://area/token-1',
        eventType: 'ENTRY' as any,
        deviceId: 'device-1',
        clientUuid: 'uuid-3',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('registra una SALIDA válida y calcula la duración', async () => {
    const startedAt = new Date(Date.now() - 60 * 60 * 1000);
    prisma.cleaningSession.findFirst.mockResolvedValue({
      id: 'session-1',
      startedAt,
      entryEvent: { serverTimestamp: startedAt },
    });

    const tx = makeTx();
    prisma.$transaction.mockImplementation(async (cb: any) => cb(tx));

    await service.register(organizationId, userId, {
      qrToken: 'hospital://area/token-1',
      eventType: 'EXIT' as any,
      deviceId: 'device-1',
      clientUuid: 'uuid-4',
    });

    expect(tx.cleaningSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({ status: 'COMPLETED' }),
      }),
    );
  });

  it('rechaza el registro si el usuario está inactivo', async () => {
    prisma.user.findFirst.mockResolvedValue({ ...activeUser, status: 'INACTIVE' });

    await expect(
      service.register(organizationId, userId, {
        qrToken: 'hospital://area/token-1',
        eventType: 'ENTRY' as any,
        deviceId: 'device-1',
        clientUuid: 'uuid-5',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('es idempotente ante un registro ya sincronizado (offline replay)', async () => {
    prisma.accessEvent.findUnique.mockResolvedValue({ id: 'event-existing' });
    prisma.accessEvent.findUniqueOrThrow.mockResolvedValue({ id: 'event-existing', area: {} });

    const result = await service.register(organizationId, userId, {
      qrToken: 'hospital://area/token-1',
      eventType: 'ENTRY' as any,
      deviceId: 'device-1',
      clientUuid: 'uuid-already-synced',
    });

    expect(qrCodes.resolve).not.toHaveBeenCalled();
    expect(result.event.id).toBe('event-existing');
  });
});
