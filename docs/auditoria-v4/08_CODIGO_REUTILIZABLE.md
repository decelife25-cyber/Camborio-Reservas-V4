# 08. CÓDIGO REUTILIZABLE (MIGRACIÓN A V4)

El nuevo proyecto V4 se escribirá en limpio. Sin embargo, mucha lógica de negocio debe adaptarse o traducirse (idealmente a TypeScript/JavaScript moderno o funciones de base de datos).

## REUTILIZAR INTACTO
- **Esquema de Base de Datos y Migraciones SQL:** Los scripts en `supabase/migrations/` y las funciones RPC (`cr_generar_codigo_reserva`, `cr_crear_reserva_autoritativa`, etc.) se utilizarán intactos en el nuevo proyecto Supabase.
- **Reglas de Estado (Estados Reserva):** La lista y flujo de transiciones (PENDIENTE -> CONFIRMADA -> SENTADA -> FINALIZADA).

## ADAPTAR / REESCRIBIR (LÓGICA CORE)
*(Estos módulos en `.gs` contienen reglas puras. Deberán portarse a TypeScript y usarse tanto en frontend como en Edge Functions).*
- **`04_Reservas.gs`:** Las validaciones pre-creación, comprobación de fechas futuras y reglas de cambio de turnos (desasignar mesas).
- **`11_Horarios.gs`:** La lógica para decidir qué hora es "Comida" o "Cena" basada en la hora de corte. Calcular la disponibilidad en función de los días activos y horas con antelación mínima.
- **`05_Mesas.gs`:** La lógica para calcular uniones de mesas (`GrupoUnion`) y sumar las capacidades.
- **`06_Calendario.gs`:** Los algoritmos de agrupación para visualizar y ordenar la disponibilidad por fecha y hora.

## DESCARTAR
- **Infraestructura Google Apps Script:** `HtmlService`, `PropertiesService`, `LockService`, `Session`.
- **Integraciones Google Drive / PDF:** `08_PDF.gs` y las subidas a carpetas de GDrive, a menos que la V4 se diseñe para seguir usando Drive, lo recomendable es generar PDFs en el cliente o usar Supabase Storage.
- **UI Antigua:** Los archivos `Privado_*.html` y `Publico_*.html` que utilizan Vanilla JS y CSS rústico deben descartarse por completo. La PWA y el APK se construirán utilizando un framework frontend moderno (React, Vue, Flutter, o análogo).
- **Administración y Diagnóstico:** Todo el código en `17_Admin_Validacion_Supabase.gs`, `18_Admin_Validacion_CRUD.gs` y `12_Privado.gs` que servía para verificar migraciones de Sheets a Supabase.
