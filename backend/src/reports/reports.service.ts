import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Parser as CsvParser } from 'json2csv';
import PDFDocument from 'pdfkit';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFiltersDto } from './dto/report-filters.dto';

function getShift(date: Date): 'morning' | 'afternoon' | 'night' {
  const hour = date.getHours();
  if (hour >= 6 && hour < 14) return 'morning';
  if (hour >= 14 && hour < 22) return 'afternoon';
  return 'night';
}

function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** A session older than this and still OPEN is surfaced as INCONSISTENT
 * in reports without mutating the stored record (spec #17). */
const STALE_OPEN_HOURS = 16;

function displayStatus(status: string, startedAt: Date): string {
  if (status === 'OPEN' && Date.now() - startedAt.getTime() > STALE_OPEN_HOURS * 3600 * 1000) {
    return 'INCONSISTENTE';
  }
  return { OPEN: 'ABIERTO', COMPLETED: 'COMPLETADO', INCONSISTENT: 'INCONSISTENTE', CORRECTED: 'CORREGIDO' }[status] ?? status;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  private async querySessions(organizationId: string, filters: ReportFiltersDto) {
    const where: any = { organizationId };
    if (filters.dateFrom || filters.dateTo) {
      where.startedAt = {};
      if (filters.dateFrom) where.startedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.startedAt.lte = new Date(filters.dateTo);
    }
    if (filters.userId) where.userId = filters.userId;
    if (filters.areaId) where.areaId = filters.areaId;
    if (filters.status) where.status = filters.status;
    if (filters.floor || filters.zone) {
      where.area = {};
      if (filters.floor) where.area.floor = filters.floor;
      if (filters.zone) where.area.zone = filters.zone;
    }

    let sessions = await this.prisma.cleaningSession.findMany({
      where,
      include: { area: true, user: true },
      orderBy: { startedAt: 'desc' },
    });

    if (filters.shift) {
      sessions = sessions.filter((s) => getShift(s.startedAt) === filters.shift);
    }

    return sessions;
  }

  async cleaningTimes(organizationId: string, filters: ReportFiltersDto) {
    const sessions = await this.querySessions(organizationId, filters);

    const rows = sessions.map((s) => ({
      fecha: s.startedAt.toISOString().slice(0, 10),
      codigoUsuario: s.user.employeeCode,
      nombreUsuario: `${s.user.firstName} ${s.user.lastName}`,
      area: s.area.name,
      piso: s.area.floor ?? '-',
      zona: s.area.zone ?? '-',
      horaEntrada: s.startedAt.toISOString(),
      horaSalida: s.finishedAt ? s.finishedAt.toISOString() : null,
      duracion: formatDuration(s.durationSeconds),
      duracionSegundos: s.durationSeconds,
      estado: displayStatus(s.status, s.startedAt),
      observacion: s.observations ?? '',
      sessionId: s.id,
    }));

    const summary = {
      totalRegistros: sessions.length,
      totalHorasSegundos: sessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0),
      areasAtendidas: new Set(sessions.map((s) => s.areaId)).size,
      usuariosParticipantes: new Set(sessions.map((s) => s.userId)).size,
      registrosAbiertos: sessions.filter((s) => s.status === 'OPEN').length,
      registrosInconsistentes: sessions.filter((s) => displayStatus(s.status, s.startedAt) === 'INCONSISTENTE').length,
    };

    return { rows, summary };
  }

  async byArea(organizationId: string, filters: ReportFiltersDto) {
    const sessions = await this.querySessions(organizationId, filters);
    const map = new Map<string, { area: string; count: number; totalSeconds: number; lastCleaning: Date | null }>();
    for (const s of sessions) {
      const entry = map.get(s.areaId) ?? { area: s.area.name, count: 0, totalSeconds: 0, lastCleaning: null };
      entry.count += 1;
      entry.totalSeconds += s.durationSeconds ?? 0;
      if (!entry.lastCleaning || s.startedAt > entry.lastCleaning) entry.lastCleaning = s.startedAt;
      map.set(s.areaId, entry);
    }
    return Array.from(map.values()).map((v) => ({
      ...v,
      averageSeconds: v.count ? Math.round(v.totalSeconds / v.count) : 0,
    }));
  }

  async byEmployee(organizationId: string, filters: ReportFiltersDto) {
    const sessions = await this.querySessions(organizationId, filters);
    const map = new Map<string, { employee: string; areas: Set<string>; totalSeconds: number; incomplete: number }>();
    for (const s of sessions) {
      const key = s.userId;
      const entry = map.get(key) ?? {
        employee: `${s.user.firstName} ${s.user.lastName}`,
        areas: new Set<string>(),
        totalSeconds: 0,
        incomplete: 0,
      };
      entry.areas.add(s.areaId);
      entry.totalSeconds += s.durationSeconds ?? 0;
      if (s.status === 'OPEN') entry.incomplete += 1;
      map.set(key, entry);
    }
    return Array.from(map.values()).map((v) => ({
      employee: v.employee,
      areasAttended: v.areas.size,
      totalSeconds: v.totalSeconds,
      averageSeconds: v.areas.size ? Math.round(v.totalSeconds / v.areas.size) : 0,
      incompleteRecords: v.incomplete,
    }));
  }

  async areasWithoutCleaning(organizationId: string, date: string) {
    const day = date ? new Date(date) : new Date();
    const from = new Date(day);
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 1);

    const [areas, sessions] = await Promise.all([
      this.prisma.area.findMany({ where: { organizationId, status: 'ACTIVE', deletedAt: null } }),
      this.prisma.cleaningSession.findMany({
        where: { organizationId, startedAt: { gte: from, lt: to } },
        select: { areaId: true },
      }),
    ]);

    const attended = new Set(sessions.map((s) => s.areaId));
    return areas.map((a) => ({
      areaId: a.id,
      code: a.code,
      name: a.name,
      attended: attended.has(a.id),
    }));
  }

  async exportExcel(organizationId: string, filters: ReportFiltersDto): Promise<ExcelJS.Buffer> {
    const [{ rows, summary }, byArea, byEmployee] = await Promise.all([
      this.cleaningTimes(organizationId, filters),
      this.byArea(organizationId, filters),
      this.byEmployee(organizationId, filters),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Hospital Cleaning Traceability';
    workbook.created = new Date();

    const resumen = workbook.addWorksheet('Resumen');
    resumen.addRows([
      ['Total de registros', summary.totalRegistros],
      ['Total de horas', formatDuration(summary.totalHorasSegundos)],
      ['Áreas atendidas', summary.areasAtendidas],
      ['Usuarios participantes', summary.usuariosParticipantes],
      ['Registros abiertos', summary.registrosAbiertos],
      ['Registros inconsistentes', summary.registrosInconsistentes],
    ]);
    resumen.getColumn(1).width = 30;

    const detalle = workbook.addWorksheet('Detalle');
    detalle.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Código usuario', key: 'codigoUsuario', width: 16 },
      { header: 'Nombre usuario', key: 'nombreUsuario', width: 24 },
      { header: 'Área', key: 'area', width: 20 },
      { header: 'Piso', key: 'piso', width: 10 },
      { header: 'Zona', key: 'zona', width: 12 },
      { header: 'Hora entrada', key: 'horaEntrada', width: 22 },
      { header: 'Hora salida', key: 'horaSalida', width: 22 },
      { header: 'Duración', key: 'duracion', width: 12 },
      { header: 'Estado', key: 'estado', width: 16 },
      { header: 'Observación', key: 'observacion', width: 30 },
    ];
    detalle.addRows(rows);
    detalle.getRow(1).font = { bold: true };

    const areaSheet = workbook.addWorksheet('Por área');
    areaSheet.columns = [
      { header: 'Área', key: 'area', width: 20 },
      { header: 'Número de limpiezas', key: 'count', width: 20 },
      { header: 'Tiempo total', key: 'total', width: 16 },
      { header: 'Promedio', key: 'avg', width: 16 },
    ];
    areaSheet.addRows(
      byArea.map((a) => ({ area: a.area, count: a.count, total: formatDuration(a.totalSeconds), avg: formatDuration(a.averageSeconds) })),
    );
    areaSheet.getRow(1).font = { bold: true };

    const employeeSheet = workbook.addWorksheet('Por empleado');
    employeeSheet.columns = [
      { header: 'Empleado', key: 'employee', width: 24 },
      { header: 'Áreas atendidas', key: 'areas', width: 16 },
      { header: 'Tiempo total', key: 'total', width: 16 },
    ];
    employeeSheet.addRows(
      byEmployee.map((e) => ({ employee: e.employee, areas: e.areasAttended, total: formatDuration(e.totalSeconds) })),
    );
    employeeSheet.getRow(1).font = { bold: true };

    return workbook.xlsx.writeBuffer();
  }

  async exportCsv(organizationId: string, filters: ReportFiltersDto): Promise<string> {
    const { rows } = await this.cleaningTimes(organizationId, filters);
    const parser = new CsvParser({
      fields: ['fecha', 'codigoUsuario', 'nombreUsuario', 'area', 'piso', 'zona', 'horaEntrada', 'horaSalida', 'duracion', 'estado', 'observacion'],
    });
    return parser.parse(rows);
  }

  async exportPdf(organizationId: string, filters: ReportFiltersDto): Promise<Buffer> {
    const { rows, summary } = await this.cleaningTimes(organizationId, filters);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      doc.fontSize(16).text('Tiempos de limpieza por área', { align: 'center' });
      doc.moveDown();
      doc.fontSize(10).text(
        `Total registros: ${summary.totalRegistros}  |  Total horas: ${formatDuration(summary.totalHorasSegundos)}  |  Áreas atendidas: ${summary.areasAtendidas}`,
      );
      doc.moveDown();

      const headers = ['Fecha', 'Usuario', 'Área', 'Entrada', 'Salida', 'Duración', 'Estado'];
      doc.fontSize(9).text(headers.join('   |   '));
      doc.moveDown(0.5);
      rows.slice(0, 500).forEach((r) => {
        doc.text(
          [
            r.fecha,
            r.nombreUsuario,
            r.area,
            new Date(r.horaEntrada).toLocaleTimeString('es-EC'),
            r.horaSalida ? new Date(r.horaSalida).toLocaleTimeString('es-EC') : '-',
            r.duracion,
            r.estado,
          ].join('   |   '),
        );
      });

      doc.end();
    });
  }
}
