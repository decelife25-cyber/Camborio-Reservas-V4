# 10. PLAN DE CONSTRUCCIÓN V4

## FASE 0: AUDITORÍA Y CONTRATO (COMPLETADA)
- Se ha congelado y documentado la lógica y el estado de la base de datos de la V2.
- Contrato de Supabase verificado como 100% operativo y autoritativo.

## FASE 1: BASE DE DATOS SUPABASE V4
- Desplegar el esquema documentado (`00_auditoria_catalogo_actual.sql` y scripts de la migración) en una nueva instancia o entorno de producción puro.
- Configurar roles y políticas iniciales de **RLS** (anon vs authenticated).
- Desplegar las RPC críticas (`cr_generar_codigo_reserva`, `cr_crear_reserva_autoritativa`).

## FASE 2: NÚCLEO (CORE LOGIC)
- Escribir en un paquete TypeScript independiente las validaciones adaptadas de `04_Reservas.gs`, `05_Mesas.gs` y `11_Horarios.gs`.
- Realizar pruebas unitarias intensivas en este núcleo antes de ligarlo a UI.

## FASE 3: PWA PÚBLICA & OPERACIONES
- Crear el andamiaje del frontend público.
- Conectar a la API de Supabase de solo lectura para horarios disponibles.
- Construir el formulario de reserva, integrando llamadas a `cr_crear_reserva_autoritativa`.
- Implementar flujo de consulta, modificación y cancelación usando el binomio Teléfono + CódigoReserva.

## FASE 4: SEGURIDAD PRIVADA Y AUTH SUPABASE
- Sustituir el sistema de PIN (`09_Seguridad.gs`) por usuarios reales en Supabase Auth o un Edge Function que genere un token JWT al verificar el PIN en una tabla segura.
- Configurar políticas RLS para proteger los endpoints administrativos.

## FASE 5: APK PRIVADA
- Construir la interfaz orientada al personal (vistas diarias del calendario y gestión de estados de reservas).
- Mapear la lógica de asignación, cambio de turnos y colisiones de mesas.
- Integrar la administración de clientes (búsquedas por teléfono/nombre, bloqueos).
- Integrar gestión de parámetros (horarios de corte, márgenes de reserva).

## FASE 6: INTEGRACIÓN, NOTIFICACIONES Y PRUEBAS
- Añadir el envío de correos (que actualmente residía en G. Apps Script) usando Supabase Edge Functions + Resend / SendGrid al producirse inserciones/updates en la tabla `notificaciones`.
- Ejecutar plan de pruebas (detallado en el documento anexo).
