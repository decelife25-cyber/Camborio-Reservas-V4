# 04. CONTRATO DE BASE DE DATOS

Este contrato refleja la estructura FINAL de Supabase según las migraciones (desde `001_esquema_inicial.sql` hasta `023_corregir_esquema_generador_codigo_reserva.sql`) y el catálogo exportado.

## TABLAS PRINCIPALES

### `clientes`
- **PK:** `cliente_id` (UUID).
- **UNIQUE:** `telefono`.
- **Columnas Relevantes:** `nombre_ultimo`, `email_ultimo`, estadísticas (`reservas_totales`, `confirmadas`, `sentadas`, `canceladas`, `no_presentados`), `ultima_visita`, `notas_internas`, `fecha_alta`.

### `reservas`
- **PK:** `reserva_id` (UUID).
- **UNIQUE:** `codigo_reserva` (Texto corto generado al vuelo, ver RPC).
- **Identidad/Relaciones:** `cliente_id` (FK a `clientes.cliente_id`).
- **Columnas Relevantes:**
  - `fecha_reserva` (DATE) y `hora_reserva` (TIME).
  - `turno` (VARCHAR: 'COMIDA', 'CENA').
  - `estado` (VARCHAR: 'PENDIENTE', 'CONFIRMADA', 'SENTADA', 'FINALIZADA', 'CANCELADA_CLIENTE', 'CANCELADA_LOCAL', 'NO_PRESENTADO').
  - `mesa`, `zona`, `mesas_adicionales`.
  - `creada_por`, `origen_reserva` ('PUBLICO' / 'PRIVADO').
- **Restricciones Eliminadas (Importante):** En la V3 (migración 004) se eliminó la restricción `UNIQUE (telefono, fecha_reserva, turno)` del lado base de datos porque generaba problemas de concurrencia rígida. Ahora esa comprobación es de negocio (a nivel aplicación mediante transacciones y bloqueos de tabla).

### `mesas`
- **PK:** `mesa_id` (UUID o UUID implícito, consultable a través de vistas/código) -> *(Nota: En V3 muchas mesas se guardaban por su número `Mesa` directamente)*.
- **Columnas:** `mesa`, `zona`, `capacidad`, `activa`, `unible`, `grupo_union`.

### `horarios`
- **PK Composición:** `dia_semana`, `servicio`, `hora`.
- **Columnas:** `margen_horas` (Antelación mínima), `activo` (Boolean).

### `personal`
- **PK:** `usuario_id`.
- **UNIQUE:** `pin`.
- **Columnas:** `nombre`, `telefono`, `rol` ('ADMIN', 'CAMARERO'), `activo`.

### `log` (Historial)
- Registra cada acción (Creación, Modificación, Cancelación) ligada a un `reserva_id`, `usuario` y un timestamp.

## TRIGGERS AUTOMÁTICOS
- **`cr_actualizar_updated_at`**: Actualiza el campo `updated_at` (si existe) a `now()` en cada UPDATE.
- **`cr_normalizar_telefono_fila`**: En `INSERT` o `UPDATE` de un cliente/reserva, limpia el teléfono dejando solo dígitos (`cr_normalizar_telefono`).
