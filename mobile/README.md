# Limpieza Trazabilidad — App móvil

App móvil (Expo + React Native + TypeScript) para el personal de limpieza hospitalaria.
Permite escanear el código QR de un área, registrar ENTRADA/SALIDA, y funciona
completamente offline cuando no hay conexión con el backend.

## Cómo correr el proyecto

```bash
cd mobile
npm install
cp .env.example .env   # ajusta EXPO_PUBLIC_API_URL si el backend no corre en localhost:3000
npx expo start
```

Luego abre la app con Expo Go (escaneando el QR que imprime Metro) o con un
emulador Android/iOS. El escáner de QR (`expo-camera`) necesita un dispositivo
o emulador con cámara — en el simulador de iOS no hay cámara real.

Variables de entorno (ver `.env.example`):

- `EXPO_PUBLIC_API_URL` — URL base del backend NestJS, incluyendo el prefijo
  `/api/v1` (por defecto `http://localhost:3000/api/v1`). Es el valor por
  defecto con el que se compila la app.

### Cambiar el servidor sin recompilar

Un APK ya instalado no tiene por qué quedar atado para siempre a la URL con
la que se compiló: en **Login → "⚙️ Configurar servidor"** (o **Perfil →
"Configurar servidor"** una vez adentro) se puede escribir la URL de
cualquier backend desplegado (por ejemplo `https://mi-backend.onrender.com/api/v1`)
y queda guardada en el dispositivo (`src/config/serverUrl.ts`, persistida
con `expo-secure-store`). Útil para distribuir un solo `.apk` que cada
hospital/instalación apunte a su propio backend.

### Type-check

```bash
npx tsc --noEmit
```

## Estructura

```
src/
  api/            cliente HTTP (fetch), endpoints tipados, tipos del contrato REST
  auth/           AuthContext, autenticación offline (PIN), almacenamiento seguro de sesión
  components/     botones, banners, tarjetas, badges de estado reutilizables
  db/             SQLite local: cola offline cifrada + caché de áreas escaneadas
  hooks/          hooks de datos (sesiones abiertas, historial)
  navigation/     stack de React Navigation y tipos de rutas
  network/        contexto de conectividad (NetInfo)
  screens/        las 12 pantallas de la app (ver spec)
  sync/           lógica de sincronización de la cola offline (POST /sync/batch)
  theme/          colores y espaciados
  utils/          helpers (uuid, deviceId, formato de fechas/duraciones)
```

## Autenticación offline

La app **nunca depende de la red para validar un login offline**. El flujo es:

1. Con conexión, el usuario inicia sesión normalmente (`POST /auth/login`). Si
   `hasOfflinePin` viene en `false`, se le ofrece configurar un PIN (4-6
   dígitos) desde la pantalla de configuración de PIN offline, o más tarde
   desde Perfil.
2. Al configurar el PIN:
   - Se genera un salt aleatorio y se calcula un hash iterativo (SHA-256,
     1000 rondas, encadenado con el salt) **en el dispositivo**, usando
     `expo-crypto`. Solo ese hash + salt se guardan, en `expo-secure-store`
     (Keychain en iOS / Keystore en Android), bajo una clave específica del
     `employeeCode`.
   - Se llama una vez a `POST /auth/offline-credentials` (con el password
     actual y el PIN en texto plano, solo por HTTPS, en esa única llamada)
     para que el backend guarde su propia copia de auditoría. Esa llamada
     **no** participa en el camino crítico del login offline — es solo para
     que el servidor tenga constancia.
   - También se cachean el `accessToken`, `refreshToken` y el perfil del
     usuario en `expo-secure-store`, para poder restaurar la sesión y para
     que el login offline tenga un perfil de usuario con el que operar.
3. Sin conexión, el usuario ingresa su código de empleado + PIN en la
   pantalla de Login (pestaña "Acceso offline"). La app compara el PIN
   contra el hash guardado localmente — **sin ninguna llamada de red** — y
   si coincide arranca una sesión marcada explícitamente como
   `isOfflineSession = true` en el estado de la app.
4. Cuando vuelve la conexión (detectado con `@react-native-community/netinfo`),
   la app llama silenciosamente a `GET /auth/verify-active` (reutilizando el
   `refreshToken` guardado si el `accessToken` expiró) para reconciliar. Si
   la cuenta sigue activa, la sesión se "asciende" a sesión online normal. Si
   el backend indica que el usuario está inactivo, se bloquean nuevos
   registros y se muestra un aviso hasta que la cuenta vuelva a confirmarse
   activa.

## Cola offline cifrada (registro de entradas/salidas sin conexión)

Cuando se confirma una ENTRADA/SALIDA:

- Siempre se genera un `clientUuid` (uuid v4, vía `expo-crypto`) **antes** de
  intentar la llamada de red — ese mismo id se reutiliza si el evento termina
  encolado, de forma que `POST /sync/batch` sea idempotente ante reintentos.
- Si el dispositivo está offline, o la llamada a `POST /access-events` falla
  por un error de red (no por una regla de negocio como 409/400), el evento
  se guarda en una cola local en **SQLite** (`expo-sqlite`), y la pantalla
  muestra de inmediato "Registro pendiente de sincronización" (estado
  amarillo).
- **Cifrado elegido**: el cuerpo completo de la petición (`AccessEventRequest`)
  se cifra con **AES** usando [`crypto-es`](https://github.com/entronad/crypto-es)
  (un fork de `crypto-js` en TypeScript/ESM puro) antes de guardarse en SQLite.
  Se eligió `crypto-es` en vez de un módulo nativo (`react-native-aes-crypto`)
  porque funciona sin necesidad de compilar código nativo adicional en el
  flujo managed de Expo. La clave AES es un valor aleatorio de 256 bits
  generado una vez con `expo-crypto` (CSPRNG) y guardado en
  `expo-secure-store` — nunca sale del dispositivo. Solo campos no sensibles
  (nombre del área, tipo de evento, estado) se guardan en claro, para que la
  pantalla de "Estado de sincronización" pueda listar la cola sin descifrar
  cada fila.
- La sincronización se dispara automáticamente al recuperar conexión (listener
  de NetInfo), al volver la app a primer plano (`AppState`), y manualmente
  con el botón "Sincronizar ahora". Los ítems se marcan `syncing` antes de
  enviarse (evitando doble envío si dos disparadores se solapan), se procesan
  vía `POST /sync/batch`, y cada resultado por ítem marca `synced` o `error`
  (dejando el mensaje de error visible y reintentable más tarde).
- Adicionalmente, cada área identificada por QR (`POST /qr-codes/resolve`) se
  cachea localmente (tabla `area_cache`) para poder reconocer un QR ya
  escaneado antes incluso sin conexión, y para permitir el atajo "REGISTRAR
  SALIDA" desde la pantalla de Actividad Actual sin volver a escanear.

## Notas de alcance

- No se implementó un módulo de administración: esta app es exclusivamente
  para el personal de limpieza (rol `CLEANING_STAFF`), aunque también permite
  iniciar sesión a `ADMIN`/`SUPERVISOR` (sin flujos adicionales para ellos).
- La sincronización en segundo plano (background fetch cuando la app está
  cerrada) no está implementada; se sincroniza al reconectar, al volver a
  primer plano, o manualmente. Es una extensión razonable para una iteración
  futura (`expo-background-fetch` / `expo-task-manager`).
