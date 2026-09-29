# AUDITORÍA MESAS V2 → V4

## Objetivo

Este documento será la matriz de control para comprobar, regla por regla, que Camborio Reservas V4 reproduce la gestión de mesas de V2.

**Fuente de verdad funcional:** V2 + documentación forense V2.  
**Implementación:** V4 React/Capacitor + Supabase.  
**Regla:** no cambiar UI cerrada/validada salvo petición expresa; primero auditar, después corregir.

## Estados de auditoría

- **IMPLEMENTADA**: existe en V4 y la evidencia demuestra que cumple.
- **PARCIAL**: existe, pero falta una parte o hay una protección incompleta.
- **FALTA**: no existe o contradice V2.
- **NO COMPROBADA**: no hay evidencia suficiente todavía.
- **NO APLICA**: solo si se demuestra documentalmente que no corresponde a V4.

## Matriz inicial

| ID | Regla | V4 | Evidencia V4 | Acción |
|---|---|---|---|---|
| M01 | Una reserva tiene un único identificador | NO COMPROBADA | — | Auditar modelo/render |
| M02 | Primera mesa = principal | NO COMPROBADA | — | Auditar asignación |
| M03 | Resto = adicionales | NO COMPROBADA | — | Auditar modelo/render |
| M04 | Multi-mesa sigue siendo una reserva | NO COMPROBADA | — | Auditar plan + DB |
| M05 | Todas las mesas muestran el mismo ID de reserva | NO COMPROBADA | — | Auditar plano |
| M06 | Fecha de asignación = fecha de reserva | NO COMPROBADA | — | Auditar backend |
| M07 | Turno de asignación = turno de reserva | NO COMPROBADA | — | Auditar backend |
| M08 | COMIDA/CENA independientes | NO COMPROBADA | — | Auditar plan/queries |
| M09 | No sentar reserva de otra fecha desde plano actual | NO COMPROBADA | — | Auditar acción SENTAR |
| M10 | No sentar reserva de otro turno | NO COMPROBADA | — | Auditar acción SENTAR |
| M11 | Estados asignables limitados | NO COMPROBADA | — | Auditar estados |
| M12 | SENTADA mantiene bloqueo | NO COMPROBADA | — | Auditar transición |
| M13 | Finalizar libera todas las mesas | NO COMPROBADA | — | Auditar servicio/RPC |
| M14 | Cancelar libera todas las mesas | NO COMPROBADA | — | Auditar servicio/RPC |
| M15 | Mesa inexistente rechazada | NO COMPROBADA | — | Auditar DB |
| M16 | Zona coherente con mesa principal | NO COMPROBADA | — | Auditar DB |
| M17 | No mesa repetida | NO COMPROBADA | — | Auditar DB |
| M18 | Uniones respetan Unible/GrupoUnion | NO COMPROBADA | — | Auditar tablas/config |
| M19 | Capacidad respeta reglas de unión | NO COMPROBADA | — | Auditar selección |
| M20 | Misma fecha+turno+mesa = conflicto | NO COMPROBADA | — | Auditar constraint/RPC |
| M21 | Distinto turno no colisiona | NO COMPROBADA | — | Auditar queries |
| M22 | Distinta fecha no colisiona | NO COMPROBADA | — | Auditar queries |
| M23 | La propia reserva no colisiona consigo misma | NO COMPROBADA | — | Auditar reasignación |
| M24 | Protección frente a concurrencia | NO COMPROBADA | — | Auditar DB/RPC |
| M25 | Cambio COMIDA↔CENA limpia todas las mesas | NO COMPROBADA | — | Auditar update |
| M26 | Cambio de turno limpia principal + adicionales | NO COMPROBADA | — | Auditar servicio |
| M27 | Cambio de fecha mantiene coherencia | NO COMPROBADA | — | Auditar update |
| M28 | SIN ASIGNAR abre reserva + plano correcto | NO COMPROBADA | — | Auditar UI |
| M29 | Plano abre reserva completa desde cualquier mesa | NO COMPROBADA | — | Auditar interacción |
| M30 | Guardar solo con cambios | NO COMPROBADA | — | Auditar UI |
| M31 | Fallo de guardado no produce falso éxito | NO COMPROBADA | — | Auditar estado |
| M32 | Liberación completa sin mesas fantasma | NO COMPROBADA | — | Auditar refresh/realtime |
| M33 | Acciones de sentar/finalizar respetan contexto | NO COMPROBADA | — | Auditar handlers |
| M34 | Estados/leyendas del plano corresponden al backend | NO COMPROBADA | — | Auditar render |
| M35 | Asignación multi-mesa es atómica | NO COMPROBADA | — | Auditar RPC/transacción |

## Pruebas mínimas obligatorias

### A. Fecha/turno
1. Reserva miércoles COMIDA → intentar sentar desde miércoles CENA.
2. Reserva sábado → intentar sentar desde miércoles.
3. Misma mesa miércoles COMIDA y miércoles CENA.
4. Misma mesa miércoles y sábado.
5. Cambiar una reserva COMIDA→CENA con 3 mesas asignadas.
6. Cambiar fecha manteniendo turno.
7. Cambiar fecha y turno simultáneamente.

### B. Multi-mesa
1. Asignar 1+2+3.
2. Confirmar 1 como principal y 2/3 como adicionales.
3. Abrir mesa 1.
4. Abrir mesa 2.
5. Abrir mesa 3.
6. Comprobar que las tres abren la misma reserva.
7. Comprobar que las tres muestran el mismo número/identificador.
8. Quitar una adicional.
9. Quitar principal.
10. Finalizar y comprobar que se liberan las tres.

### C. Concurrencia
1. Dos dispositivos intentan asignar la misma mesa al mismo tiempo.
2. Dos reservas intentan asignar el mismo grupo.
3. Reasignar una reserva sobre sus propias mesas.
4. Confirmar que no existe doble bloqueo.

### D. Estados
1. PENDIENTE con mesa.
2. CONFIRMADA con mesa.
3. SENTADA con mesa.
4. Finalizada.
5. Cancelada.
6. No-show.
7. Intentar asignar en estados no asignables.

## Prioridad

### P0 — integridad del negocio
- fecha/turno;
- sentar/finalizar/cancelar;
- colisiones;
- liberación completa;
- multi-mesa como una sola reserva;
- cambio de turno.

### P1 — contrato de asignación
- principal/adicional;
- uniones;
- capacidad;
- zona;
- estados;
- concurrencia.

### P2 — comportamiento del plano
- identificación visual común;
- abrir reserva desde cualquier mesa;
- SIN ASIGNAR;
- refresco/realtime;
- leyendas.

## Regla de trabajo

No corregir nada mientras esta auditoría no haya identificado el problema concreto.

Para cada fallo:
1. localizar causa;
2. documentar archivo/función;
3. preparar un único cambio;
4. crear PR;
5. revisar PR;
6. fusionar;
7. generar APK;
8. probar;
9. volver a auditar.

**Este documento no autoriza todavía cambios de código.**
