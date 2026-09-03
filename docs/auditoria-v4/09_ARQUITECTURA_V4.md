# 09. ARQUITECTURA V4 (PROPUESTA)

## INFRAESTRUCTURA CENTRAL
**Supabase (PostgreSQL + Auth + Edge Functions)**
- La fuente de verdad absoluta de V4 será el contrato de datos auditado en `04_CONTRATO_BASE_DATOS.md`.
- **Row Level Security (RLS):** Diferenciará drásticamente entre llamadas de clientes anónimos y del personal autenticado.
- Las transacciones pesadas y complejas (e.g., creación atómica de cliente y reserva previniendo duplicados) seguirán residiendo en **RPC** para seguridad y rendimiento.

## 1. PWA PÚBLICA (CLIENTES)
- **Despliegue:** Aplicación Web Accesible vía URL (Next.js, Vue, o React) alojada en Vercel, Netlify o similar.
- **Roles y Permisos:**
  - Rol de Supabase: `anon` (anónimo).
  - Puede consultar horarios disponibles.
  - Puede insertar una reserva (ejecutando `cr_crear_reserva_autoritativa` u otro endpoint seguro).
  - Puede consultar/modificar/cancelar SÓLO si proporciona el par único `(telefono, codigo_reserva)`.
- **Enfoque:** Experiencia de usuario móvil fluida, carga rápida y foco en conversión (hacer reservas fácilmente).

## 2. APK PRIVADA (PERSONAL)
- **Despliegue:** Aplicación móvil instalable en tablets/móviles Android del restaurante (construida con React Native, Flutter, Capacitor, etc.).
- **Roles y Permisos:**
  - Rol de Supabase: `authenticated` (autenticado) vinculado a usuarios de Supabase Auth.
  - El sistema de PIN actual (`09_Seguridad.gs`) se debería mapear a sesiones seguras de Supabase.
  - Acceso total a lecturas de reservas, clientes y modificaciones de estado, así como escritura de configuraciones y bloqueos de cliente.
- **Enfoque:** Velocidad, gestión rápida de estados y mesas durante un servicio en tiempo real.

## CÓDIGO COMPARTIDO
Si ambas (PWA y APK) se desarrollan con tecnologías web/JS (e.g. React/React Native o Capacitor), el repositorio V4 debería ser un monorepo que comparta un paquete `core-logic` donde residirán las adaptaciones de:
- Validación de teléfonos españoles.
- Formateo de fechas y validación de turnos basados en corte de horario.
- Lógica de uniones de grupos de mesas.
