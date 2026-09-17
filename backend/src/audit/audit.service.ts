import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditInput {
  organizationId: string;
  actorUserId?: string | null;
  action: string;
  entity: string;
  entityId: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string;
  ipAddress?: string;
  device?: string;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput) {
    return this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId,
        previousValue: input.previousValue as any,
        newValue: input.newValue as any,
        reason: input.reason,
        ipAddress: input.ipAddress,
        device: input.device,
      },
    });
  }

  async findAll(organizationId: string, filters: {
    entity?: string;
    entityId?: string;
    actorUserId?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: number;
    pageSize?: number;
  }) {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : 50;

    const where: any = { organizationId };
    if (filters.entity) where.entity = filters.entity;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorUserId) where.actorUserId = filters.actorUserId;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.createdAt.lte = new Date(filters.dateTo);
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { actor: { select: { firstName: true, lastName: true, employeeCode: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }
}
