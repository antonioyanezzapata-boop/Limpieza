/**
 * End-to-end test for the success criteria described in the spec
 * (section 40): María logs in, scans Quirófano 01, registers ENTRY,
 * scans again and registers EXIT, the duration is computed automatically,
 * and a supervisor sees it as COMPLETED and exports it to Excel.
 *
 * Requires a real PostgreSQL database migrated and seeded:
 *   DATABASE_URL=... npx prisma migrate deploy && npx prisma db seed
 *   DATABASE_URL=... npm run test:e2e
 *
 * Skipped automatically when DATABASE_URL is not set (e.g. in an
 * environment with no Postgres available), so `npm test` (unit tests)
 * always runs standalone.
 */
import { Test } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Golden path: entrada -> salida -> reporte -> export (e2e)', () => {
  let app: INestApplication;
  let mariaToken: string;
  let supervisorToken: string;
  let areaQrContent: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    app.setGlobalPrefix('api/v1');
    await app.init();

    const mariaLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      emailOrEmployeeCode: 'maria@hospital.local',
      password: process.env.SEED_STAFF_PASSWORD ?? 'Staff123!',
      deviceId: 'e2e-device',
    });
    mariaToken = mariaLogin.body.accessToken;

    const supervisorLogin = await request(app.getHttpServer()).post('/api/v1/auth/login').send({
      emailOrEmployeeCode: 'supervisor@hospital.local',
      password: process.env.SEED_SUPERVISOR_PASSWORD ?? 'Supervisor123!',
      deviceId: 'e2e-device-2',
    });
    supervisorToken = supervisorLogin.body.accessToken;

    const areas = await request(app.getHttpServer())
      .get('/api/v1/areas?search=Quirófano 01')
      .set('Authorization', `Bearer ${supervisorToken}`);
    const area = areas.body[0];
    const qrHistory = await request(app.getHttpServer())
      .get(`/api/v1/areas/${area.id}/qr-codes`)
      .set('Authorization', `Bearer ${supervisorToken}`);
    areaQrContent = qrHistory.body[0].content;
  });

  afterAll(async () => {
    await app.close();
  });

  it('registra entrada, salida, calcula la duración y aparece COMPLETADO en el reporte', async () => {
    const entry = await request(app.getHttpServer())
      .post('/api/v1/access-events')
      .set('Authorization', `Bearer ${mariaToken}`)
      .send({
        qrToken: areaQrContent,
        eventType: 'ENTRY',
        deviceId: 'e2e-device',
        clientUuid: `e2e-entry-${Date.now()}`,
      });
    expect(entry.status).toBe(201);

    const exit = await request(app.getHttpServer())
      .post('/api/v1/access-events')
      .set('Authorization', `Bearer ${mariaToken}`)
      .send({
        qrToken: areaQrContent,
        eventType: 'EXIT',
        deviceId: 'e2e-device',
        clientUuid: `e2e-exit-${Date.now()}`,
      });
    expect(exit.status).toBe(201);
    expect(exit.body.session.status).toBe('COMPLETED');
    expect(exit.body.session.durationSeconds).toBeGreaterThanOrEqual(0);

    const report = await request(app.getHttpServer())
      .get('/api/v1/reports/cleaning-times')
      .set('Authorization', `Bearer ${supervisorToken}`);
    const row = report.body.rows.find((r: any) => r.sessionId === exit.body.session.id);
    expect(row.estado).toBe('COMPLETADO');

    const exportRes = await request(app.getHttpServer())
      .get('/api/v1/reports/cleaning-times/export?format=xlsx')
      .set('Authorization', `Bearer ${supervisorToken}`);
    expect(exportRes.status).toBe(200);
    expect(exportRes.headers['content-type']).toContain('spreadsheetml');
  });
});
