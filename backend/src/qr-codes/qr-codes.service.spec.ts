import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { QrCodesService } from './qr-codes.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('QrCodesService', () => {
  let service: QrCodesService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      qrCode: { findFirst: jest.fn() },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        QrCodesService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(QrCodesService);
  });

  it('resuelve un QR válido perteneciente a un área activa', async () => {
    prisma.qrCode.findFirst.mockResolvedValue({
      id: 'qr-1',
      status: 'ACTIVE',
      area: { id: 'area-1', code: 'QUI-001', name: 'Quirófano 01', status: 'ACTIVE', deletedAt: null },
    });

    const result = await service.resolve('org-1', 'hospital://area/token-abc');
    expect(result.area.name).toBe('Quirófano 01');
  });

  it('rechaza un token de QR inexistente', async () => {
    prisma.qrCode.findFirst.mockResolvedValue(null);
    await expect(service.resolve('org-1', 'hospital://area/no-existe')).rejects.toThrow(NotFoundException);
  });

  it('rechaza un QR revocado', async () => {
    prisma.qrCode.findFirst.mockResolvedValue({
      id: 'qr-1',
      status: 'REVOKED',
      area: { id: 'area-1', status: 'ACTIVE', deletedAt: null },
    });
    await expect(service.resolve('org-1', 'hospital://area/token-abc')).rejects.toThrow(BadRequestException);
  });

  it('rechaza un QR de un área inactiva', async () => {
    prisma.qrCode.findFirst.mockResolvedValue({
      id: 'qr-1',
      status: 'ACTIVE',
      area: { id: 'area-1', status: 'INACTIVE', deletedAt: null },
    });
    await expect(service.resolve('org-1', 'hospital://area/token-abc')).rejects.toThrow(BadRequestException);
  });

  it('extrae el token de un contenido con esquema hospital://area/', () => {
    expect(service.extractToken('hospital://area/abc-123')).toBe('abc-123');
    expect(service.extractToken('abc-123')).toBe('abc-123');
  });
});
