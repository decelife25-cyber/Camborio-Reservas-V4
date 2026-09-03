# 01. RESUMEN EJECUTIVO

## 1. OBJETIVO DE LA AUDITORÍA
Se ha llevado a cabo una auditoría forense del repositorio `Camborio-Reservas-V2` para comprender su estado final, sus lógicas de negocio, y las arquitecturas de bases de datos subyacentes con el fin de proyectar el diseño y construcción de **Camborio Reservas V4**.

El objetivo no es modificar la V2, sino analizarla para garantizar que V4 herede lo necesario, deseche el código Legacy (Google Sheets) y se construya con una arquitectura más limpia centrada en Supabase/PostgreSQL.

## 2. ESTADO ACTUAL DE V2
- **Backend Activo:** Supabase (PostgreSQL). Toda lectura y escritura ordinaria se resuelve usando el adaptador Supabase (ver `CR_DATOS_BACKEND = 'SUPABASE'` en `02_Datos.gs` y las pruebas `supabase_backend_oficial.test.js`).
- **Arquitectura Legacy Descartada:** El repositorio incluye todavía una implementación de persistencia basada en Google Sheets (e.g. `02_Datos_Sheets.gs`). Este backend se considera LEGACY y no se reutilizará en V4.
- **Interfaces Públicas y Privadas:** Existen flujos de UI y backend tanto para clientes (Publico) como para personal (Privado), con controles de acceso y reglas de validación separadas, lo cual sustenta la necesidad en V4 de dividir el frontend en una PWA pública y un APK privado.

## 3. CONCLUSIONES PRINCIPALES
1. **El contrato de la base de datos de Supabase está consolidado.** V2 utiliza un esquema robusto basado en tablas core como `reservas`, `clientes`, `mesas`, `horarios` y generadores propios (RPC como `cr_generar_codigo_reserva`).
2. **Lógica de negocio rica y validada.** Las reglas sobre asignación de mesas, turnos, capacidad, bloqueos de clientes, notificaciones de reservas y horarios de corte Comida/Cena están ya comprobadas y deben migrarse intactas.
3. **Desacoplamiento pendiente para V4.** La V2 mezcla archivos UI (`.html`) y backend (`.gs`) dentro de Google Apps Script. V4 deberá romper esa dependencia, usando una base de datos central en Supabase pero ejecutando el frontend nativamente o como web en sus respectivos clientes (PWA y APK).
4. **Desarrollo Limpio.** Ninguna pieza de código heredado de Sheets, SpreadsheetsApp o de integración de Apps Script se llevará a V4; en su lugar, se adoptará el contrato de datos SQL existente.

## 4. PRÓXIMOS PASOS (V4)
- Mantener y expandir el esquema SQL actual que utiliza la V2 (Supabase).
- Construir un backend independiente (o utilizar el acceso directo a Supabase API/Edge Functions) para la lógica de la aplicación.
- Implementar la PWA para uso de clientes y el APK con control de acceso por PIN para uso exclusivo de empleados.
