import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CreateAreaDto } from './dto/create-area.dto';
import { UpdateAreaDto } from './dto/update-area.dto';

@Injectable()
export class AreasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(organizationId: string, actorUserId: string, dto: CreateAreaDto) {
    const existing = await this.prisma.area.findFirst({ where: { organizationId, code: dto.code } });
    if (existing) throw new ConflictException(`Ya existe un área con el código ${dto.code}.`);

    const area = await this.prisma.area.create({
      data: {
        organizationId,
        siteId: dto.siteId,
        code: dto.code,
        name: dto.name,
        floor: dto.floor,
        zone: dto.zone,
        description: dto.description,
      },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'CREATE',
      entity: 'Area',
      entityId: area.id,
      newValue: area,
    });

    return area;
  }

  async findAll(organizationId: string, filters: { search?: string; status?: string; floor?: string; zone?: string }) {
    const where: any = { organizationId, deletedAt: null };
    if (filters.status) where.status = filters.status;
    if (filters.floor) where.floor = filters.floor;
    if (filters.zone) where.zone = filters.zone;
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { code: { contains: filters.search, mode: 'insensitive' } },
      ];
    }
    return this.prisma.area.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { qrCodes: { where: { status: 'ACTIVE' }, take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }

  async findOne(organizationId: string, id: string) {
    const area = await this.prisma.area.findFirst({
      where: { id, organizationId, deletedAt: null },
      include: { qrCodes: { orderBy: { createdAt: 'desc' } } },
    });
    if (!area) throw new NotFoundException('Área no encontrada.');
    return area;
  }

  async update(organizationId: string, actorUserId: string, id: string, dto: UpdateAreaDto) {
    const before = await this.findOne(organizationId, id);
    const area = await this.prisma.area.update({
      where: { id },
      data: {
        code: dto.code,
        name: dto.name,
        floor: dto.floor,
        zone: dto.zone,
        description: dto.description,
      },
    });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'UPDATE',
      entity: 'Area',
      entityId: id,
      previousValue: before,
      newValue: area,
    });

    return area;
  }

  async deactivate(organizationId: string, actorUserId: string, id: string) {
    const before = await this.findOne(organizationId, id);
    const area = await this.prisma.area.update({ where: { id }, data: { status: 'INACTIVE' } });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'DEACTIVATE',
      entity: 'Area',
      entityId: id,
      previousValue: before,
      newValue: area,
    });

    return area;
  }

  async activate(organizationId: string, actorUserId: string, id: string) {
    const before = await this.findOne(organizationId, id);
    const area = await this.prisma.area.update({ where: { id }, data: { status: 'ACTIVE' } });

    await this.audit.record({
      organizationId,
      actorUserId,
      action: 'ACTIVATE',
      entity: 'Area',
      entityId: id,
      previousValue: before,
      newValue: area,
    });

    return area;
  }
}
