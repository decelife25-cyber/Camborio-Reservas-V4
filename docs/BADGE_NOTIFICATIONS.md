# Badge de Notificaciones de Reservas Pendientes (FCM)

En la V4 se ha implementado un sistema nativo para mostrar un "badge" (contador numérico) en el icono de la aplicación Android privada. Este badge representa el número de reservas que actualmente están en estado `PENDIENTE`.

## Arquitectura

1. **App React (Frontend):**
   Al iniciar sesión y montar la app, el componente `FCMManager` solicita permisos de notificaciones (si es necesario) y registra el dispositivo para recibir notificaciones mediante `@capacitor/push-notifications`. El token FCM generado se guarda en la base de datos de Supabase en la tabla `fcm_tokens`.
   Además, cuando la app vuelve al primer plano (`appStateChange`), se invoca manualmente a la Edge Function `sync-badge` autenticando mediante JWT (desde `supabase-js`) para asegurar que el contador esté siempre sincronizado con Supabase.

2. **Base de Datos Supabase:**
   - **Tabla `fcm_tokens`:** Almacena los tokens FCM con el `user_id` asociado. Implementa RLS para que los usuarios (empleados) gestionen solo sus propios tokens.
   - **Trigger:** Cuando el estado de una reserva cambia hacia o desde `PENDIENTE` (o se crea/elimina en ese estado), se ejecuta un trigger PostgreSQL que hace una petición POST asíncrona a la Edge Function `sync-badge` utilizando `pg_net`. Esta llamada PostgreSQL-EdgeFunction se autentica extrayendo un `webhook_secret` de manera segura usando Supabase Vault (`vault.decrypted_secrets`).

3. **Supabase Edge Function (`sync-badge`):**
   - Autentica la petición validando la cabecera `Authorization` contra el `WEBHOOK_SECRET` interno o contra el JWT del usuario de la sesión de React.
   - Realiza un `COUNT(*)` de las reservas con estado `PENDIENTE` utilizando el `service_role` interno.
   - Extrae todos los tokens FCM válidos de `fcm_tokens`.
   - Envía una notificación "Data-Only" usando la API oficial FCM v1 (mediante OAuth 2.0 y el payload `{"data": {"pending_count": "X"}}`) a cada dispositivo, utilizando el secreto `FIREBASE_SERVICE_ACCOUNT_KEY`.

4. **App Nativa Android:**
   - La aplicación implementa el servicio nativo `BadgeMessagingService` que extiende la clase de Capacitor `MessagingService` para no generar conflictos con las notificaciones Push estándar de `@capacitor/push-notifications`.
   - Cuando llega el payload "Data-Only", el servicio lee el campo `pending_count` si existe; si no, llama al método base de Capacitor para que lo procese.
   - Si `pending_count` es mayor a 0, lanza una notificación "silenciosa" (Importance Low) en un canal especial con `setShowBadge(true)` y con el número de reservas pendiente mediante `.setNumber(count)`.
   - Si es 0, cancela la notificación limpiando el badge de forma nativa.

## Requisitos para Integración Continua (CI) y Producción

Para que el sistema de notificaciones funcione de forma segura, deben cumplirse las siguientes configuraciones externas (fuera del repositorio):

### 1. `google-services.json`
El archivo `google-services.json` que enlaza el proyecto Firebase con el APK de Android.
- **Dónde se configura:** Se debe incluir en el directorio `android_app/android/app/` localmente, o inyectarse dinámicamente en GitHub Actions mediante Secrets de GitHub.

### 2. Secreto de Supabase: `FIREBASE_SERVICE_ACCOUNT_KEY`
La Edge Function `sync-badge` requiere la clave privada de la cuenta de servicio de Firebase para generar tokens OAuth de Google.
- Descarga el JSON de la cuenta de servicio de Firebase.
- Conviértelo a Base64 puro.
- Configúralo en Supabase:
```bash
npx supabase secrets set FIREBASE_SERVICE_ACCOUNT_KEY="<base64_string>"
```

### 3. Supabase Vault (Trigger de BD a Edge Function): `WEBHOOK_SECRET`
Para que el Trigger de PostgreSQL llame de forma segura a la Edge Function (y no exponga la `SERVICE_ROLE_KEY`), se utiliza Supabase Vault y una contraseña compartida (Webhook Secret).
- Elige una contraseña larga y segura (ej. un UUID v4 o cadena criptográfica).
- Configúrala como secreto de entorno para las Edge Functions en Supabase:
```bash
npx supabase secrets set WEBHOOK_SECRET="<tu_secreto_seguro>"
```
- Insértala en la tabla segura Supabase Vault ejecutando la siguiente consulta SQL (desde el panel SQL de Supabase):
```sql
SELECT vault.create_secret(
  '<tu_secreto_seguro>',
  'webhook_secret'
);
```
*(Es crítico que el parámetro `name` sea exactamente `'webhook_secret'` para que el trigger PostgreSQL lo encuentre).*

### Consideraciones sobre Launchers en Android
Dependiendo del fabricante de dispositivos (Samsung OneUI, Xiaomi MIUI, etc.) o el "Launcher" activo, el comportamiento del Badge puede variar:
- En Android "puro" (Stock Android 8.0+), se muestra un "Dot" (punto) en lugar de un número.
- En launchers personalizados que lo soporten, la llamada a `.setNumber(count)` sí renderiza correctamente el dígito en el icono de la aplicación.
