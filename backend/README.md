# Backend — Control y trazabilidad de limpieza hospitalaria

API REST (NestJS + Prisma + PostgreSQL) que soporta el registro de
entradas/salidas por QR, gestión de usuarios y áreas, reportes con
exportación y auditoría, según el MVP descrito en la raíz del repositorio.

## Stack

- NestJS 10 + TypeScript
- Prisma 5 + PostgreSQL
- JWT (access + refresh) con `passport-jwt`, contraseñas con Argon2
- `exceljs` / `json2csv` / `pdfkit` para exportación de reportes
- `qrcode` para generar los PNG de los QR
- Jest para pruebas unitarias y e2e

## Puesta en marcha

```bash
cp .env.example .env
npm install
npm run prisma:migrate     # crea las tablas
npm run prisma:seed        # organización, roles, usuarios y áreas demo
npm run start:dev
```

La API queda expuesta en `http://localhost:3000/api/v1`.

### Con Docker

Ver `docker-compose.yml` en la raíz del repositorio: levanta Postgres + este
backend con un solo comando (`docker compose up`).

## Usuarios y áreas de prueba (`prisma/seed.ts`)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@hospital.local | `Admin123!` (o `SEED_ADMIN_PASSWORD`) |
| Supervisor | supervisor@hospital.local | `Supervisor123!` |
| Personal de limpieza | maria@hospital.local | `Staff123!` (PIN offline demo: `1234`) |

Áreas: `QUI-001` Quirófano 01, `QUI-002` Quirófano 02, `UCI-001` UCI,
`EME-001` Emergencia, `HOS-201` Habitación 201 — cada una con un QR activo
generado automáticamente por el seed.

## Módulos principales

| Módulo | Responsabilidad |
|---|---|
| `auth` | Login, refresh tokens, `POST /auth/offline-credentials` (PIN offline) |
| `users` | CRUD de usuarios, borrado lógico, reseteo de contraseña |
| `areas` | CRUD de áreas, borrado lógico |
| `qr-codes` | Generar/regenerar QR (token opaco, no predecible), descarga PNG, resolución de token |
| `access-events` | Registro de ENTRADA/SALIDA, reglas de negocio 1-6, corrección con auditoría |
| `sync` | `POST /sync/batch` — sincronización idempotente de la cola offline del móvil |
| `reports` | Reporte "Tiempos de limpieza por área", por área/empleado, áreas sin atender, export XLSX/CSV/PDF |
| `dashboard` | KPIs e indicadores para gráficos del panel administrativo |
| `audit` | Bitácora de auditoría (`GET /audit-logs`) |

## Reglas de negocio implementadas (`AccessEventsService.register`)

1. No se permite una `EXIT` sin una `ENTRY` abierta en la misma área.
2. No se permite una segunda `ENTRY` abierta en la misma área para el mismo usuario.
3. Se exige un mínimo de segundos (`MIN_SECONDS_BETWEEN_REGISTRATIONS`, 5s por defecto) entre dos registros del mismo usuario+área, para filtrar doble lectura de QR.
4. La hora del registro (`serverTimestamp`) siempre proviene del reloj del servidor; `deviceTimestamp` se guarda solo como referencia.
5. Se guarda la zona horaria del servidor en cada evento.
6. Nunca se eliminan registros: las correcciones (`PATCH /access-events/sessions/:id`) exigen un motivo obligatorio y quedan en `audit_logs` con el valor anterior y nuevo.

## Seguridad

- HTTPS se espera terminado en el proxy/load balancer del despliegue.
- JWT de acceso de corta duración + refresh token rotativo almacenado con hash SHA-256.
- Contraseñas con Argon2; el PIN offline también se guarda hasheado.
- `ThrottlerModule` limita repeticiones (rate limiting), con un límite extra en `POST /auth/login`.
- Los QR nunca contienen datos legibles del área, solo un token UUID (ver `qr-codes.service.ts`).
- Guardia de roles (`RolesGuard`) sobre cada endpoint administrativo/sensible.

## Autenticación y registro offline

El backend expone `POST /auth/offline-credentials` para que, estando en
línea, el usuario defina/rote un PIN. La validación real del PIN **ocurre
en el dispositivo** (ver `mobile/`), que guarda su propio hash cifrado en
`expo-secure-store` — así el login funciona sin red. Cuando el personal de
limpieza registra una entrada/salida sin conexión, el evento se guarda
localmente y se sincroniza después con `POST /sync/batch`, que reutiliza
exactamente las mismas reglas de negocio y es idempotente por
`clientUuid` (un mismo evento nunca se duplica aunque se reintente el
envío).

## Pruebas

```bash
npm test          # unitarias (mocks de Prisma, no requieren base de datos)
npm run test:e2e  # flujo completo de la sección 40 del spec, requiere DATABASE_URL
```

Casos cubiertos: login válido/; usuario inactivo; QR válido/; QR inválido o
revocado; área inactiva; entrada válida; salida válida con cálculo de
duración; salida sin entrada; entrada duplicada; sincronización offline
(orden cronológico + reporte de errores por ítem sin detener el lote);
exportación a Excel (4 hojas) y CSV; permisos por rol; auditoría con
valor anterior/nuevo y motivo.

## Escalabilidad / multiempresa

Todas las tablas principales llevan `organization_id` (y `Area` además
`site_id`), preparando el modelo para varios hospitales/sedes sin cambios
de esquema (ver `prisma/schema.prisma`). La jerarquía completa
Organización → Sede → Área ya existe; Edificio/Piso/Zona se modelan hoy
como campos de texto en `Area` (`floor`, `zone`) y pueden normalizarse en
tablas propias si el catálogo crece.
