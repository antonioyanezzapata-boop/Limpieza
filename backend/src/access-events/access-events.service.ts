import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { QrCodesService } from '../qr-codes/qr-codes.service';
import { RegisterEventDto } from './dto/register-event.dto';
import { CorrectSessionDto } from './dto/correct-session.dto';

class TooManyRequestsException extends HttpException {
  constructor(message: string) {
    super(message, HttpStatus.TOO_MANY_REQUESTS);
  }
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' });
}

function startOfRange(range: string): Date {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  switch (range) {
    case 'yesterday':
      start.setDate(start.getDate() - 1);
      return start;
    case 'week':
      start.setDate(start.getDate() - start.getDay());
      return start;
    case 'month':
      start.setDate(1);
      return start;
    case 'today':
    default:
      return start;
  }
}

function endOfRange(range: string): Date {
  const end = startOfRange(range);
  if (range === 'yesterday') {
    end.setDate(end.getDate() + 1);
  } else if (range === 'week') {
    end.setDate(end.getDate() + 7);
  } else if (range === 'month') {
    end.setMonth(end.getMonth() + 1);
  } else {
    end.setDate(end.getDate() + 1);
  }
  return end;
}

@Injectable()
export class AccessEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly qrCodes: QrCodesService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Registers an ENTRY or EXIT scan. Implements business rules 1-6 from
   * the spec: no exit without an open entry, no duplicate open entry in
   * the same area, a minimum spacing between registrations to filter
   * accidental double scans, and an authoritative server clock/timezone.
   */
  async register(organizationId: string, userId: string, dto: RegisterEventDto) {
    // Idempotent replay: an offline event synced twice must not duplicate.
    const existing = await this.prisma.accessEvent.findUnique({ where: { clientUuid: dto.clientUuid } });
    if (existing) {
      return this.buildRegistrationResult(existing.id);
    }

    const { qrId, area } = await this.qrCodes.resolve(organizationId, dto.qrToken);

    const user = await this.prisma.user.findFirst({ where: { id: userId, organizationId, deletedAt: null } });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    if (user.status !== 'ACTIVE') throw new ForbiddenException('Tu usuario está inactivo.');

    const minSeconds = this.config.get<number>('minSecondsBetweenRegistrations') ?? 5;
    const lastEvent = await this.prisma.accessEvent.findFirst({
      where: { userId, areaId: area.id },
      orderBy: { serverTimestamp: 'desc' },
    });
    if (lastEvent) {
      const elapsedSeconds = (Date.now() - lastEvent.serverTimestamp.getTime()) / 1000;
      if (elapsedSeconds < minSeconds) {
        throw new TooManyRequestsException(
          'Registro demasiado rápido, espera unos segundos e inténtalo de nuevo.',
        );
      }
    }

    const openSession = await this.prisma.cleaningSession.findFirst({
      where: { userId, areaId: area.id, status: 'OPEN' },
      include: { entryEvent: true },
    });

    if (dto.eventType === 'ENTRY') {
      if (openSession) {
        throw new ConflictException(
          `Ya tienes una entrada activa en ${area.name} desde las ${formatTime(openSession.entryEvent.serverTimestamp)}.`,
        );
      }
    } else if (!openSession) {
      throw new BadRequestException('No existe una entrada activa para esta área.');
    }

    const serverTimestamp = new Date();
    const geolocationEnabled = this.config.get<boolean>('geolocationEnabled');

    const eventId = await this.prisma.$transaction(async (tx) => {
      const event = await tx.accessEvent.create({
        data: {
          organizationId,
          userId,
          areaId: area.id,
          qrId,
          eventType: dto.eventType,
          serverTimestamp,
          deviceTimestamp: dto.deviceTimestamp ? new Date(dto.deviceTimestamp) : undefined,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          deviceId: dto.deviceId,
          latitude: geolocationEnabled ? dto.latitude : undefined,
          longitude: geolocationEnabled ? dto.longitude : undefined,
          observations: dto.observations,
          clientUuid: dto.clientUuid,
        },
      });

      if (dto.eventType === 'ENTRY') {
        await tx.cleaningSession.create({
          data: {
            organizationId,
            userId,
            areaId: area.id,
            entryEventId: event.id,
            startedAt: serverTimestamp,
            status: 'OPEN',
          },
        });
      } else if (openSession) {
        const durationSeconds = Math.round(
          (serverTimestamp.getTime() - openSession.startedAt.getTime()) / 1000,
        );
        await tx.cleaningSession.update({
          where: { id: openSession.id },
          data: {
            exitEventId: event.id,
            finishedAt: serverTimestamp,
            durationSeconds,
            status: 'COMPLETED',
          },
        });
      }

      return event.id;
    });

    await this.prisma.device.upsert({
      where: { userId_deviceIdentifier: { userId, deviceIdentifier: dto.deviceId } },
      create: { userId, deviceIdentifier: dto.deviceId },
      update: { lastSeenAt: new Date() },
    });

    return this.buildRegistrationResult(eventId);
  }

  private async buildRegistrationResult(eventId: string) {
    const event = await this.prisma.accessEvent.findUniqueOrThrow({
      where: { id: eventId },
      include: { area: true },
    });
    const session = await this.prisma.cleaningSession.findFirst({
      where: { OR: [{ entryEventId: eventId }, { exitEventId: eventId }] },
    });
    return { event, session };
  }

  async currentActivity(organizationId: string, userId: string) {
    const sessions = await this.prisma.cleaningSession.findMany({
      where: { organizationId, userId, status: 'OPEN' },
      include: { area: true, entryEvent: true },
      orderBy: { startedAt: 'desc' },
    });
    return sessions.map((s) => ({
      sessionId: s.id,
      area: { id: s.area.id, name: s.area.name, floor: s.area.floor },
      startedAt: s.startedAt,
      elapsedSeconds: Math.round((Date.now() - s.startedAt.getTime()) / 1000),
    }));
  }

  async history(organizationId: string, userId: string, range: string) {
    const from = startOfRange(range);
    const to = endOfRange(range);

    const sessions = await this.prisma.cleaningSession.findMany({
      where: { organizationId, userId, startedAt: { gte: from, lt: to } },
      include: { area: true },
      orderBy: { startedAt: 'desc' },
    });

    const totalSeconds = sessions
      .filter((s) => s.durationSeconds)
      .reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);

    return {
      range,
      sessions: sessions.map((s) => ({
        id: s.id,
        area: { id: s.area.id, name: s.area.name },
        startedAt: s.startedAt,
        finishedAt: s.finishedAt,
        durationSeconds: s.durationSeconds,
        status: s.status,
      })),
      totalSeconds,
    };
  }

  /**
   * Supervisor/admin correction. The original event values stay recoverable
   * through the audit log (previousValue), fulfilling "mantener siempre el
   * registro original" without deleting anything (spec #6 rule 6 / #22).
   */
  async correct(
    organizationId: string,
    actorUserId: string,
    sessionId: string,
    dto: CorrectSessionDto,
  ) {
    const session = await this.prisma.cleaningSession.findFirst({
      where: { id: sessionId, organizationId },
      include: { entryEvent: true, exitEvent: true },
    });
    if (!session) throw new NotFoundException('Sesión de limpieza no encontrada.');

    const previousValue = {
      areaId: session.areaId,
      startedAt: session.startedAt,
      finishedAt: session.finishedAt,
      durationSeconds: session.durationSeconds,
      observations: session.observations,
      entryTimestamp: session.entryEvent.serverTimestamp,
      exitTimestamp: session.exitEvent?.serverTimestamp ?? null,
    };

    const newStartedAt = dto.entryTimestamp ? new Date(dto.entryTimestamp) : session.startedAt;
    const newFinishedAt = dto.exitTimestamp
      ? new Date(dto.exitTimestamp)
      : session.finishedAt;
    const newAreaId = dto.areaId ?? session.areaId;
    const newDurationSeconds = newFinishedAt
      ? Math.round((newFinishedAt.getTime() - newStartedAt.getTime()) / 1000)
      : null;

    if (newDurationSeconds !== null && newDurationSeconds < 0) {
      throw new BadRequestException('La hora de salida no puede ser anterior a la entrada.');
    }

    await this.prisma.$transaction(async (tx) => {
      if (dto.entryTimestamp) {
        await tx.accessEvent.update({
          where: { id: session.entryEventId },
          data: { serverTimestamp: newStartedAt, areaId: newAreaId, status: 'CORRECTED' },
        });
      }
      if (dto.exitTimestamp && session.exitEventId) {
        await tx.accessEvent.update({
          where: { id: session.exitEventId },
          data: { serverTimestamp: newFinishedAt as Date, areaId: newAreaId, status: 'CORRECTED' },
        });
      }
      await tx.cleaningSession.update({
        where: { id: sessionId },
        data: {
          areaId: newAreaId,
          startedAt: newStartedAt,
          finishedAt: newFinishedAt,
          durationSeconds: newDurationSeconds,
          observations: dto.observations ?? session.observations,
          status: 'CORRECTED',
        },
      });
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'CORRECT',
      entity: 'CleaningSession',
      entityId: sessionId,
      previousValue,
      newValue: {
        areaId: newAreaId,
        startedAt: newStartedAt,
        finishedAt: newFinishedAt,
        durationSeconds: newDurationSeconds,
        observations: dto.observations ?? session.observations,
      },
      reason: dto.reason,
    });

    return this.prisma.cleaningSession.findUnique({
      where: { id: sessionId },
      include: { area: true, user: true, entryEvent: true, exitEvent: true },
    });
  }
}
