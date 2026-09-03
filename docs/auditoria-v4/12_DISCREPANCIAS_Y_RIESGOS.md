# 12. DISCREPANCIAS Y RIESGOS DESCUBIERTOS EN V2

Durante la auditoría del proyecto, se identificaron varios riesgos y discrepancias entre la implementación actual, el diseño original y las proyecciones para V4:

## 1. ACOPLAMIENTO DE NEGOCIO Y VISTAS
- **Problema:** En V2 (Google Apps Script), las validaciones y lógicas de estado residen en archivos híbridos y se ejecutan en un único hilo al recibir peticiones `.html`.
- **Comportamiento Esperado (V4):** La lógica core debe ser independiente (una API limpia o Edge Functions) y el frontend debe ser solo vista (PWA/APK).
- **Riesgo:** Copiar código ciegamente podría acoplar la UI de V4 con lógica de backend.
- **Solución:** Abstraer los módulos (`04_Reservas.gs`, `05_Mesas.gs`) en librerías tipadas (`.ts`).

## 2. ELIMINACIÓN DE UNIQUE CONSTRAINT EN TURNO
- **Problema:** La migración 004 eliminó la regla estricta `UNIQUE (telefono, fecha_reserva, turno)` de PostgreSQL.
- **Código Actual:** En `04_Reservas.gs`, antes de crear/modificar, el servidor utiliza bloqueos (`LockService`) e inspecciona manualmente las reservas del día para rechazar duplicados.
- **Riesgo (V4):** Al no tener `LockService` en V4, si dos peticiones entran simultáneamente, un cliente podría tener dos reservas en el mismo turno si el frontend o la Edge Function no gestionan bien la concurrencia (condición de carrera).
- **Solución:** Implementar la validación en una transacción SQL directa (`SELECT ... FOR UPDATE` o similar) o mediante un trigger que tire una excepción antes de insertar si existe ya una reserva activa para ese teléfono en ese turno.

## 3. IDENTIFICADORES MIXTOS EN MESAS
- **Problema:** Las tablas usan UUIDs nativos para `reserva_id` y `cliente_id`, pero el código frecuentemente utiliza el número en texto para las mesas (ej. `'19'`, `'20'`) ignorando si la base de datos tuviera un `mesa_id`.
- **Riesgo:** Rupturas en integridad referencial si un restaurante cambia de mesas, pues se guardan strings.
- **Solución:** En V4, estandarizar el uso de `mesa_id` (UUID) para todas las asignaciones o hacer estricto el tipo de dato.

## 4. DEPENDENCIA DE ZONA HORARIA
- **Problema:** `00_Config.gs` asume `Europe/Madrid`. El formato `DATE` de PostgreSQL puede generar conflictos con el frontend (ej. si el cliente está temporalmente en Canarias, su navegador enviaría horas desfasadas).
- **Solución:** La PWA de V4 y el APK deben forzar u operar siempre con `Europe/Madrid` en todas las fechas, y enviarlas al backend ya normalizadas sin depender de la hora local del navegador.
