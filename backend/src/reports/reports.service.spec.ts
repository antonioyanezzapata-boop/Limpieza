import { Test } from '@nestjs/testing';
import * as ExcelJS from 'exceljs';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ReportsService (exportación Excel)', () => {
  let service: ReportsService;
  let prisma: any;

  const session = {
    id: 's1',
    userId: 'u1',
    areaId: 'a1',
    status: 'COMPLETED',
    startedAt: new Date('2026-09-17T08:00:00Z'),
    finishedAt: new Date('2026-09-17T09:00:00Z'),
    durationSeconds: 3600,
    observations: null,
    area: { name: 'Quirófano 01', floor: 'Piso 2', zone: 'Cirugía' },
    user: { employeeCode: 'EMP-001', firstName: 'María', lastName: 'Pérez' },
  };

  beforeEach(async () => {
    prisma = { cleaningSession: { findMany: jest.fn().mockResolvedValue([session]) } };
    const moduleRef = await Test.createTestingModule({
      providers: [ReportsService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(ReportsService);
  });

  it('produce el reporte "Tiempos de limpieza por área" con el resumen esperado', async () => {
    const { rows, summary } = await service.cleaningTimes('org-1', {});
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ area: 'Quirófano 01', nombreUsuario: 'María Pérez', duracion: '1h 0m' });
    expect(summary.totalRegistros).toBe(1);
    expect(summary.totalHorasSegundos).toBe(3600);
  });

  it('genera un archivo XLSX con las 4 hojas requeridas (Resumen, Detalle, Por área, Por empleado)', async () => {
    const buffer = await service.exportExcel('org-1', {});
    expect(buffer.byteLength).toBeGreaterThan(0);

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheetNames = workbook.worksheets.map((s) => s.name);
    expect(sheetNames).toEqual(['Resumen', 'Detalle', 'Por área', 'Por empleado']);

    const detalle = workbook.getWorksheet('Detalle')!;
    expect(detalle.getRow(2).getCell(4).value).toBe('Quirófano 01');
  });

  it('genera un CSV con el detalle de movimientos', async () => {
    const csv = await service.exportCsv('org-1', {});
    expect(csv).toContain('Quirófano 01');
    expect(csv).toContain('EMP-001');
  });
});
