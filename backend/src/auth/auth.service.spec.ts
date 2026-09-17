import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  const role = { name: 'CLEANING_STAFF' };

  beforeEach(async () => {
    prisma = {
      user: { findFirst: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      device: { upsert: jest.fn() },
      refreshToken: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
      $transaction: jest.fn(async (ops: any[]) => Promise.all(ops)),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: { signAsync: jest.fn().mockResolvedValue('signed-token') } },
        {
          provide: ConfigService,
          useValue: { get: (key: string) => ({ 'jwt.accessExpiresIn': '15m', 'jwt.refreshExpiresIn': '30d' }[key] ?? 'secret') },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('inicia sesión con credenciales válidas', async () => {
    const passwordHash = await argon2.hash('Secret123');
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      organizationId: 'org-1',
      employeeCode: 'EMP-001',
      firstName: 'María',
      lastName: 'Pérez',
      email: 'maria@hospital.local',
      status: 'ACTIVE',
      passwordHash,
      role,
    });

    const result = await service.login({
      emailOrEmployeeCode: 'maria@hospital.local',
      password: 'Secret123',
      deviceId: 'device-1',
    } as any);

    expect(result.accessToken).toBe('signed-token');
    expect(result.user.email).toBe('maria@hospital.local');
  });

  it('rechaza credenciales inválidas', async () => {
    const passwordHash = await argon2.hash('Secret123');
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      organizationId: 'org-1',
      status: 'ACTIVE',
      passwordHash,
      role,
    });

    await expect(
      service.login({ emailOrEmployeeCode: 'maria@hospital.local', password: 'wrong', deviceId: 'd1' } as any),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rechaza el inicio de sesión de un usuario inactivo', async () => {
    prisma.user.findFirst.mockResolvedValue({
      id: 'u1',
      organizationId: 'org-1',
      status: 'INACTIVE',
      passwordHash: 'hash',
      role,
    });

    await expect(
      service.login({ emailOrEmployeeCode: 'maria@hospital.local', password: 'Secret123', deviceId: 'd1' } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});
