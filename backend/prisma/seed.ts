import { PrismaClient, RoleName } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const organization = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Hospital Demo',
    },
  });

  const site = await prisma.site.create({
    data: { organizationId: organization.id, name: 'Sede Central' },
  });

  const roles = await Promise.all(
    [RoleName.ADMIN, RoleName.SUPERVISOR, RoleName.CLEANING_STAFF].map((name) =>
      prisma.role.upsert({
        where: { organizationId_name: { organizationId: organization.id, name } },
        update: {},
        create: { organizationId: organization.id, name },
      }),
    ),
  );
  const roleByName = Object.fromEntries(roles.map((r) => [r.name, r]));

  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin123!';
  const supervisorPassword = process.env.SEED_SUPERVISOR_PASSWORD ?? 'Supervisor123!';
  const staffPassword = process.env.SEED_STAFF_PASSWORD ?? 'Staff123!';
  const offlinePin = process.env.SEED_OFFLINE_PIN ?? '1234';
  const offlinePinHash = await argon2.hash(offlinePin);

  const admin = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'admin@hospital.local' } },
    update: {},
    create: {
      organizationId: organization.id,
      employeeCode: 'ADM-001',
      firstName: 'Ana',
      lastName: 'Administradora',
      identification: '0000000001',
      email: 'admin@hospital.local',
      roleId: roleByName.ADMIN.id,
      passwordHash: await argon2.hash(adminPassword),
    },
  });

  const supervisor = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'supervisor@hospital.local' } },
    update: {},
    create: {
      organizationId: organization.id,
      employeeCode: 'SUP-001',
      firstName: 'Juan',
      lastName: 'Supervisor',
      identification: '0000000002',
      email: 'supervisor@hospital.local',
      roleId: roleByName.SUPERVISOR.id,
      passwordHash: await argon2.hash(supervisorPassword),
    },
  });

  const maria = await prisma.user.upsert({
    where: { organizationId_email: { organizationId: organization.id, email: 'maria@hospital.local' } },
    update: {},
    create: {
      organizationId: organization.id,
      employeeCode: 'EMP-001',
      firstName: 'María',
      lastName: 'Pérez',
      identification: '0000000003',
      email: 'maria@hospital.local',
      roleId: roleByName.CLEANING_STAFF.id,
      passwordHash: await argon2.hash(staffPassword),
      offlinePinHash,
    },
  });

  const areasData = [
    { code: 'QUI-001', name: 'Quirófano 01', floor: 'Piso 2', zone: 'Cirugía' },
    { code: 'QUI-002', name: 'Quirófano 02', floor: 'Piso 2', zone: 'Cirugía' },
    { code: 'UCI-001', name: 'UCI', floor: 'Piso 3', zone: 'Cuidados Intensivos' },
    { code: 'EME-001', name: 'Emergencia', floor: 'Piso 1', zone: 'Urgencias' },
    { code: 'HOS-201', name: 'Habitación 201', floor: 'Piso 2', zone: 'Hospitalización' },
  ];

  for (const data of areasData) {
    const area = await prisma.area.upsert({
      where: { organizationId_code: { organizationId: organization.id, code: data.code } },
      update: {},
      create: { organizationId: organization.id, siteId: site.id, ...data },
    });

    const existingQr = await prisma.qrCode.findFirst({ where: { areaId: area.id, status: 'ACTIVE' } });
    if (!existingQr) {
      await prisma.qrCode.create({ data: { areaId: area.id } });
    }
  }

  // eslint-disable-next-line no-console
  console.log('Seed completed:', {
    organization: organization.name,
    admin: admin.email,
    supervisor: supervisor.email,
    staff: maria.email,
    offlinePin,
    areas: areasData.map((a) => a.code),
  });
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
