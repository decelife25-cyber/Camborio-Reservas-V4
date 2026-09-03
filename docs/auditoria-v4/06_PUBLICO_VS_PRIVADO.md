# 06. PÚBLICO VS PRIVADO

Para la construcción de la V4, la aplicación deberá separarse en dos artefactos (PWA y APK) correspondientes a las vistas `Publico_*.html` y `Privado_*.html` presentes en V2.

## MATRIZ DE FUNCIONALIDADES

| Funcionalidad | PWA (Público) | APK (Privado / Personal) | Comentarios / Propuestas V4 |
| --- | --- | --- | --- |
| **Crear Reserva** | SÍ | SÍ | En público solo origen PUBLICO. En privado, origen PRIVADO. |
| **Consultar Reserva** | SÍ | SÍ | En público requiere Teléfono + Código. |
| **Modificar Reserva** | SÍ | SÍ | Público solo modifica fecha, hora, personas, nombre. Privado modifica todo (incluyendo mesa y zona). |
| **Cancelar Reserva** | SÍ | SÍ | Público genera `CANCELADA_CLIENTE`. Privado genera `CANCELADA_LOCAL`. |
| **Confirmar Reserva** | NO | SÍ | Solo personal puede confirmar (`CONFIRMADA`). |
| **Sentar / Finalizar** | NO | SÍ | Solo personal cambia a `SENTADA`, `FINALIZADA` o `NO_PRESENTADO`. |
| **Gestión de Mesas** | NO | SÍ | Asignar/Cambiar mesa (con lógica de capacidad y zonas). |
| **Directorio de Clientes**| NO | SÍ | Buscar clientes, ver historial, visitas y `clientes_bloqueados`. |
| **Configuración** | NO | SÍ | Cambiar parámetros de la app (cortes de horario, márgenes). |
| **Horarios / Turnos** | SOLO LECTURA | SÍ | Público solo lee horas activas. Privado añade/modifica horarios de apertura. |
| **Calendario General** | NO | SÍ | Vista de ocupación por día/mes para el personal. |
| **Notificaciones** | SÍ (Recepción) | SÍ (Gestión) | Público recibe correos (ej. PDF confirmación). Privado puede ver la cola. |

*(PROPUESTA PARA V4: Permitir que un cliente en PWA pueda consultar su historial de reservas completo, no solo una reserva concreta, si inicia sesión mediante OTP al teléfono).*

## SEGURIDAD Y ACCESO
- **Público (Anon):** Accede a `cr_crear_reserva_autoritativa` con políticas estrictas (RLS) que solo le permiten insertar. Las lecturas/modificaciones desde cliente público SIEMPRE exigen coincidir `Telefono` y `CodigoReserva`.
- **Privado (Auth):** Acceso integral con permisos para editar mesas, estados y clientes. En V2 usa PIN de 4 dígitos. En V4 usará Supabase Auth con JWT o un sistema equivalente de PIN encriptado.
