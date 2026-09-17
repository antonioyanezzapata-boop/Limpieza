import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

/**
 * The QR payload never carries readable area data (spec #6/#24): it is a
 * deep link that wraps an opaque, unpredictable UUID token the backend
 * resolves server-side. Example: hospital://area/8fc702dd-2b09-422a-...
 */
const QR_SCHEME = 'hospital://area/';

@Injectable()
export class QrCodesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  encodeContent(token: string): string {
    return `${QR_SCHEME}${token}`;
  }

  extractToken(scannedValue: string): string {
    return scannedValue.startsWith(QR_SCHEME) ? scannedValue.slice(QR_SCHEME.length) : scannedValue;
  }

  private async assertAreaExists(organizationId: string, areaId: string) {
    const area = await this.prisma.area.findFirst({ where: { id: areaId, organizationId, deletedAt: null } });
    if (!area) throw new NotFoundException('Área no encontrada.');
    return area;
  }

  /** Generates a new QR for the area. Any previously active QR is revoked. */
  async generate(organizationId: string, actorUserId: string, areaId: string) {
    await this.assertAreaExists(organizationId, areaId);

    const previousActive = await this.prisma.qrCode.findFirst({
      where: { areaId, status: 'ACTIVE' },
    });

    const qr = await this.prisma.$transaction(async (tx) => {
      if (previousActive) {
        await tx.qrCode.update({
          where: { id: previousActive.id },
          data: { status: 'REVOKED', revokedAt: new Date() },
        });
      }
      return tx.qrCode.create({ data: { areaId } });
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: previousActive ? 'REGENERATE_QR' : 'GENERATE_QR',
      entity: 'QrCode',
      entityId: qr.id,
      previousValue: previousActive,
      newValue: qr,
    });

    return { ...qr, content: this.encodeContent(qr.token) };
  }

  async history(organizationId: string, areaId: string) {
    await this.assertAreaExists(organizationId, areaId);
    const qrCodes = await this.prisma.qrCode.findMany({
      where: { areaId },
      orderBy: { createdAt: 'desc' },
    });
    return qrCodes.map((qr) => ({ ...qr, content: this.encodeContent(qr.token) }));
  }

  async renderPng(organizationId: string, qrId: string): Promise<Buffer> {
    const qr = await this.prisma.qrCode.findFirst({
      where: { id: qrId, area: { organizationId } },
    });
    if (!qr) throw new NotFoundException('Código QR no encontrado.');
    return QRCode.toBuffer(this.encodeContent(qr.token), { width: 512, margin: 2 });
  }

  /** Resolves a scanned token to its area, used by the mobile scan screen. */
  async resolve(organizationId: string, scannedValue: string) {
    const token = this.extractToken(scannedValue);
    const qr = await this.prisma.qrCode.findFirst({
      where: { token, area: { organizationId } },
      include: { area: true },
    });

    if (!qr) throw new NotFoundException('Código QR no reconocido.');
    if (qr.status !== 'ACTIVE') {
      throw new BadRequestException('Este código QR ya no es válido. Solicita uno nuevo al administrador.');
    }
    if (qr.area.status !== 'ACTIVE' || qr.area.deletedAt) {
      throw new BadRequestException('Esta área se encuentra inactiva.');
    }

    return {
      qrId: qr.id,
      area: {
        id: qr.area.id,
        code: qr.area.code,
        name: qr.area.name,
        floor: qr.area.floor,
        zone: qr.area.zone,
      },
    };
  }
}
