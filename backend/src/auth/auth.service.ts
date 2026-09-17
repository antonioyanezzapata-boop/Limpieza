import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { LoginDto } from './dto/login.dto';
import { SetOfflineCredentialsDto } from './dto/set-offline-credentials.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueTokens(user: {
    id: string;
    organizationId: string;
    role: { name: string };
    employeeCode: string;
  }, deviceId?: string) {
    const payload = {
      sub: user.id,
      organizationId: user.organizationId,
      role: user.role.name,
      employeeCode: user.employeeCode,
    };

    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn'),
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn'),
    });

    const expiresInMs = this.parseExpiryToMs(
      this.config.get<string>('jwt.refreshExpiresIn') ?? '30d',
    );

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashToken(refreshToken),
        deviceId,
        expiresAt: new Date(Date.now() + expiresInMs),
      },
    });

    return { accessToken, refreshToken };
  }

  private parseExpiryToMs(expr: string): number {
    const match = /^(\d+)([smhd])$/.exec(expr.trim());
    if (!match) return 30 * 24 * 60 * 60 * 1000;
    const value = parseInt(match[1], 10);
    const unit = match[2];
    const unitMs = { s: 1000, m: 60000, h: 3600000, d: 86400000 }[unit] ?? 86400000;
    return value * unitMs;
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        deletedAt: null,
        OR: [{ email: dto.emailOrEmployeeCode }, { employeeCode: dto.emailOrEmployeeCode }],
      },
      include: { role: true },
    });

    if (!user) throw new UnauthorizedException('Credenciales inválidas.');
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException('El usuario está inactivo. Contacta al administrador.');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!passwordValid) throw new UnauthorizedException('Credenciales inválidas.');

    const tokens = await this.issueTokens(user, dto.deviceId);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: {
          lastLoginAt: new Date(),
          lastLoginDevice: dto.deviceId,
        },
      }),
      this.prisma.device.upsert({
        where: { userId_deviceIdentifier: { userId: user.id, deviceIdentifier: dto.deviceId } },
        create: {
          userId: user.id,
          deviceIdentifier: dto.deviceId,
          platform: dto.devicePlatform,
        },
        update: { lastSeenAt: new Date(), platform: dto.devicePlatform },
      }),
    ]);

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: user.id,
      action: 'LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: ip,
      device: dto.deviceId,
    });

    return {
      ...tokens,
      user: this.toPublicUser(user),
      hasOfflinePin: Boolean(user.offlinePinHash),
    };
  }

  async refresh(userId: string, presentedRefreshToken: string) {
    const tokenHash = this.hashToken(presentedRefreshToken);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId, tokenHash, revokedAt: null },
    });
    if (!stored || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Sesión expirada, inicia sesión nuevamente.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user || user.status !== 'ACTIVE' || user.deletedAt) {
      throw new ForbiddenException('El usuario ya no tiene acceso.');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(user, stored.deviceId ?? undefined);
    return { ...tokens, user: this.toPublicUser(user) };
  }

  async logout(userId: string, presentedRefreshToken: string) {
    const tokenHash = this.hashToken(presentedRefreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { userId, tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return { success: true };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) throw new UnauthorizedException();
    return this.toPublicUser(user);
  }

  /**
   * Provisions (or rotates) the server-side copy of the offline PIN hash.
   * The mobile app independently hashes and stores the PIN in encrypted
   * local storage for actual offline validation (see mobile/README) - the
   * server copy exists so an admin can revoke offline access remotely
   * (deactivating the user, or calling this again clears the old PIN).
   */
  async setOfflineCredentials(userId: string, dto: SetOfflineCredentialsDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const passwordValid = await argon2.verify(user.passwordHash, dto.currentPassword);
    if (!passwordValid) throw new UnauthorizedException('Contraseña incorrecta.');

    const offlinePinHash = await argon2.hash(dto.pin);
    await this.prisma.user.update({ where: { id: userId }, data: { offlinePinHash } });

    await this.audit.record({
      organizationId: user.organizationId,
      actorUserId: userId,
      action: 'SET_OFFLINE_PIN',
      entity: 'User',
      entityId: userId,
    });

    return { offlinePinHash, employeeCode: user.employeeCode };
  }

  /**
   * Reconciliation call the mobile app makes as soon as connectivity
   * returns after a period authenticated only via the local offline PIN.
   * It confirms the account is still active before the locally-queued
   * ENTRY/EXIT events get synced (see SyncModule).
   */
  async verifyStillActive(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new ForbiddenException('Usuario no encontrado.');
    return { active: user.status === 'ACTIVE' };
  }

  private toPublicUser(user: {
    id: string;
    organizationId: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    email: string;
    role: { name: string };
  }) {
    return {
      id: user.id,
      organizationId: user.organizationId,
      employeeCode: user.employeeCode,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role.name,
    };
  }
}
