# 05. RPC, FUNCIONES Y TRIGGERS (SUPABASE)

La versión V3 introdujo una dependencia fuerte de funciones de PostgreSQL (RPC) que la aplicación V4 debe invocar o mantener.

## FUNCIONES PRINCIPALES (RPC)

### `cr_generar_codigo_reserva()`
- **Objetivo:** Generar un código alfanumérico corto y único para cada reserva.
- **Implementación:** (Migración `023_corregir_esquema_generador_codigo_reserva.sql`) Utiliza `pgcrypto` para generar bytes aleatorios que se mapean a un alfabeto base32 personalizado (`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`).
- **Control de Concurrencia:** Emplea `pg_advisory_xact_lock(pg_catalog.hashtext('cr_codigo_reserva'))` para garantizar la exclusividad durante la transacción y prevenir colisiones (junto al índice `UNIQUE` de la tabla).

### Funciones de Normalización
- **`cr_normalizar_telefono(valor text)`**: Remueve todo carácter no numérico del texto proporcionado.

### Funciones Autoritativas (Transaccionales)
- **`cr_crear_reserva_autoritativa`** (Migración 009): Agrupa la creación del cliente (si no existe), la generación del código y la inserción de la reserva en una única transacción de base de datos.
- **`cr_actualizar_reserva_autoritativa`** (Migración 010): Actualiza la reserva y registra el historial o estadísticas en la misma transacción atómica.

## TRIGGERS (DISPARADORES)

- **`cr_normalizar_telefono_fila`**: Antes de insertar o actualizar en las tablas `clientes` y `reservas`, invoca a `cr_normalizar_telefono()` sobre el campo `telefono`. Garantiza que, incluso si desde el cliente (PWA/APK) o directamente en DB se inserta un "+34 600-000-000", la DB lo guarde como "34600000000".
- **`cr_actualizar_updated_at`**: Automáticamente pone la hora del servidor (`now()`) en el campo correspondiente en cada UPDATE.

## NOTA DE REVISIÓN FINAL (RLS/POLICIES)
- **RLS y Políticas (`policies`):** Aunque conceptualizadas para separar el acceso PWA (anon) del APK (authenticated), las definiciones exactas de las políticas RLS en V2 para su porte a V4 **NO DETERMINADO**. La auditoría del esquema y los `.gs` confirman el uso de RPC con `security definer`, pero las políticas estrictas de Supabase `auth.uid()` o permisos anónimos directos sobre tablas deben ser redesarrolladas desde cero en V4 para ajustarse al uso de JWT.
