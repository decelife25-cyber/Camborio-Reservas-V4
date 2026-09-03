# REVISIÓN FINAL DE AUDITORÍA: ACCESOS INESPERADOS A GOOGLE SHEETS

## Objetivo
Este documento resume la auditoría forense realizada sobre Camborio Reservas V3 para localizar el problema exacto por el cual `SpreadsheetApp.openById` (y otros métodos relacionados con Google Sheets) es invocado, causando errores de permisos en producción y tiempos de carga elevados, a pesar de que el backend oficial y activo está configurado explícitamente como `SUPABASE`.

Esta auditoría es clave para planificar el desarrollo de Camborio Reservas V4 partiendo de código limpio.

---

## 1. CAUSA DEMOSTRADA DEL PROBLEMA

La causa raíz de las invocaciones indeseadas a Google Sheets se debe a **llamadas explícitas y hardcoded a funciones del adaptador de Sheets (`CR_DatosSheets_`) dentro de la lógica del núcleo de `02_Datos.gs`**, ignorando por completo la capa de abstracción y el backend activo.

### La Ruta de Ejecución Exacta hacia `SpreadsheetApp.openById`

1. Se invoca una función que intenta leer o actualizar datos (ej: `CR_Datos_actualizarReserva`).
2. En su interior, en lugar de usar la capa abstracta `CR_Datos_obtenerReservaPorId` (la cual comprueba `CR_DATOS_BACKEND` y decide a qué adaptador llamar), **se invoca directamente `CR_DatosSheets_obtenerReservaPorId`**.
3. `CR_DatosSheets_obtenerReservaPorId` internamente llama a `CR_DB_buscarObjetosConFilaPorValor`.
4. Ésta, para leer las reservas, ejecuta `CR_DB_leerReservas`, que llama a `CR_DB_leerHoja`.
5. `CR_DB_leerHoja` llama a `CR_DB_obtenerHoja` (línea 257 de `02_DB.gs`).
6. `CR_DB_obtenerHoja` invoca `CR_DB_obtenerSpreadsheet` (línea 126 de `02_DB.gs`).
7. **`CR_DB_obtenerSpreadsheet` invoca `SpreadsheetApp.openById(CR_DB_CONFIG.SPREADSHEET_ID)`** (línea 122 de `02_DB.gs`).

Si la Web App se está ejecutando bajo los permisos de un usuario que no tiene acceso al Spreadsheet, se produce de inmediato el error:
> *"Error al leer la hoja Reservas. Detalle: No tienes permiso para llamar a SpreadsheetApp.openById."*

---

## 2. FUNCIONES AFECTADAS (INVENTARIO)

Las siguientes funciones contienen código "hardcoded" que obliga al sistema a consultar Google Sheets en producción:

1. **`CR_Datos_actualizarReserva` (`02_Datos.gs`, línea 199):**
   Para determinar si una actualización a una reserva afecta la "HoraReserva" y si, en caso de no especificarse explícitamente un "Turno", este debe recalcularse, se lee la reserva existente con:
   `const existente = CR_DatosSheets_obtenerReservaPorId(entrada.reservaID);`

   *Esta función es crítica en el ciclo de vida de la reserva, y su invocación ocurre en todo cambio de estado, modificación y asignación de mesas.*

2. **`CR_Datos_persistirActualizacionReserva_` (`02_Datos.gs`, línea 269):**
   Durante el bloque de sincronización (o fallback) de `CR_Datos_escribir_`, se extrae el dato final utilizando:
   `const definitiva = CR_DatosSheets_obtenerReservaPorId(id);`

3. **`CR_Datos_resincronizarReservaDesdeSheetsPorId` (`02_Datos.gs`, línea 371):**
   Su propia naturaleza implica leer de Sheets:
   `const reserva = CR_DatosSheets_obtenerReservaPorId(id);`

4. **`CR_Datos_actualizarEmailReserva` (`02_Datos.gs`, línea 687):**
   De nuevo, en el callback de sincronización de `CR_Datos_escribir_`:
   `const definitiva = CR_DatosSheets_obtenerReservaPorId(id);`

5. **Llamadas desde el bloque de lectura dual `CR_Datos_leerComparando_` (`02_Datos.gs`):**
   A lo largo del archivo `02_Datos.gs`, todas las lecturas (ej. `CR_Datos_obtenerReservas`, `CR_Datos_obtenerMesas`, `CR_Datos_obtenerClientes`, etc.) pasan referencias como `CR_DatosSheets_obtenerReservas` como argumento al mecanismo de comparación (`DUAL_READ_COMPARE`). Si el backend está en DUAL, provocará un fetch de ambas fuentes. Afortunadamente esto está inhibido mientras el backend principal sea `SUPABASE` *dentro de este helper*, pero el problema persiste en las escrituras documentadas arriba.

---

## 3. CÓDIGO LEGACY QUE SE DESCARTA PARA V4

Para la implementación limpia de la versión V4, se descarta lo siguiente:

- **La Capa Completa de Base de Datos de Google Sheets (`02_DB.gs`):**
  Descartar todas las funciones `CR_DB_*`, la invocación de la Spreadsheet API (`SpreadsheetApp`), bloqueos transaccionales `LockService` simulados, recálculos masivos de mapas de columnas, e importaciones / lecturas completas y filtrados costosos en RAM (`CR_DB_leerHoja`, `CR_DB_leerReservasPorFecha`, etc).

