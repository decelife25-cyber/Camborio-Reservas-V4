# BIBLIA DE REGLAS DE MESAS — V2 → V4

> Documento de referencia permanente. V2 es la fuente funcional de verdad. V4 debe reproducir estas reglas adaptándolas a React/Capacitor + Supabase, sin reintroducir Apps Script/Sheets ni inventar reglas nuevas.

## 0. Principio rector

La gestión de mesas es el núcleo funcional de Reservas. El mismo conjunto de reglas debe gobernar:
- plano de mesas;
- asignación y retirada de mesas;
- mesas unidas/adicionales;
- estados de la reserva;
- fecha y turno;
- sentar/ocupar;
- finalizar/no-show/cancelar;
- modificación de reservas;
- liberación de mesas;
- representación visual de una reserva con varias mesas.

Una regla no está realmente implementada si solo existe en la UI: debe estar protegida por la lógica de negocio y, cuando corresponda, por la base de datos/transacción.

## 1. Identidad de la reserva

1. Cada reserva tiene un único identificador.
2. Todas las mesas asignadas a una misma reserva pertenecen a esa misma reserva.
3. Una reserva con varias mesas sigue siendo UNA reserva.
4. La primera mesa seleccionada es la mesa principal.
5. Las restantes son mesas adicionales.
6. La relación principal/adicional debe conservarse al guardar.
7. En el plano, todas las mesas de una misma reserva deben poder identificarse como pertenecientes al mismo identificador/número de reserva; no deben aparecer como tres reservas independientes.
8. Al abrir una mesa ocupada/asignada, el sistema debe poder localizar la reserva completa y, si tiene varias mesas, identificar el conjunto completo.

## 2. Fecha y turno

1. Toda asignación pertenece a una fecha y a un turno.
2. COMIDA y CENA son contextos independientes.
3. Una mesa ocupada en COMIDA no queda ocupada automáticamente en CENA.
4. Una mesa ocupada en CENA no queda ocupada automáticamente en COMIDA.
5. Una reserva de una fecha no puede ser sentada/finalizada desde el contexto de otra fecha.
6. Ejemplo: una reserva del sábado no puede sentarse desde el plano del miércoles. Se puede modificar la reserva si las reglas lo permiten, pero no ejecutar la acción de sentar/finalizar como si perteneciera al miércoles.
7. Las comprobaciones de fecha y turno deben hacerse en backend, no solo visualmente.
8. La asignación almacenada debe conservar coherencia entre fecha/turno de la reserva y fecha/turno de la asignación.

## 3. Estados y asignabilidad

1. Las mesas activas de una reserva solo pueden bloquearse mientras el estado de la reserva sea asignable/bloqueante.
2. En el contrato V2, los estados que pueden tener asignación activa son PENDIENTE, CONFIRMADA y SENTADA.
3. Estados finales/cancelados/no asignables no deben conservar mesas bloqueantes.
4. Al pasar a un estado que libera mesas, deben liberarse TODAS las mesas de la reserva, no solo la principal.
5. SENTADA mantiene bloqueadas las mesas asignadas.
6. No debe ser posible asignar mesas a una reserva que no pueda tener asignación según su estado.

## 4. Sentar una reserva

1. Sentar es una operación de negocio, no simplemente cambiar un color.
2. Antes de sentar debe comprobarse que la reserva corresponde a la fecha/turno del contexto actual.
3. Deben comprobarse las mesas de la reserva completa.
4. No se puede sentar utilizando una mesa de otro turno.
5. No se puede sentar una reserva de otra fecha desde el plano actual.
6. Si la reserva requiere mesa y no tiene una asignación válida, sentar debe quedar bloqueado.
7. Una reserva con varias mesas debe conservar todas sus mesas al sentarse.
8. La operación debe ser consistente si dos dispositivos intentan actuar simultáneamente.

## 5. Finalizar / no-show

1. Finalizar una reserva debe liberar todas sus mesas.
2. No debe quedar bloqueada la mesa principal mientras las adicionales se liberan, ni al contrario.
3. El estado final debe dejar la asignación sin bloqueo.
4. La acción debe respetar fecha/turno/contexto.
5. La liberación debe ser atómica cuando la operación lo requiera.

## 6. Cancelar

1. Una reserva cancelada no debe mantener mesas bloqueantes.
2. Deben liberarse todas las mesas asociadas.
3. La liberación no puede limitarse a `Mesa`; debe incluir las mesas adicionales.
4. Deben respetarse las restricciones de estado existentes en V2 para cancelar reservas ya sentadas/finalizadas.

## 7. Existencia y validez de la mesa

