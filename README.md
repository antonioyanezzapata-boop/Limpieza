# Arquitectura — Control y trazabilidad de limpieza hospitalaria

Sistema para registrar, con trazabilidad completa, cuándo el personal de
limpieza entra y sale de cada área de un hospital, mediante el escaneo de
un código QR único por área. Compuesto por tres proyectos independientes
en este mismo repositorio:

```
backend/     API REST — NestJS + Prisma + PostgreSQL
mobile/      App del personal de limpieza — Expo + React Native + TypeScript
admin-web/   Panel administrativo — Vite + React + TypeScript
```

Los tres se comunican únicamente por HTTP contra la API REST del backend
(`/api/v1`). No comparten código entre sí, cada uno tiene su propio
`package.json`/`node_modules`/README.

## Por qué este MVP primero

Siguiendo la sección "Desarrollar primero un MVP" del encargo, se
implementó completo y probado, antes que nada, el flujo:

**Autenticación → Usuarios → Áreas → Generación de QR → Escaneo QR →
Entrada → Salida → Cálculo de duración → Reporte → Exportación Excel →
Auditoría** — más **autenticación y registro offline**, pedido
explícitamente además del MVP.

Checklists, programación de tareas, fotografías de evidencia, SLA por
área, incidencias y notificaciones (mencionados como crecimiento futuro
en el encargo) **no** están implementados; el modelo de datos y la
estructura modular del backend están pensados para añadirlos sin romper
lo existente (ver "Cómo crece esto" al final).

## Puesta en marcha

### Con Docker (backend + base de datos + panel administrativo)

```bash
docker compose up
```

Levanta PostgreSQL, el backend (migra el esquema y siembra los datos de
demo automáticamente al iniciar) y el panel administrativo ya compilado.
API en `http://localhost:3000/api/v1`, panel en `http://localhost:5173`.
La app móvil no se dockeriza (requiere Expo/un dispositivo o emulador),
se corre aparte — ver más abajo.

### Backend en local

```bash
cd backend
cp .env.example .env
npm install
npm run prisma:migrate
npm run prisma:seed
npm run start:dev
```

### Panel administrativo

```bash
cd admin-web
npm install
cp .env.example .env   # VITE_API_URL si el backend no está en localhost:3000
npm run dev             # http://localhost:5173
```

### App móvil

```bash
cd mobile
npm install
cp .env.example .env   # EXPO_PUBLIC_API_URL si el backend no está en localhost:3000
npx expo start
```

Abre con Expo Go o un emulador Android/iOS con cámara (el escáner de QR
usa `expo-camera`).

### Credenciales y datos de demo (`backend/prisma/seed.ts`)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@hospital.local | `Admin123!` |
| Supervisor | supervisor@hospital.local | `Supervisor123!` |
| Personal de limpieza | maria@hospital.local | `Staff123!` (PIN offline demo: `1234`) |

Áreas: `QUI-001` Quirófano 01, `QUI-002` Quirófano 02, `UCI-001` UCI,
`EME-001` Emergencia, `HOS-201` Habitación 201 — cada una con un QR activo
generado por el seed.

## Flujo de éxito (sección 40 del encargo), tal como quedó implementado

1. María abre la app móvil e inicia sesión (`POST /auth/login`).
2. En Inicio ve "No existe actividad abierta" y toca **ESCANEAR ÁREA**.
3. La cámara lee el QR de Quirófano 01; la app resuelve el token contra el
   backend (`POST /qr-codes/resolve`) y muestra "Quirófano 01, Piso 2".
4. Selecciona **ENTRADA** (siempre una acción manual, nunca inferida) y
   confirma; el backend registra el evento con la hora del **servidor**
   (`POST /access-events`) y abre una `CleaningSession`.
5. Termina la limpieza, vuelve a escanear el mismo QR, selecciona
   **SALIDA** y confirma. El backend valida que exista una entrada abierta
   en esa área, cierra la sesión y calcula `durationSeconds` automáticamente
   (nunca a partir de lo que muestra la pantalla).
6. El supervisor abre el panel administrativo, entra al Dashboard o a
   Reportes → "Tiempos de limpieza por área" y ve la fila:
   María Pérez · Quirófano 01 · 08:00 · 09:00 · 60 min · **COMPLETADO**.
7. El supervisor exporta a Excel (`GET /reports/cleaning-times/export?format=xlsx`):
   el archivo trae la misma trazabilidad exacta, en 4 hojas (Resumen,
   Detalle, Por área, Por empleado).

Este camino está cubierto por una prueba e2e real
(`backend/test/golden-path.e2e-spec.ts`).

## Reglas de negocio (implementadas en `backend/src/access-events/access-events.service.ts`)

1. No se permite `SALIDA` sin una `ENTRADA` abierta en la misma área →
   `400 "No existe una entrada activa para esta área."`
2. No se permite una segunda `ENTRADA` abierta en la misma área para el
   mismo usuario → `409 "Ya tienes una entrada activa en {área} desde las {hora}."`
   (la interfaz permite cancelar).