- **El Adaptador de Google Sheets (`02_Datos_Sheets.gs`):**
  Se descarta todo el código `CR_DatosSheets_*`.

- **Mecanismos de Sincronización Dual y Replicación (`CR_Datos_escribir_`, `DUAL_READ_COMPARE`, `DUAL_WRITE`):**
  Toda la lógica "híbrida" (Callbacks múltiples a sheets, y a supabase, resincronizaciones `sincronizarLog`, comprobaciones de diferencias entre motores) construida en `02_Datos.gs` durante V3 queda obsoleta.

- **Scripts Administrativos de Migración y Diagnóstico entre motores:**
  Funciones como `CR_Datos_adminSincronizarEntidadSupabase`, `CR_Datos_adminObtenerInstantaneas`, etc.

---

## 4. LÓGICA DE NEGOCIO A CONSERVAR

Al reconstruir V4 sobre una base limpia de código, la siguiente lógica de negocio (implementada en V3) debe ser conservada:

- **Validaciones Rígidas:**
  Las reglas descritas en `CR_REGLAS_RESERVA`, `CR_REGLAS_CLIENTE` y `CR_REGLAS_MESAS` (ubicadas en `00_Config.gs`), así como la validación de horas en el futuro, cierres de servicio de comida/cena y bloqueos para reservas ya terminadas/canceladas (como las implementadas en `04_Reservas.gs`).

- **Normalización de Datos (`04_Reservas.gs` / Utilidades):**
  El recálculo de turnos por defecto (COMIDA / CENA) y la normalización y estandarización estricta de fechas (`YYYY-MM-DD`), tiempos y teléfonos (mediante `CR_Util_normalizarTelefono` y conversores de fecha ISO).

- **Manejo del Estado de Reservas:**
  Toda la matriz de cambios de estado, sus transiciones (PENDIENTE -> CONFIRMADA -> SENTADA -> FINALIZADA / CANCELADA) y las liberaciones lógicas de mesas (ej. un "CANCELADA" o "FINALIZADA" debe desasignar).

- **Estadísticas de Clientes:**
  La agregación de contadores de un cliente (Reservas Totales, Sentadas, Canceladas, No Presentado, Última Visita) basándose en las interacciones de sus reservas.

- **Routing del Panel (Público y Privado):**
  La separación clara en el servidor e interfaz entre "peticiones con rol ADMIN" (donde pueden sobreescribir lógicas de fecha en el pasado) frente a peticiones del Panel Público (sólo originando desde formularios de clientes con comprobación de solapamientos / duplicados).

---

## 5. IMPLEMENTACIÓN SUPABASE DE REFERENCIA

La arquitectura correcta en V4 deberá enfocarse de manera exclusiva en Supabase, utilizando de referencia la estructura y adaptadores que se prepararon para V3:

- **Supabase Adapter (`02_Datos_Supabase.gs`, `02_Supabase_Cliente.gs`):**
  Toda interacción debe canalizarse a través de fetch HTTP (`UrlFetchApp`) mediante `CR_Supabase_peticion_` y llamadas REST/RPC, haciendo uso de los JSON web tokens (Bearer + apiKey).

- **Delegación a RPC (Remote Procedure Calls):**
  Operaciones sensibles como `cr_crear_reserva_autoritativa`, `cr_actualizar_reserva_autoritativa`, `cr_asignar_mesas_reserva_autoritativa` o la captura y escalada de fallos de persistencia (vía DDL / SQL triggers/policies probados).

- **Seguridad en Reposo (RLS):**
  Ceder las validaciones de acceso de nivel de fila al propio Postgres de Supabase para evitar accesos indebidos o fugas de datos de configuración por usuarios anónimos en el caso de la API pública.

- **Generadores Autoritativos de Identificadores:**
  El uso de secuencias `reservas_id_visible_seq` en Postgres en vez de contar sobre columnas del Spreadsheet.

---

## 6. PUNTOS QUE NO PUEDEN DETERMINARSE CON CERTEZA

A raíz de la revisión estática y la limitación del acceso al entorno Supabase activo:

1. **La Coherencia del Schema en Producción:**
   Si las migraciones de RPC de `actualizarReserva` han sido lanzadas en su última versión o si pueden tener regresiones operativas por culpa de llamadas a Supabase RPC mal dimensionadas. Esto debe comprobarse localmente en la instancia real de Postgres.

2. **Performance Efectiva sobre Supabase:**
   Actualmente hay búsquedas o conteos en Supabase (`02_Datos_Supabase.gs`) que pueden estar obteniendo todos los registros de una tabla sin filtros de PostgREST suficientes o paginación, lo cual se ocultaba en V3 en parte por la carga en RAM del Spreadsheet. Su escalabilidad en V4 deberá ser optimizada sobre el cliente.

3. **La causa histórica de las regresiones en código:**
   Al ser un clon de Github restringido (`--depth=1` o ramas purgadas), no se puede encontrar el commit / PR preciso que reintrodujo la regresión `const existente = CR_DatosSheets_obtenerReservaPorId(entrada.reservaID);`. Queda claro que se usó como parche/hotfix temporal en un momento del desarrollo de V3 por algún fallo de inicialización de turnos en las actualizaciones, pero no se eliminó al migrar.

---
*Este informe cierra el diagnóstico V3 en miras de preparar el código limpio V4.*