# 07. LEGACY GOOGLE SHEETS

La base de datos original utilizaba hojas de cálculo de Google. Todo este sistema está depreciado en favor de Supabase y debe ser DESCARTADO PARA V4.

## ELEMENTOS A DESCARTAR

### Archivos
- `02_Datos_Sheets.gs`: Todo el adaptador que interactuaba con SpreadsheetApp.
- Funciones relacionadas a enrutamiento dual (`DUAL_WRITE`, `DUAL_READ_COMPARE`) en `02_Datos.gs`.
- Pruebas y diagnósticos (ej. `dual_write.test.js`, `dual_read_compare.test.js`).

### Configuraciones (`00_Config.gs`)
- `CR_DB_CONFIG.SPREADSHEET_ID`: Ya no aplica.
- Constantes de hojas como `CR_HOJAS` y arreglos de columnas `CR_COLUMNAS`.
- Referencias de rendimiento para GAS como `PANEL_PRIVADO_CARGA_INICIAL_UNICA`.

### Dependencias y Referencias
- `SpreadsheetApp`: Llamadas a la API de Google Sheets.
- Operaciones tipo `LockService`: Aunque necesarias en Google Apps Script, V4 utilizará los bloqueos transaccionales directos de PostgreSQL (como `pg_advisory_xact_lock` introducidos en `023_corregir_esquema_generador_codigo_reserva.sql`).

## REGLAS HEREDADAS A CONSERVAR
La lógica de negocio implementada originariamente en Sheets que debe conservarse (ahora operando sobre SQL):
- Unicidad de teléfonos y códigos.
- Los historiales de estado en el Log.
- Las estadísticas de cliente (`ReservasTotales`, `Confirmadas`, etc.), las cuales ahora se pueden calcular con consultas SQL directas o se actualizan atómicamente con los RPC (`cr_actualizar_reserva_autoritativa`).