3. Mínimo de segundos entre dos registros del mismo usuario+área
   (`MIN_SECONDS_BETWEEN_REGISTRATIONS`, 5s por defecto) para filtrar doble
   lectura del QR.
4. La hora del registro siempre proviene del reloj del **servidor**
   (`serverTimestamp`); la hora del dispositivo se guarda aparte solo como
   referencia (`deviceTimestamp`) y nunca es la autoritativa.
5. Se guarda la zona horaria de cada evento.
6. No se eliminan registros históricos: toda corrección exige un motivo
   obligatorio y queda en `audit_logs` con el valor anterior y el nuevo
   (`PATCH /access-events/sessions/:id`, expuesto en el panel como
   "Detalle de sesión").

## Autenticación y registro offline

Requisito explícito además del MVP. Diseño de extremo a extremo:

- **Login normal**: JWT de acceso de corta duración + refresh token
  rotativo (`POST /auth/login`, `POST /auth/refresh`), contraseñas con
  Argon2.
- **PIN offline**: con conexión, el usuario define un PIN de 4-6 dígitos
  (`POST /auth/offline-credentials`). La app móvil calcula y guarda el
  hash **en el propio dispositivo** (`expo-secure-store`) — el backend
  solo conserva una copia para auditoría/revocación remota; la
  validación real del PIN, sin conexión, ocurre 100% en el dispositivo,
  nunca contra la red (ver `mobile/README.md`, sección "Autenticación
  offline").
- **Registro de entrada/salida offline**: si no hay red al confirmar un
  escaneo, el evento se guarda cifrado (AES) en una cola local SQLite en
  el dispositivo y se marca "Registro pendiente de sincronización"
  (estado amarillo). Al recuperar conexión se sincroniza automáticamente
  contra `POST /sync/batch`, que reutiliza exactamente las mismas reglas
  de negocio 1-6 y es idempotente por `clientUuid` — ningún evento se
  duplica aunque el envío se reintente (ver `mobile/README.md`, sección
  "Cola offline cifrada").

## Seguridad

- HTTPS se espera terminado en el proxy/balanceador del despliegue.
- JWT (access + refresh) con secretos separados; refresh tokens
  almacenados con hash SHA-256 y revocados en cada rotación/logout.
- Contraseñas y PIN offline con Argon2.
- Rate limiting global (`@nestjs/throttler`) y límite extra en
  `POST /auth/login`.
- Guardia de roles (`RolesGuard`) en cada endpoint administrativo o
  sensible; el frontend también oculta acciones no permitidas, pero el
  backend es siempre la autoridad final.
- El QR nunca contiene datos legibles del área: solo un token UUID no
  predecible (`hospital://area/<uuid>`), resuelto server-side.
- Borrado lógico únicamente (usuarios y áreas); nunca se elimina un
  registro con movimientos asociados.
- Auditoría (`audit_logs`) de creación/edición/desactivación de usuarios
  y áreas, generación/regeneración de QR, y correcciones de sesiones.

## Escalabilidad / multiempresa

Todas las tablas principales del backend llevan `organization_id` (y
`Area` además `site_id`), preparando el modelo para varias
organizaciones/hospitales y sedes sin cambios de esquema. La jerarquía
`Organización → Sede → Área` ya existe en `backend/prisma/schema.prisma`;
`Edificio/Piso/Zona` se modelan hoy como campos de texto en `Area`
(`floor`, `zone`) y pueden normalizarse en tablas propias si el catálogo
de áreas crece mucho (cientos de áreas, varios edificios).

## Cómo crece esto

El modelo de datos y la separación por módulos del backend
(`backend/src/<módulo>`) están pensados para que lo que falta se añada
como módulos nuevos sin tocar los existentes:

- **Checklists de limpieza**: un módulo `checklists` con plantillas por
  tipo de área y respuestas ligadas a `cleaning_sessions.id`.
- **Programación de tareas**: un módulo `scheduling` con turnos/rondas
  esperadas por área, comparado contra `reports.areasWithoutCleaning`
  (ya existente) para alertar incumplimientos.
- **Fotografías de evidencia**: un campo `attachments` en
  `AccessEvent`/`CleaningSession` + almacenamiento en un bucket (S3/Azure
  Blob), subido desde la app móvil en el mismo paso de confirmación.
- **SLA por área**: un `slaMinutes` en `Area` y una comparación contra
  `durationSeconds` al cerrar la sesión, para marcar cumplimiento.
- **Incidencias y notificaciones**: un módulo `incidents` ligado a
  `Area`/`CleaningSession`, y un `NotificationsModule` (push/email) que
  ya puede engancharse a los eventos que hoy escriben en `audit_logs`.

## Documentación por proyecto

- [`backend/README.md`](./backend/README.md) — módulos, endpoints,
  variables de entorno, pruebas.
- [`mobile/README.md`](./mobile/README.md) — pantallas, autenticación y
  registro offline, estructura.
- [`admin-web/README.md`](./admin-web/README.md) — páginas, control de
  acceso por rol, exportaciones.
