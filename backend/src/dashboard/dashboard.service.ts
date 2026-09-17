import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(organizationId: string) {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const todaySessions = await this.prisma.cleaningSession.findMany({
      where: { organizationId, startedAt: { gte: startOfDay, lt: endOfDay } },
      include: { area: true, user: true },
    });

    const activeStaffToday = new Set(todaySessions.map((s) => s.userId)).size;
    const areasAttendedToday = new Set(todaySessions.map((s) => s.areaId)).size;
    const completed = todaySessions.filter((s) => s.status === 'COMPLETED');
    const open = todaySessions.filter((s) => s.status === 'OPEN');
    const totalSeconds = completed.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0);
    const averagePerArea = areasAttendedToday ? Math.round(totalSeconds / areasAttendedToday) : 0;

    const sevenDaysAgo = new Date(startOfDay);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    const lastWeekSessions = await this.prisma.cleaningSession.findMany({
      where: { organizationId, startedAt: { gte: sevenDaysAgo } },
      include: { area: true, user: true },
    });

    const cleaningsByArea = new Map<string, number>();
    const timeByArea = new Map<string, number>();
    const timeByUser = new Map<string, number>();
    const cleaningsByDay = new Map<string, number>();

    for (const s of lastWeekSessions) {
      cleaningsByArea.set(s.area.name, (cleaningsByArea.get(s.area.name) ?? 0) + 1);
      timeByArea.set(s.area.name, (timeByArea.get(s.area.name) ?? 0) + (s.durationSeconds ?? 0));
      const userName = `${s.user.firstName} ${s.user.lastName}`;
      timeByUser.set(userName, (timeByUser.get(userName) ?? 0) + (s.durationSeconds ?? 0));
      const day = s.startedAt.toISOString().slice(0, 10);
      cleaningsByDay.set(day, (cleaningsByDay.get(day) ?? 0) + 1);
    }

    return {
      kpis: {
        activeStaffToday,
        areasAttendedToday,
        cleaningsCompletedToday: completed.length,
        openRecords: open.length,
        incompleteRecords: open.length,
        averageSecondsPerArea: averagePerArea,
        totalSecondsToday: totalSeconds,
      },
      charts: {
        cleaningsByArea: Array.from(cleaningsByArea, ([label, value]) => ({ label, value })),
        timeByArea: Array.from(timeByArea, ([label, value]) => ({ label, value })),
        cleaningsByDay: Array.from(cleaningsByDay, ([label, value]) => ({ label, value })).sort((a, b) =>
          a.label.localeCompare(b.label),
        ),
        timeByUser: Array.from(timeByUser, ([label, value]) => ({ label, value })),
      },
      incompleteSessions: open.map((s) => ({
        id: s.id,
        area: s.area.name,
        user: `${s.user.firstName} ${s.user.lastName}`,
        startedAt: s.startedAt,
      })),
    };
  }
}
