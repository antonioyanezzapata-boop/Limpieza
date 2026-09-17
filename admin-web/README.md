# Admin Web — Trazabilidad de Limpieza Hospitalaria

Panel administrativo web para el sistema de trazabilidad de limpieza hospitalaria. Construido con
Vite + React 19 + TypeScript, `react-router-dom` para el ruteo, `recharts` para las gráficas del
dashboard, y Tailwind CSS v4 para los estilos.

This app is fully standalone: it lives entirely under `admin-web/`, has its own
`package.json`/`node_modules`, and does not import anything from the repository's root `src/`
(that is an unrelated project). It talks to the existing NestJS backend over its REST API only.

## Requisitos

- Node.js 20+ (probado con Node 22)
- El backend corriendo (por defecto en `http://localhost:3000/api/v1`)

## Puesta en marcha

```bash
cd admin-web
npm install
cp .env.example .env   # ajuste VITE_API_URL si el backend no corre en localhost:3000
npm run dev
```

La app queda disponible en `http://localhost:5173`.

### Credenciales de demostración (seed del backend)

- Administrador: `admin@hospital.local` / `Admin123!`
- Supervisor: `supervisor@hospital.local` / `Supervisor123!`

## Build de producción

```bash
npm run build
```

Ejecuta `tsc -b` (chequeo de tipos) seguido de `vite build`. Los archivos quedan en `dist/`.

```bash
npm run preview
```

Sirve el build de producción localmente para verificarlo.

## Variables de entorno

| Variable        | Descripción                                   | Default                          |
| --------------- | ---------------------------------------------- | --------------------------------- |
| `VITE_API_URL`  | Base URL de la API del backend (`/api/v1`)     | `http://localhost:3000/api/v1`    |

Defínala en un archivo `.env` (ver `.env.example`) o como variable de entorno del sistema/CI antes
de compilar.

## Estructura del proyecto

```
src/
  api/          Cliente HTTP (fetch) + tipos + un módulo por recurso del backend
  auth/         Contexto de autenticación (login, logout, refresh, usuario actual)
  components/
    layout/     Sidebar, Topbar, AppLayout (shell autenticado)
    ui/         Primitivas de UI propias (Button, Card, Table, Dialog, Tabs, etc.)
    ProtectedRoute.tsx   Guards de ruta (requiere sesión / requiere rol ADMIN)
  pages/        Una carpeta o archivo por página (ver lista abajo)
  lib/          Utilidades de formato de fechas/duraciones y helpers varios
```

## Autenticación y sesión

- El login llama a `POST /auth/login` con `deviceId`/`devicePlatform: 'web'` y guarda
  `accessToken`, `refreshToken` y el usuario en `localStorage`.
- Cada request adjunta automáticamente el header `Authorization: Bearer <token>`.
- Si una respuesta llega con `401`, el cliente intenta refrescar la sesión una vez con
  `POST /auth/refresh` y reintenta la petición original; si el refresh falla, limpia la sesión y
  redirige a `/login`.
- `POST /auth/logout` se invoca al cerrar sesión (best-effort; la sesión local se limpia siempre).

## Control de acceso por rol

- **ADMIN**: acceso completo (crear/editar usuarios y áreas, generar/regenerar QR, activar y
  desactivar, restablecer contraseñas).
- **SUPERVISOR**: acceso de solo lectura a usuarios y áreas, gestión de QR en modo lectura
  (puede ver, descargar e imprimir, no generar), y acceso completo a reportes, corrección de
  sesiones y auditoría (el backend permite ambos roles en esos endpoints).

Las acciones exclusivas de ADMIN se ocultan en la interfaz para SUPERVISOR y además las rutas de
creación/edición quedan protegidas por un guard de ruta (`AdminOnlyRoute`); el backend sigue
siendo la autoridad final y devuelve 403 si se intenta saltar la restricción.

## Páginas

1. **Login** — `/login`
2. **Dashboard** — `/` (KPIs + 4 gráficas + lista de registros incompletos)
3. **Usuarios** — `/users` (búsqueda, filtros por estado/rol)
4. **Crear usuario** — `/users/new` (solo ADMIN)
5. **Editar usuario** — `/users/:id/edit` (solo ADMIN; incluye activar/desactivar y restablecer
   contraseña desde la lista)
6. **Áreas** — `/areas` (búsqueda, filtros por estado/piso/zona)
7. **Crear área** — `/areas/new` (solo ADMIN)
8. **Editar área** — `/areas/:id/edit` (solo ADMIN)
9. **QR por área** — `/areas/:id/qr` (ver QR activo, generar/regenerar con confirmación,
   historial, descarga de PNG, impresión)
10. **Reportes** — `/reports` (pestañas: Tiempos de limpieza por área, Por área, Por empleado,
    Áreas sin atender), con filtros combinables y exportación XLSX/CSV/PDF
11. **Detalle de sesión** — `/sessions/:id` (información completa + formulario de corrección con
    motivo obligatorio)
12. **Registros inconsistentes** — `/sessions/inconsistent` (filtro por estado, enlaza al detalle)
13. **Auditoría** — `/audit` (filtros, paginación, diff de valor anterior/nuevo, motivo)
14. **Configuración** — `/settings` (URL de la API, nota sobre geolocalización controlada por el
    servidor, preferencia de densidad de tablas guardada localmente)

## Exportaciones e imágenes con autenticación

Los endpoints de exportación de reportes y de imagen PNG del QR requieren el header
`Authorization`, por lo que no se pueden enlazar directamente con `<a href>` ni `<img src>`. En su
lugar, el cliente descarga el archivo con `fetch` (adjuntando el Bearer token), lo convierte en un
`Blob` y dispara la descarga mediante un `<a download>` sintético (`triggerBlobDownload` en
`src/api/client.ts`). El QR se muestra igual: se descarga como blob y se usa como
`URL.createObjectURL` en la etiqueta `<img>`.

## Notas de alcance

- No se documentó un endpoint `GET` para una sesión individual, así que el Detalle de sesión
  recibe la fila ya cargada (via `state` de navegación) cuando se llega desde una tabla de
  reportes, y si se abre la URL directamente vuelve a pedir `GET /reports/cleaning-times` y
  busca la fila por `sessionId`.
- Los componentes de UI (`src/components/ui`) son implementaciones propias y minimalistas al
  estilo shadcn/Tailwind, sin copiar nada del proyecto raíz del repositorio.
