# 11. PLAN DE PRUEBAS V4

Se requiere probar rigurosamente las lógicas portadas de V2 a V4 para evitar regresiones de disponibilidad o colisiones en el restaurante.

## MATRIZ DE PRUEBAS FUNCIONALES

| FUNCIONALIDAD | ENTRADA / CONDICIÓN | RESULTADO ESPERADO | TABLAS AFECTADAS | VALIDACIÓN / RPC |
| --- | --- | --- | --- | --- |
| **Crear Reserva** (Nuevo Cliente) | Teléfono y nombre nuevos, hora válida. | Nueva reserva en estado PENDIENTE, nuevo cliente creado. | `reservas`, `clientes` | `cr_crear_reserva_autoritativa` crea ambas. |
| **Crear Reserva** (Cliente Existente)| Teléfono que ya existe en DB. | Nueva reserva, actualiza `nombre_ultimo` en cliente. | `reservas`, `clientes` | `cr_crear_reserva_autoritativa` hace `ON CONFLICT DO UPDATE`. |
| **Crear Reserva Duplicada** | Mismo teléfono, fecha y turno. | Error (transacción rechazada). | N/A | Bloqueo manual/lógico para evitar duplicidad. |
| **Consultar Reserva** | Teléfono exacto, Código exacto. | Muestra detalles de la reserva. | Ninguna (lectura) | Lectura PWA. |
| **Modificar Reserva** (Sin Cambio Turno) | Cambiar de 4 a 6 personas. | Guarda cambios sin alterar asignaciones previas. | `reservas`, `log` | `cr_actualizar_reserva_autoritativa` (o lógica de app). |
| **Modificar Reserva** (Con Cambio Turno) | De las 14:00 (COMIDA) a 21:00 (CENA) | Se limpia el campo `mesa` y `mesas_adicionales`. | `reservas`, `log` | Lógica app de `04_Reservas.gs`. |
| **Cancelar Reserva Cliente** | Cancela una reserva PENDIENTE. | Estado `CANCELADA_CLIENTE`, fecha mod actualizada. | `reservas`, `clientes` (estadísticas), `log` | `cr_actualizar_reserva_autoritativa`. |
| **Cancelar Reserva Cliente (Prohibido)** | Intenta cancelar reserva SENTADA. | Error: No se puede cancelar. | N/A | Lógica de app. |
| **Asignar Mesas Simples** | Mesa 20 a una reserva. | Mesa 20 queda no disponible en ese turno. | `reservas` | Lógica de colisión en app (leer ocupación). |
| **Asignar Mesas Grupo** | Unir Mesa 20 y 22. | Reserva recibe `Mesa: 20` y `MesasAdicionales: 22`. | `reservas` | Lógica app (validar capacidad y grupo unión). |
| **Horario No Disponible** | Fecha inactiva o pasada. | La PWA no permite reservar. | Ninguna | Lógica app (`11_Horarios.gs`). |
| **Bloqueo Cliente** | Teléfono bloqueado intenta reservar. | Lanza excepción y rechaza solicitud. | Ninguna | Lógica pre-inserción. |