1. La mesa asignada debe existir.
2. La mesa debe estar activa/disponible para gestión.
3. No se puede guardar una referencia a una mesa inexistente.
4. Debe existir una validación equivalente al contrato V2 de `CR_MESA_INEXISTENTE`.
5. La zona debe ser coherente con la mesa principal.
6. No se deben aceptar combinaciones de zona/mesa incoherentes.

## 8. Mesa principal

1. Debe existir como máximo una mesa principal por asignación activa.
2. La primera mesa seleccionada es la principal.
3. Las demás son adicionales.
4. Al modificar la selección debe mantenerse una única principal.
5. Si se elimina la principal, debe definirse correctamente la nueva principal según las reglas de V2 o rechazarse la operación; nunca quedar una asignación activa sin principal.

## 9. Mesas adicionales / mesas unidas

1. Una reserva puede ocupar varias mesas.
2. Las mesas adicionales pertenecen a la misma reserva.
3. Ejemplo: mesas 1, 2 y 3 = una sola reserva; 1 principal + 2 y 3 adicionales.
4. No se deben crear tres reservas para representar una reserva de tres mesas.
5. No se puede repetir la misma mesa dentro de una asignación.
6. Debe existir una validación equivalente a `CR_MESA_REPETIDA`.
7. Las operaciones de unir/asignar deben respetar las combinaciones permitidas por la configuración de mesas.
8. Las propiedades V2 `Unible` y `GrupoUnion` forman parte del contrato funcional y deben auditarse antes de replicarlas.
9. La capacidad total y las reglas de unión deben respetarse.
10. El grupo de mesas debe ser coherente con la reserva y su capacidad.

## 10. Colisiones

1. La misma mesa no puede estar bloqueada por dos reservas activas en la misma fecha y turno.
2. Misma fecha + mismo turno + misma mesa = conflicto.
3. Misma fecha + distinto turno = no es el mismo conflicto.
4. Distinta fecha = no es el mismo conflicto.
5. Al reasignar una reserva, su propia asignación actual no debe considerarse una colisión contra sí misma.
6. La comprobación debe excluir la propia reserva cuando corresponda.
7. La protección definitiva contra carreras debe existir en base de datos/índice/transacción, no solo en frontend.
8. El contrato V2 usa una garantía de unicidad parcial sobre `(fecha_reserva, turno, mesa_id)` para asignaciones activas y bloqueantes.
9. Deben contemplarse errores de concurrencia equivalentes a `CR_COLISION_CONCURRENTE` / `CR_MESA_OCUPADA_CONCURRENTEMENTE`.

## 11. Coherencia de la asignación

La relación de mesas normalizada de V2 contiene, entre otros:
- `reserva_id`
- `mesa_id`
- `es_principal`
- `orden`
- `fecha_reserva`
- `turno`
- `activa`
- `bloquea`

Reglas:
1. La fecha de la asignación debe coincidir con la reserva.
2. El turno de la asignación debe coincidir con la reserva.
3. `bloquea` debe ser coherente con que la asignación esté activa y el estado de la reserva sea bloqueante.
4. No debe existir una asignación activa incoherente.
5. El sistema debe poder diagnosticar inconsistencias.

## 12. Cambio de turno

1. Si una reserva cambia de COMIDA a CENA o de CENA a COMIDA, todas las mesas asignadas deben limpiarse antes de persistir el nuevo turno.
2. Deben limpiarse la principal y todas las adicionales.
3. Debe limpiarse también la zona/estado derivado relacionado con la asignación.
4. No se debe trasladar automáticamente una mesa de un turno al otro.
5. Después del cambio, la reserva queda sin asignación y puede volver a asignarse en el nuevo turno.
6. Esta regla es crítica y debe estar protegida por lógica de negocio/backend.

## 13. Cambio de fecha sin cambio de turno

1. Si cambia la fecha y el turno sigue siendo el mismo, la asignación no debe darse por válida automáticamente.
2. Debe revalidarse contra la nueva fecha.
3. Si existe conflicto en la nueva fecha, la operación debe rechazarse o limpiar/reasignar según el contrato V2.
4. Nunca debe quedar una asignación apuntando a una fecha distinta de la reserva.

## 14. Plano de mesas

1. El plano representa disponibilidad por fecha y turno.
2. No debe mezclar COMIDA y CENA.
3. Una mesa ocupada/asignada debe mostrar el estado correspondiente a ese contexto.
4. Una mesa perteneciente a una reserva de varias mesas debe mostrar que forma parte del mismo conjunto.
5. Al pulsar una mesa asignada debe poder recuperarse la reserva completa.
6. Al pulsar SIN ASIGNAR debe abrirse el contexto de la reserva y permitir asignar mesas para su fecha/turno.
7. Las leyendas de estados deben corresponder a los estados reales del sistema.
8. El plano no debe permitir acciones inválidas solo porque visualmente la mesa parezca libre.

