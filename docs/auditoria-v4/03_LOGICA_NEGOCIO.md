# 03. LÓGICA DE NEGOCIO

## 1. RESERVAS (`04_Reservas.gs`)
- **Creación:** Se valida el nombre, teléfono y correo electrónico (opcional). Se genera el `CodigoReserva` y el `Turno` en base a la `HoraReserva`. Se impide crear si el cliente ya tiene una reserva con el mismo teléfono para ese día y turno. El estado inicial por defecto para el cliente es `PENDIENTE` (o `CONFIRMADA` si lo crea el personal y se establece).
- **Identificadores:** `ReservaID` (UUID) y `CodigoReserva` (Texto corto generado con RPC). `ReservaID` se usa para operaciones internas, `CodigoReserva` + Teléfono para el panel público.
- **Estados:** PENDIENTE -> CONFIRMADA -> SENTADA -> FINALIZADA. También puede ser CANCELADA_CLIENTE, CANCELADA_LOCAL o NO_PRESENTADO.
- **Modificación:** Solo permitida en estados `PENDIENTE` o `CONFIRMADA`. Si se modifica la fecha/hora y hay cambio de turno, se desasigna la mesa.
- **Cancelación:** Cambia el estado a `CANCELADA_CLIENTE` o `CANCELADA_LOCAL`.
- **Logs:** Cualquier acción (Creación, Modificación, Confirmación, Cambio Estado) se registra mediante `CR_Reservas_registrarLog`.

## 2. CLIENTES (`03_Clientes.gs`)
- **Búsqueda/Creación:** Al reservar, si el cliente no existe (por Teléfono normalizado), se crea uno nuevo con estadísticas a 0 (ReservasTotales, Confirmadas, Canceladas, Sentadas, NoPresentados). Si existe, se actualizan el NombreUltimo y EmailUltimo.
- **Bloqueos:** Antes de operar con un cliente, se verifica la lista negra usando el teléfono. Si el cliente está bloqueado, se lanza un error.
- **Estadísticas:** Tras los cambios de estado en las reservas (Confirmada, Sentada, Cancelada, etc.), se incrementan los contadores pertinentes para analizar la "confiabilidad" del cliente.

## 3. MESAS (`05_Mesas.gs`)
- **Capacidad y Zonas:** Cada mesa pertenece a una zona (Salón, Terraza, Chill Out) y tiene una capacidad máxima.
- **Disponibilidad y Asignación:** La mesa 19 es especial y suele estar inactiva por defecto. Las mesas se asignan a Reservas.
- **Grupos de Unión:** Las mesas que se pueden unir (`Unible = true`) comparten un `GrupoUnion`. Esto permite asignar `MesasAdicionales` y sumar capacidades para grupos más grandes.
- **Desasignación:** Si hay un cambio de turno, las mesas asociadas a la reserva se liberan automáticamente.

## 4. HORARIOS Y TURNOS (`11_Horarios.gs`)
- **Turnos:** `COMIDA` y `CENA`.
- **Hora de Corte:** Establecida dinámicamente o por defecto a las '18:00'. Determina si una reserva entra en el turno de comida o de cena (ej: 17:45 es COMIDA, 18:00 es CENA).
- **Disponibilidad Pública:** Solo se ofrecen las horas activas permitidas. Si el día está marcado inactivo o si todas las horas están agotadas, se rechaza la disponibilidad en el panel público.

## 5. CALENDARIO (`06_Calendario.gs`)
- **Filtros:** Separa la visualización por días o meses. Solo las reservas con estado Activo (`PENDIENTE`, `CONFIRMADA`, `SENTADA`) son mostradas inicialmente o tomadas en cuenta para estadísticas y colisiones.

## 6. NOTIFICACIONES (`07_Notificaciones.gs`)
- **Registro:** Se registran eventos de notificación (ej. correos a enviar al confirmar/cancelar).
- **Estados:** Empiezan como `PENDIENTE` y cambian a `ENVIADA` o `ERROR`.
- **Destinatario:** Teléfono o correo (en esta versión se envían emails o PDF).

## 7. SEGURIDAD (`09_Seguridad.gs`)
- **Autenticación por PIN:** Los empleados (Administrador, Camarero) acceden al panel privado introduciendo un PIN. La sesión persiste temporalmente (PropertiesService en Google Apps Script, en V4 debería ser LocalStorage/Cookies + JWT/Supabase Auth).

## 8. CONFIGURACIÓN Y ZONA HORARIA
- **Configuración (`00_Config.gs` / DB):** Contiene reglas fijas (`CR_REGLAS_MESAS`, `CR_ESTADOS_RESERVA`) y la timezone constante (`Europe/Madrid`).
- **Timestamp:** Todas las horas deben ser `Europe/Madrid`. Fechas y Horas (DATE/TIME) viajan separadas o unidas como string y se operan con cuidado para evitar discrepancias de UTC.
