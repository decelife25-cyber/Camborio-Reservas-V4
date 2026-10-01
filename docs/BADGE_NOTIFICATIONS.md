# Badge de Notificaciones de Reservas Pendientes (FCM)

En la V4 se ha implementado un sistema nativo para mostrar un "badge" (contador numérico) en el icono de la aplicación Android privada. Este badge representa el número de reservas que actualmente están en estado `PENDIENTE`.

## Arquitectura

1. **App React (Frontend):**
   Al iniciar sesión y montar la app, el componente `FCMManager` solicita permisos de notificaciones (si es necesario) y registra el dispositivo para recibir notificaciones mediante `@capacitor/push-notifications`. El token FCM generado se guarda en la base de datos de Supabase en la tabla `fcm_tokens`.
   Además, cuando la app vuelve al primer plano (`appStateChange`), se invoca manualmente a la Edge Function `sync-badge` para asegurar que el contador esté siempre sincronizado con Supabase.

2. **Base de Datos Supabase:**
   - **Tabla `fcm_tokens`:** Almacena los tokens FCM con el `user_id` asociado. Permite RLS para que los usuarios (empleados) gestionen sus propios tokens.
   - **Trigger:** Cuando el estado de una reserva cambia hacia o desde `PENDIENTE` (o se crea/elimina en ese estado), se ejecuta un trigger PostgreSQL que hace una petición a la Edge Function `sync-badge` utilizando `pg_net` (o webhook en su defecto).

3. **Supabase Edge Function (`sync-badge`):**
   - Realiza un `COUNT(*)` de las reservas con estado `PENDIENTE`.
   - Extrae todos los tokens FCM válidos registrados en la base de datos.
   - Envía una notificación "Data-Only" usando la API oficial FCM v1 (mediante OAuth 2.0 y el payload `{"data": {"pending_count": "X"}}`) a cada dispositivo.

4. **App Nativa Android:**
   - La aplicación implementa el servicio nativo `BadgeMessagingService` que extiende `FirebaseMessagingService`.
   - Cuando llega el payload "Data-Only", el servicio lee el campo `pending_count`.
   - Si es mayor a 0, lanza una notificación "silenciosa" (Importance Low) en un canal especial con `setShowBadge(true)` y con el número de reservas pendiente mediante `.setNumber(count)`.
   - Si es 0, cancela la notificación limpiando el badge.

## Requisitos para Integración Continua (CI) y Producción

Debido a que Firebase y FCM requieren autenticación de Google, deben cumplirse las siguientes configuraciones en el proyecto para que el sistema funcione en un entorno de producción:

### 1. `google-services.json`
El archivo `google-services.json` que enlaza el proyecto Firebase con el APK de Android no se incluye en el control de versiones. Para que las notificaciones funcionen (y se puedan compilar de forma completa en local si se requiere), se debe añadir el archivo `google-services.json` en `android_app/android/app/`.

### 2. Secreto de Supabase: `FIREBASE_SERVICE_ACCOUNT_KEY`
La Edge Function de Supabase (`sync-badge`) necesita autenticarse mediante OAuth 2.0 para utilizar la nueva API v1 de FCM. Para ello, se requiere la clave privada de la cuenta de servicio de Firebase.
- Descarga el archivo JSON de la cuenta de servicio desde la consola de Firebase.
- Codifica su contenido en Base64.
- Añade el string base64 en Supabase como un secreto de entorno llamado `FIREBASE_SERVICE_ACCOUNT_KEY` para que las Edge Functions puedan usarlo.
```bash
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="<base64_string>"
```

### 3. Permisos
- La aplicación solicita al usuario (empleados de Camborio) permisos de Push (necesarios en Android 13+). Si se deniegan, no se mostrará el badge nativo en el launcher.

### Consideraciones sobre Launchers en Android
Dependiendo del fabricante de dispositivos (Samsung OneUI, Xiaomi MIUI, etc.) o el "Launcher" activo, el comportamiento del Badge puede variar:
- En Android "puro" (Stock Android 8.0+), se muestra un "Dot" (punto) en lugar de un número.
- En launchers personalizados que lo soporten, la llamada a `.setNumber(count)` sí renderiza correctamente el dígito en el icono de la aplicación.