## 15. Representación de una reserva con varias mesas

Regla visual/funcional obligatoria:
- Reserva 123 con mesas 1, 2 y 3:
  - Mesa 1 = principal.
  - Mesas 2 y 3 = adicionales.
  - Las tres deben resolver al mismo `reserva_id`.
  - Las tres deben mostrar/identificar la misma reserva 123.
  - El usuario debe poder abrir la reserva completa desde cualquiera de las tres.
  - No deben aparecer como tres reservas independientes.

## 16. Cambios y guardado

1. El selector de mesas debe detectar cambios pendientes.
2. Guardar solo debe estar habilitado cuando haya cambios.
3. Cancelar debe cerrar sin guardar cambios.
4. Mientras se guarda debe impedirse doble operación.
5. Las asignaciones deben persistirse de forma consistente.
6. Si falla el guardado, la UI no debe fingir que la asignación se ha realizado.

## 17. SIN ASIGNAR

1. Significa que la reserva existe pero no tiene asignación válida.
2. Debe abrir los datos de la reserva.
3. Debe abrir/permitir el plano correspondiente a su fecha y turno.
4. No debe permitir asignarla a otro turno/fecha por accidente.
5. Debe utilizar las mismas reglas de mesas que cualquier otra asignación.

## 18. Integridad y concurrencia

1. La UI no es la garantía final.
2. El backend/base de datos debe impedir asignaciones incompatibles.
3. La operación de asignación debe bloquear/coordinar reserva y mesas cuando sea necesario.
4. El orden de bloqueo debe ser estable para evitar carreras/deadlocks.
5. El índice único parcial es la última barrera frente a concurrencia.
6. Los errores de concurrencia deben llegar a la UI como error funcional comprensible y no como falso éxito.

## 19. Liberación

Cuando una reserva deja de bloquear mesas:
- liberar principal;
- liberar todas las adicionales;
- eliminar/actualizar la relación activa;
- actualizar el plano;
- evitar que quede una mesa fantasma bloqueada.

## 20. Operaciones que deben auditarse en V4

- asignar una mesa simple;
- asignar un grupo de mesas;
- quitar una mesa;
- quitar todas;
- cambiar principal/adicional;
- modificar reserva sin cambiar turno;
- modificar reserva cambiando turno;
- modificar fecha;
- sentar;
- finalizar;
- no-show;
- cancelar;
- abrir una mesa desde el plano;
- abrir una reserva desde SIN ASIGNAR;
- conflicto de mesa;
- doble asignación concurrente;
- misma mesa en COMIDA y CENA;
- misma mesa en fechas distintas;
- reserva de otra fecha/turno intentando sentarse desde el plano actual;
- reserva multi-mesa mostrando un único identificador;
- liberación completa de todas las mesas.

## 21. Errores/contratos V2 a conservar o equivalentes

Como mínimo deben existir validaciones equivalentes para:
- `CR_MESA_INEXISTENTE`
- `CR_MESA_REPETIDA`
- `CR_ZONA_INVALIDA`
- `CR_ESTADO_NO_ASIGNABLE`
- `CR_COLISION_CONCURRENTE`
- `CR_MESA_OCUPADA_CONCURRENTEMENTE`

Los nombres pueden adaptarse a V4, pero la regla funcional no.

## 22. Regla de oro para V4

Antes de considerar terminada la gestión de mesas:

> **No basta con que el plano se vea bien. La reserva, su fecha, su turno, su estado, su mesa principal, sus mesas adicionales, sus uniones, su capacidad, sus colisiones, sus operaciones de sentar/finalizar/cancelar y su liberación deben obedecer el mismo contrato funcional.**

V2 es la referencia. V4 solo adapta la implementación tecnológica.

## 23. Pendientes de verificación documental antes de cerrar el contrato

Estas cuestiones deben verificarse directamente en código/documentación V2 antes de convertirlas en reglas cerradas:
- regla exacta de la mesa 19;
- combinaciones concretas permitidas por `Unible`/`GrupoUnion`;
- regla exacta de capacidad para cada grupo;
- restricciones exactas de cancelar una reserva ya SENTADA;
- transición exacta de todos los estados de reserva;
- umbral horario exacto de COMIDA/CENA y cualquier excepción;
- cualquier regla especial de zonas.

---
**Estado:** Biblia funcional inicial V2 → V4.  
**Siguiente paso obligatorio:** auditar V4 contra cada punto y marcar IMPLEMENTADA / PARCIAL / FALTA / NO COMPROBADA, con archivo y función como evidencia.
