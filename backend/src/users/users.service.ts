import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  private select = {
    id: true,
    employeeCode: true,
    firstName: true,
    lastName: true,
    identification: true,
    email: true,
    phone: true,
    status: true,
    lastLoginAt: true,
    lastLoginDevice: true,
    createdAt: true,
    updatedAt: true,
    role: { select: { name: true } },
  } as const;

  private async getRoleId(organizationId: string, roleName: string) {
    const role = await this.prisma.role.findFirst({
      where: { OR: [{ organizationId }, { organizationId: null }], name: roleName as any },
    });
    if (!role) throw new NotFoundException(`Rol ${roleName} no configurado.`);
    return role.id;
  }

  async create(organizationId: string, actorUserId: string, dto: CreateUserDto) {
    const existing = await this.prisma.user.findFirst({
      where: {
        organizationId,
        OR: [{ email: dto.email }, { employeeCode: dto.employeeCode }],
      },
    });
    if (existing) throw new ConflictException('Ya existe un usuario con ese correo o código de empleado.');

    const roleId = await this.getRoleId(organizationId, dto.role);
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        organizationId,
        firstName: dto.firstName,
        lastName: dto.lastName,
        identification: dto.identification,
        employeeCode: dto.employeeCode,
        email: dto.email,
        phone: dto.phone,
        roleId,
        passwordHash,
      },
      select: this.select,
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'CREATE',
      entity: 'User',
      entityId: user.id,
      newValue: user,
    });

    return user;
  }

  async findAll(organizationId: string, filters: { search?: string; status?: string; role?: string }) {
    const where: any = { organizationId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.role) where.role = { name: filters.role };
    if (filters.search) {
      where.OR = [
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { employeeCode: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.user.findMany({ where, select: this.select, orderBy: { firstName: 'asc' } });
  }

  async findOne(organizationId: string, id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, organizationId, deletedAt: null },
      select: this.select,
    });
    if (!user) throw new NotFoundException('Usuario no encontrado.');
    return user;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateUserDto) {
    const before = await this.findOne(organizationId, id);

    const data: any = {
      firstName: dto.firstName,
      lastName: dto.lastName,
      identification: dto.identification,
      email: dto.email,
      phone: dto.phone,
    };
    if (dto.role) data.roleId = await this.getRoleId(organizationId, dto.role);

    const user = await this.prisma.user.update({ where: { id }, data, select: this.select });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'UPDATE',
      entity: 'User',
      entityId: id,
      previousValue: before,
      newValue: user,
    });

    return user;
  }

  async deactivate(organizationId: string, actorUserId: string, id: string) {
    const before = await this.findOne(organizationId, id);
    // Logical delete only - spec forbids hard-deleting users with movements.
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'INACTIVE' },
      select: this.select,
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'DEACTIVATE',
      entity: 'User',
      entityId: id,
      previousValue: before,
      newValue: user,
    });

    return user;
  }

  async activate(organizationId: string, actorUserId: string, id: string) {
    const before = await this.findOne(organizationId, id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: 'ACTIVE' },
      select: this.select,
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'ACTIVATE',
      entity: 'User',
      entityId: id,
      previousValue: before,
      newValue: user,
    });

    return user;
  }

  async resetPassword(organizationId: string, actorUserId: string, id: string, newPassword: string) {
    await this.findOne(organizationId, id);
    const passwordHash = await argon2.hash(newPassword);
    await this.prisma.user.update({ where: { id }, data: { passwordHash, offlinePinHash: null } });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'RESET_PASSWORD',
      entity: 'User',
      entityId: id,
    });

    return { success: true };
  }
}
