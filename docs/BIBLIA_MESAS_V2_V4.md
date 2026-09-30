# BIBLIA DE MESAS — V2 → V4
## Reglas maestras de plano, asignación, unión, turnos y ocupación

> **Estado:** documento de referencia permanente para la evolución funcional de Camborio Reservas V4.
>
> **Principio rector:** V2 es la referencia funcional. V4 debe reproducir sus reglas y comportamiento, adaptando únicamente la tecnología a React/Capacitor + Supabase. No se deben inventar reglas nuevas ni alterar la interfaz validada salvo petición expresa.
>
> **Uso:** antes de modificar cualquier parte relacionada con mesas, plano, asignación, sentar, finalizar, cancelar, cambio de fecha/hora o turnos, este documento debe consultarse.

---

## 1. OBJETIVO

La gestión de mesas es una pieza central del sistema.

No debe tratarse como una funcionalidad aislada del plano. Las mismas reglas deben gobernar de forma coherente:

- plano de mesas;
- selección de mesa;
- asignación de una mesa;
- asignación de varias mesas;
- mesa principal y mesas adicionales;
- mesas unidas;
- zonas;
- capacidad;
- turnos COMIDA/CENA;
- fecha de la reserva;
- estados de la reserva;
- SIN ASIGNAR;
- sentar;
- finalizar;
- cancelar/no-show;
- cambio de fecha;
- cambio de hora;
- cambio de turno;
- liberación de mesas;
- concurrencia;
- representación de una reserva con varias mesas.

**Regla fundamental:** no puede existir una lógica distinta para cada pantalla. El plano, la tarjeta de reserva y las operaciones de asignación deben consultar el mismo contrato de negocio.

---

# 2. MODELO DE UNA RESERVA

Una reserva es una única entidad.

Una reserva puede tener:

- una mesa principal;
- cero o varias mesas adicionales.

La representación conceptual es:

`Reserva → Mesa principal + Mesas adicionales`

Ejemplo:

- Reserva #125
- Mesa principal: 1
- Mesas adicionales: 2, 3

Esto sigue siendo **una sola reserva**, no tres reservas.

En V2 existe una representación histórica mediante `Mesa` + `MesasAdicionales`, y en la capa normalizada existe `reserva_mesas`.

La migración a V4 no debe perder esta semántica.

---

# 3. IDENTIDAD DE RESERVA EN EL PLANO

Cuando varias mesas pertenecen a la misma reserva:

- todas deben poder identificarse como pertenecientes a la misma reserva;
- deben mostrar/resolver el mismo identificador o número de reserva;
- la mesa principal debe seguir siendo distinguible internamente;
- las mesas adicionales no deben aparecer como reservas independientes.

### Ejemplo obligatorio

Si la reserva #125 tiene:

- Mesa 1 = principal
- Mesa 2 = adicional
- Mesa 3 = adicional

el plano debe representar las tres mesas como pertenecientes a la **reserva #125**.

No debe ocurrir:

- Mesa 1 → reserva #125
- Mesa 2 → reserva diferente
- Mesa 3 → reserva diferente

La interfaz puede distinguir visualmente principal/adicional si V2 lo hace, pero la identidad de negocio es única.

---

# 4. MESA PRINCIPAL

Regla V2:

- la primera mesa seleccionada es la mesa principal;
- las siguientes son mesas adicionales.

Debe existir una única mesa principal activa por asignación.

No se debe permitir que una misma asignación tenga dos mesas principales.

---

# 5. MESAS ADICIONALES

Las mesas adicionales pertenecen a la misma reserva.

Deben:

- quedar vinculadas al mismo `reserva_id`;
- respetar fecha y turno;
- respetar disponibilidad;
- respetar las reglas de unión;
- quedar bloqueadas cuando la reserva sea un estado bloqueante;
- liberarse junto con la mesa principal cuando corresponda.

Nunca se debe liberar solamente la mesa principal dejando las adicionales ocupadas.

---

# 6. ESTRUCTURA NORMALIZADA

La fuente autoritativa de asignación en la arquitectura V2 migrada es `reserva_mesas`.

Campos relevantes:

- `reserva_id`
- `mesa_id`
- `es_principal`
- `orden`
- `fecha_reserva`
- `turno`
- `activa`
- `bloquea`

La capa de presentación puede seguir mostrando `Mesa` y `MesasAdicionales`, pero el comportamiento de negocio debe mantener una asignación coherente y normalizada.

---

# 7. EXISTENCIA Y VALIDEZ DE LA MESA

Una mesa asignable debe:

- existir;
- estar activa;
- ser una mesa válida del catálogo;
- pertenecer a una zona válida;
- cumplir las restricciones de unión/capacidad que correspondan.

La asignación no puede depender únicamente de que el frontend haya dibujado una mesa.

El backend debe ser autoritativo.

Existe en V2 un error específico para mesa inexistente: `CR_MESA_INEXISTENTE`.

---

# 8. ZONA

La zona debe ser coherente con la mesa principal.

En V2 existe la regla/error `CR_ZONA_INVALIDA`.

No debe permitirse que la reserva quede con una zona incompatible con su mesa principal.

La zona no debe convertirse en una fuente secundaria que contradiga la mesa real.

---

# 9. TURNOS: COMIDA Y CENA

La disponibilidad de mesas se determina por:

- fecha;
- turno;
- mesa.

Por tanto:

`fecha + turno + mesa`

es la unidad fundamental de disponibilidad.

### Regla

Una mesa ocupada en COMIDA no queda automáticamente ocupada en CENA.

Una mesa ocupada en CENA no queda automáticamente ocupada en COMIDA.

La misma mesa puede utilizarse en distintos turnos siempre que las demás reglas lo permitan.

---

# 10. NO MEZCLAR TURNOS

Una asignación no puede mezclar mesas de diferentes turnos.

Todas las mesas de una misma reserva/asignación deben pertenecer al mismo:

- `fecha_reserva`
- `turno`

No se debe permitir una reserva con:

- Mesa 1 → COMIDA
- Mesa 2 → CENA

---

# 11. FECHA DE LA RESERVA

La fecha forma parte de la identidad operativa de la asignación.

Una reserva del sábado no puede ser sentada/finalizada desde el contexto operativo de otro día.

Ejemplo:

- Reserva: sábado
- Plano abierto: miércoles

No se debe permitir sentar/finalizar esa reserva como si perteneciera al miércoles.

La reserva puede ser modificada conforme a las reglas de modificación, pero eso es diferente de permitir una ocupación cruzada desde otro día.

---

# 12. FECHA + TURNO + MESA

La regla de colisión fundamental es:

> Dos reservas no pueden bloquear simultáneamente la misma mesa para la misma fecha y turno.

En V2 existe una garantía de base de datos mediante índice único parcial sobre:

`(fecha_reserva, turno, mesa_id)`

para asignaciones activas y bloqueantes.

Esto es importante porque la validación del frontend por sí sola no es suficiente.

---

# 13. MISMA MESA EN DIFERENTES DÍAS

Permitido si las demás condiciones son válidas.

Ejemplo:

- Reserva A → lunes → mesa 1
- Reserva B → martes → mesa 1

No existe colisión por fecha distinta.

---

# 14. MISMA MESA EN DIFERENTES TURNOS

Permitido si las demás condiciones son válidas.

Ejemplo:

- Reserva A → sábado COMIDA → mesa 1
- Reserva B → sábado CENA → mesa 1

No existe colisión entre turnos diferentes.

---

# 15. MISMA MESA, MISMO DÍA, MISMO TURNO

No permitido cuando ambas asignaciones son activas y bloqueantes.

Ejemplo:

- Reserva A → sábado CENA → mesa 1
- Reserva B → sábado CENA → mesa 1

La segunda asignación debe rechazarse.

---

# 16. EXCLUSIÓN DE LA PROPIA RESERVA

Cuando una reserva ya tiene mesas asignadas y se está modificando su asignación, su propia asignación actual no debe contarse como una colisión.

En otras palabras:

> una reserva puede reasignar sus propias mesas sin bloquearse a sí misma.

La comprobación de colisión de V2 excluye el mismo `reserva_id`.

---

# 17. CONCURRENCIA

La comprobación frontend no garantiza por sí sola la disponibilidad.

Dos dispositivos pueden intentar asignar la misma mesa simultáneamente.

Por eso V2 utiliza una garantía de base de datos y operaciones transaccionales/RPC.

Existen errores específicos de concurrencia, entre ellos:

- `CR_COLISION_CONCURRENTE`
- `CR_MESA_OCUPADA_CONCURRENTEMENTE`

La regla para V4 debe ser:

> la base de datos es la última autoridad frente a una carrera de asignación.

---

# 18. ESTADOS Y BLOQUEO DE MESAS

En el contrato V2, los estados que pueden tener asignación activa/bloqueante son:

- `PENDIENTE`
- `CONFIRMADA`
- `SENTADA`

Estos estados deben tratarse de forma coherente con `bloquea`.

Los estados finales/cancelados/no asignables no deben mantener mesas bloqueadas.

**Nota:** los nombres exactos de estados y las transiciones concretas deben verificarse contra el código V2 antes de convertir cualquier detalle no documentado aquí en una regla adicional.

---

# 19. RESERVA PENDIENTE

Una reserva PENDIENTE puede tener mesas asignadas según el contrato V2.

Si tiene asignación activa/bloqueante, las mesas deben considerarse ocupadas para esa fecha y turno.

---

# 20. RESERVA CONFIRMADA

Una reserva CONFIRMADA puede tener mesas asignadas y bloquearlas.

Debe poder pasar a las operaciones permitidas por V2 sin romper la asignación.

---

# 21. RESERVA SENTADA

Una reserva SENTADA mantiene sus mesas bloqueadas.

Sentar no significa liberar las mesas.

Las mesas continúan perteneciendo a la reserva hasta que una transición posterior las libere según las reglas de V2.

---

# 22. RESERVAS FINALIZADAS

Al finalizar una reserva, deben liberarse todas las mesas que pertenecían a esa reserva.

No solamente la mesa principal.

Esto incluye:

- mesa principal;
- todas las mesas adicionales.

---

# 23. RESERVAS CANCELADAS / NO ASIGNABLES

Las reservas que pasan a estados que no bloquean deben liberar sus asignaciones activas/bloqueantes conforme al contrato V2.

La liberación debe afectar a toda la reserva.

Nunca debe quedar una mesa adicional ocupada accidentalmente.

---

# 24. CAMBIO DE TURNO

Regla especialmente importante de V2:

Si una modificación hace que una reserva pase de COMIDA a CENA o de CENA a COMIDA:

1. se deben desactivar/liberar primero todas las mesas asignadas;
2. se persiste el nuevo turno;
3. la reserva queda sin asignación;
4. si se desea mesa en el nuevo turno, debe realizarse una nueva asignación válida.

Esto evita arrastrar mesas de un turno al otro.

---

# 25. CAMBIO DE FECHA

Si cambia la fecha pero el turno permanece igual:

- la asignación anterior no debe darse por válida automáticamente;
- debe comprobarse la disponibilidad en la nueva fecha;
- si existe conflicto, la operación debe rechazarse o la asignación debe quedar invalidada conforme al contrato V2.

No se debe trasladar silenciosamente una mesa ocupada a una nueva fecha.

---

# 26. CAMBIO DE FECHA + TURNO

Si cambian fecha y turno:

- se debe tratar como cambio completo de contexto;
- no se debe conservar una asignación que pertenezca al contexto anterior;
- debe quedar garantizada la coherencia entre reserva y `reserva_mesas`.

---

# 27. COHERENCIA DE `reserva_mesas`

La asignación debe coincidir con la reserva en:

- `reserva_id`;
- fecha;
- turno;
- estado de actividad;
- condición de bloqueo.

V2 incluye comprobaciones de diagnóstico para detectar:

- fecha de asignación diferente de fecha de reserva;
- turno de asignación diferente de turno de reserva;
- incoherencias de `bloquea`.

Estas incoherencias no deben existir en V4.

---

# 28. MESA REPETIDA

Una misma mesa no puede aparecer dos veces dentro de una misma asignación activa.

Ejemplo inválido:

- principal = mesa 1
- adicional = mesa 1

V2 contempla `CR_MESA_REPETIDA`.

---

# 29. UNA ÚNICA MESA PRINCIPAL

Una asignación activa debe tener exactamente una mesa principal.

Las restantes son adicionales y deben conservar su orden/relación.

---

# 30. MESAS UNIBLES

El catálogo V2 contiene información de unión, incluyendo campos como:

- `Unible`
- `GrupoUnion`

La unión de mesas no significa que cualquier combinación arbitraria sea válida.

Antes de implementar o modificar esta parte en V4 se debe extraer del V2 el contrato exacto de:

- qué mesas pueden unirse;
- qué grupos forman una unión válida;
- qué combinaciones están prohibidas;
- cómo afecta la unión a capacidad;
- cómo se representa la unión en el plano;
- cómo se guarda la relación principal/adicional.

**Esta sección queda marcada como REQUIERE AUDITORÍA ESPECÍFICA si el detalle exacto no está todavía demostrado con código V2.**

---

# 31. CAPACIDAD

La selección de mesas debe respetar la capacidad necesaria de la reserva conforme al comportamiento ya verificado en V4.

La capacidad debe mantenerse coherente con:
- número de comensales;
- mesa individual;
- combinación de mesas;
- zona cuando corresponda.

**Estado: VERIFICADO.**

---

# 32. PLANO COMO REPRESENTACIÓN DEL ESTADO REAL

El plano no debe ser solamente un dibujo.

Debe representar el estado real de las mesas para el contexto seleccionado:

- fecha;
- turno.

No se deben mezclar estados de COMIDA y CENA.

---

# 33. ESTADO INDEPENDIENTE POR TURNO

Una mesa puede estar:

- libre en COMIDA;
- ocupada en CENA.

El plano de COMIDA debe mostrarla libre.

El plano de CENA debe mostrarla ocupada.

No se debe copiar el estado de un turno al otro.

---

# 34. ABRIR UNA RESERVA DESDE UNA MESA

Cuando se toca una mesa ocupada/asignada:

- debe poder identificarse la reserva asociada;
- si la reserva utiliza varias mesas, debe poder conocerse el conjunto completo;
- no se debe tratar una mesa adicional como si fuera una reserva independiente.

---

# 35. SIN ASIGNAR

Una reserva SIN ASIGNAR es una reserva existente que no tiene actualmente una asignación válida de mesas.

Al entrar en SIN ASIGNAR:

- debe mostrarse la información de la reserva;
- debe abrirse el contexto correcto de fecha y turno;
- debe poder accederse al plano;
- la selección debe aplicarse a esa reserva.

La acción SIN ASIGNAR no debe crear una reserva nueva.

---

# 36. REGLA DE FECHA Y TURNO AL SENTAR

No se debe permitir sentar una reserva desde un contexto de plano que no coincida con:

- fecha de la reserva;
- turno de la reserva.

Ejemplo:

Reserva:
- sábado;
- CENA;
- mesa 1.

Plano abierto:
- miércoles;
- CENA.

No se puede ejecutar SENTAR sobre esa reserva desde el miércoles.

Primero debe trabajarse con el contexto correcto o modificarse la reserva según las reglas de modificación.

---

# 37. REGLA DE FECHA Y TURNO AL FINALIZAR

La misma protección debe aplicarse a operaciones finales como finalizar/cerrar una reserva.

El sistema no debe permitir finalizar una reserva como si estuviera en una fecha/turno diferente al suyo.

---

# 38. ASIGNACIÓN DESDE EL PLANO

Al asignar mesas:

1. se identifica la reserva objetivo;
2. se determina su fecha;
3. se determina su turno;
4. se comprueba la validez de cada mesa;
5. se comprueba zona;
6. se comprueba unión/capacidad;
7. se comprueba colisión;
8. se persiste la asignación;
9. la reserva queda vinculada a todas sus mesas;
10. el plano se actualiza.

---

# 39. CAMBIO DE ASIGNACIÓN

Al cambiar una asignación existente:

- no se debe generar una segunda asignación paralela;
- deben eliminarse/reemplazarse correctamente las mesas anteriores;
- la reserva debe terminar con un conjunto coherente;
- no debe quedar basura de mesas adicionales antiguas.

---

# 40. LIBERACIÓN TOTAL

Siempre que una operación de negocio libere una reserva, debe liberar el conjunto completo:

`Mesa principal + todas las mesas adicionales`

Nunca:

`solo Mesa principal`

---

# 41. OPERACIONES ATÓMICAS

Las operaciones críticas de mesas deben ser transaccionales o utilizar mecanismos equivalentes.

Especialmente:

- asignar;
- cambiar asignación;
- eliminar asignación;
- cambiar turno;
- sentar;
- finalizar;
- cancelar/liberar.

La UI no debe intentar simular una transacción mediante varias llamadas independientes sin garantía.

---

# 42. AUTORIDAD DEL BACKEND

El frontend puede:

- mostrar disponibilidad;
- impedir acciones obviamente inválidas;
- dar feedback al usuario.

Pero el backend/base de datos debe garantizar:

- colisiones;
- coherencia;
- estados;
- fecha;
- turno;
- mesa existente;
- mesa activa;
- unicidad;
- concurrencia.

---

# 43. GUARDAS DE UI

La interfaz V2 contempla comportamientos como:

- selector de modo de asignación;
- confirmación al salir con cambios sin guardar;
- botón Guardar habilitado únicamente si existen cambios;
- evitar dobles operaciones durante el guardado;
- Cancelar sin persistir cambios.

V4 debe conservar estos comportamientos si forman parte del flujo V2 correspondiente.

---

# 44. TARJETA DE RESERVA Y MODALES

Los controles de modificación de una reserva deben mantener el comportamiento coherente con V2.

Cuando corresponda:

- fecha → selector de fecha;
- hora → selector con scroll;
- pax → modal `- / +`;
- mesas → modal/plano de asignación.

No se debe crear un segundo sistema de interacción que tenga reglas diferentes.

---

# 45. REGLA DE NO REDISEÑO

Esta Biblia es funcional.

No autoriza a modificar:

- tamaños;
- colores;
- tipografías;
- espaciados;
- distribución;
- cabeceras;
- navegación;

salvo petición expresa.

La interfaz V4 está considerada validada visualmente.

El trabajo de esta Biblia es garantizar que la funcionalidad de mesas sea correcta.

---

# 46. REGLAS ESPECIALES — ESTADO DE AUDITORÍA

Los puntos históricos de esta sección fueron revisados durante la auditoría funcional V2 → V4 y las pruebas posteriores.

1. exclusiones especiales de mesas: **VERIFICADO**;
2. `Unible` / `GrupoUnion`: **VERIFICADO** como metadatos que no imponen contigüidad física en V4;
3. capacidad de mesas unidas: **VERIFICADO**;
4. transiciones de estados: **VERIFICADO**;
5. SENTAR: **VERIFICADO**;
6. FINALIZAR: **VERIFICADO**;
7. NO-SHOW: **VERIFICADO**;
8. cancelación de reservas SENTADA: **VERIFICADO**;
9. diferencias entre asignación privada y pública: **VERIFICADO**.

**No queda ningún punto de esta sección pendiente de auditoría funcional.**

---

# 47. ERRORES V2 YA IDENTIFICADOS

Entre los errores/contratos encontrados en la capa V2/Supabase están:

- `CR_ESTADO_NO_ASIGNABLE`
- `CR_ZONA_INVALIDA`
- `CR_MESA_REPETIDA`
- `CR_MESA_INEXISTENTE`
- `CR_COLISION_CONCURRENTE`
- `CR_MESA_OCUPADA_CONCURRENTEMENTE`

Estos códigos deben utilizarse como pistas para localizar el contrato real y no sustituirse por validaciones arbitrarias en V4.

---

# 48. CHECKLIST MAESTRO V2 → V4

Cada regla debe auditarse en V4 con uno de estos estados:

- **IMPLEMENTADA** — demostrada en código y flujo.
- **PARCIAL** — existe, pero no cubre todo el contrato.
- **FALTA** — no existe.
- **NO COMPROBADA** — hay indicios, pero no se ha demostrado.
- **NO APLICA** — solo si existe una justificación técnica/funcional documentada.

Nunca marcar como IMPLEMENTADA únicamente porque la pantalla parezca funcionar.

---

## ESTADO ACTUAL DEL CHECKLIST

**Auditoría actualizada: 30/09/2026**

Resultado: **no quedan reglas funcionales de mesas pendientes dentro del alcance actual de esta Biblia**.

Las reglas marcadas a continuación fueron verificadas mediante revisión de código, pruebas funcionales y las pruebas de concurrencia realizadas durante la evolución de V4.

### Criterio especial de unión de mesas

V4 **no exige contigüidad física** entre mesas unidas. Una combinación como **6 + 12 + 8** es válida si las mesas necesarias están disponibles y se cumplen las demás reglas aplicables. No se abre un trabajo pendiente para imponer proximidad mediante `Unible` o `GrupoUnion`.

---

## BLOQUE A — IDENTIDAD

- [x] IMPLEMENTADA — Una reserva es una única entidad.
- [x] IMPLEMENTADA — Mesa principal y adicionales pertenecen al mismo `reserva_id`.
- [x] IMPLEMENTADA — La primera mesa seleccionada es principal.
- [x] IMPLEMENTADA — Las siguientes son adicionales.
- [x] IMPLEMENTADA — Solo existe una principal activa.
- [x] IMPLEMENTADA — No existen mesas repetidas.

## BLOQUE B — FECHA/TURNO

- [x] IMPLEMENTADA — Toda asignación tiene fecha.
- [x] IMPLEMENTADA — Toda asignación tiene turno.
- [x] IMPLEMENTADA — Fecha de asignación = fecha de reserva.
- [x] IMPLEMENTADA — Turno de asignación = turno de reserva.
- [x] IMPLEMENTADA — No se mezclan COMIDA/CENA.
- [x] IMPLEMENTADA — Misma mesa/día/turno produce colisión.
- [x] IMPLEMENTADA — Misma mesa/día/turno diferente produce disponibilidad.
- [x] IMPLEMENTADA — Misma mesa en días distintos puede utilizarse.
- [x] IMPLEMENTADA — La propia reserva se excluye de su propia colisión.

## BLOQUE C — ESTADOS

- [x] IMPLEMENTADA — PENDIENTE puede asignar.
- [x] IMPLEMENTADA — CONFIRMADA puede asignar.
- [x] IMPLEMENTADA — SENTADA mantiene bloqueo.
- [x] IMPLEMENTADA — Estados finales/cancelados liberan.
- [x] IMPLEMENTADA — Estados no asignables no pueden mantener asignación bloqueante.
- [x] IMPLEMENTADA — Las transiciones respetan el contrato V2 y el flujo operativo intencional de V4.

## BLOQUE D — MESA

- [x] IMPLEMENTADA — Mesa existe.
- [x] IMPLEMENTADA — Mesa está activa.
- [x] IMPLEMENTADA — Mesa pertenece a una zona válida.
- [x] IMPLEMENTADA — Mesa respeta capacidad.
- [x] VERIFICADA — La combinación de mesas no depende de contigüidad física.
- [x] IMPLEMENTADA — Mesa no está ocupada por otra reserva compatible.
- [x] IMPLEMENTADA — Concurrencia está protegida por backend/DB.

## BLOQUE E — MULTIMESA

- [x] IMPLEMENTADA — Principal correctamente identificada.
- [x] IMPLEMENTADA — Adicionales correctamente identificadas.
- [x] IMPLEMENTADA — Misma reserva en todas las mesas.
- [x] IMPLEMENTADA — Misma fecha.
- [x] IMPLEMENTADA — Mismo turno.
- [x] IMPLEMENTADA — Sin mesas repetidas.
- [x] VERIFICADA — No se exige que las mesas sean contiguas.
- [x] IMPLEMENTADA — Capacidad válida.
- [x] IMPLEMENTADA — Liberación completa.

## BLOQUE F — PLANO

- [x] IMPLEMENTADA — El plano representa el estado real.
- [x] IMPLEMENTADA — COMIDA y CENA son independientes.
- [x] IMPLEMENTADA — Una mesa adicional apunta a la misma reserva.
- [x] IMPLEMENTADA — Se puede abrir la reserva desde cualquiera de sus mesas.
- [x] IMPLEMENTADA — Se visualiza correctamente el conjunto de mesas.
- [x] IMPLEMENTADA — SIN ASIGNAR abre la reserva correcta.
- [x] IMPLEMENTADA — La asignación se realiza sobre el contexto correcto.

## BLOQUE G — OPERACIONES

- [x] IMPLEMENTADA — Asignar.
- [x] IMPLEMENTADA — Cambiar asignación.
- [x] IMPLEMENTADA — Quitar asignación.
- [x] IMPLEMENTADA — Cambiar fecha.
- [x] IMPLEMENTADA — Cambiar hora.
- [x] IMPLEMENTADA — Cambiar turno.
- [x] IMPLEMENTADA — Sentar.
- [x] IMPLEMENTADA — Finalizar.
- [x] IMPLEMENTADA — Cancelar/no-show.
- [x] IMPLEMENTADA — Liberar todas las mesas.
- [x] IMPLEMENTADA — No dejar asignaciones huérfanas.

## BLOQUE H — CONCURRENCIA

- [x] IMPLEMENTADA — Validación frontend.
- [x] IMPLEMENTADA — Validación backend.
- [x] IMPLEMENTADA — Restricción DB.
- [x] IMPLEMENTADA — Operación atómica.
- [x] VERIFICADA — Carrera entre dos dispositivos controlada.
- [x] IMPLEMENTADA — Error de concurrencia manejado.
- [x] IMPLEMENTADA — UI se refresca tras una operación.


---

# 49. ORDEN DE AUDITORÍA V4

La auditoría V4 debe realizarse en este orden:

### Fase 1 — Modelo de datos
Revisar:

- tablas;
- columnas;
- relaciones;
- RPC;
- triggers;
- índices;
- constraints;
- funciones.

### Fase 2 — Servicios/repositorios
Revisar:

- lectura de mesas;
- lectura de asignaciones;
- asignación;
- eliminación;
- cambio de turno;
- cambio de fecha;
- sentar;
- finalizar;
- cancelar.

### Fase 3 — Plano
Revisar:

- fuente de datos;
- fecha;
- turno;
- estados;
- identificación de reserva;
- multimesa;
- refresco.

### Fase 4 — Tarjeta/modales
Revisar:

- abrir;
- asignar;
- modificar;
- SIN ASIGNAR;
- sentar;
- finalizar;
- cancelar.

### Fase 5 — Pruebas
Probar como mínimo:

1. Mesa libre → asignar.
2. Misma mesa → misma fecha + mismo turno → rechazar.
3. Misma mesa → misma fecha + turno diferente → permitir.
4. Misma mesa → día diferente → permitir.
5. Reserva con 3 mesas → una reserva.
6. Abrir cualquiera de las 3 mesas → misma reserva.
7. Finalizar → liberar las 3.
8. Cancelar/no-show → liberar las 3 según contrato.
9. Cambiar COMIDA → CENA → liberar asignación.
10. Cambiar fecha → validar nueva fecha.
11. Dos dispositivos → intentar misma mesa simultáneamente.
12. Intentar sentar desde día incorrecto → rechazar.
13. Intentar finalizar desde día/turno incorrecto → rechazar.
14. Mesa inválida/inexistente → rechazar.
15. Combinación de mesas no contiguas → permitir cuando las mesas estén disponibles y cumplan las reglas aplicables.
16. Capacidad insuficiente → rechazar.

---

# 50. ESTADO DEL AUDITADO

**30/09/2026 — Checklist funcional de mesas: CERRADO / VERIFICADO.**

No quedan incumplimientos funcionales pendientes identificados en esta Biblia.

A partir de este punto, cualquier nuevo cambio de mesas debe partir de una **nueva incidencia concreta**, una regresión observada o una nueva necesidad funcional. No se debe reabrir una regla ya verificada ni crear restricciones nuevas por inferencia.

---

# 51. REGLA DE TRABAJO PARA LAS FUTURAS CORRECCIONES

No se debe atacar todo simultáneamente.

Proceso obligatorio:

1. identificar un único incumplimiento;
2. localizar su causa;
3. localizar el comportamiento equivalente en V2;
4. preparar una corrección mínima;
5. crear PR;
6. revisar PR;
7. ejecutar pruebas;
8. fusionar;
9. generar APK;
10. probar en dispositivo;
11. documentar el resultado;
12. pasar al siguiente incumplimiento.

No se debe modificar una segunda regla mientras la primera no esté verificada.

---
# 52. REGLAS ESPECÍFICAS V4 — FLUJO EFICIENTE DEL CAMARERO

Estas reglas son **intencionales de V4**. No deben considerarse discrepancias respecto de V2 ni ser revertidas para imitar V2 literalmente.

El objetivo es reducir pasos innecesarios para el camarero manteniendo las mismas garantías de negocio de mesas.

### 51.1 PENDIENTE + ASIGNAR MESA

Si una reserva está en `PENDIENTE` y el camarero le asigna una mesa:

- la asignación significa que el camarero ha aceptado la reserva;
- al guardar la asignación, la reserva pasa automáticamente a `CONFIRMADA`;
- no debe obligarse al camarero a ejecutar primero **CONFIRMAR** y después **ASIGNAR MESA**.

**Regla V4:** asignar mesa a una reserva PENDIENTE = aceptar/confirmar la reserva.

### 51.2 PENDIENTE + SENTAR SIN MESA

Si una reserva `PENDIENTE` no tiene mesa y el camarero pulsa **SENTAR**:

1. se abre la asignación de mesa;
2. el camarero selecciona la mesa o mesas válidas;
3. al guardar, la reserva pasa por la aceptación (`CONFIRMADA`);
4. la misma operación continúa hasta `SENTADA`;
5. no se exige una segunda acción manual de confirmar.

El flujo debe ser continuo: **asignar → aceptar → sentar**.

### 51.3 CONFIRMADA + SENTAR SIN MESA

Si una reserva `CONFIRMADA` no tiene mesa y el camarero pulsa **SENTAR**:

1. se abre la asignación;
2. se seleccionan las mesas válidas;
3. al guardar, la operación completa el asiento;
4. la reserva queda `SENTADA`.

No se debe obligar al camarero a asignar primero y volver a pulsar SENTAR.

### 51.4 CONFIRMADA + SENTAR CON MESA

Si una reserva `CONFIRMADA` ya tiene una asignación válida:

- **SENTAR** debe pasar directamente a `SENTADA`;
- no debe abrir innecesariamente el selector de mesas.

### 51.5 ASIGNAR NO SIGNIFICA SENTAR

La acción normal **ASIGNAR MESA** no debe sentar a la reserva.

Solo debe producir el cambio `PENDIENTE → CONFIRMADA` cuando corresponda.

El paso a `SENTADA` se realiza únicamente cuando la acción solicitada es **SENTAR**.

### 51.6 PRINCIPIO OPERATIVO

> **Siempre que sea seguro hacerlo, una acción del camarero debe completar todo el trabajo lógico que esa acción expresa, evitando pasos manuales redundantes.**

Esto es una optimización deliberada de V4 para el trabajo en TPV/comandero.

### 51.7 COMPATIBILIDAD CON LAS GARANTÍAS DE MESAS

Esta optimización de flujo no elimina ni relaja las reglas de negocio de mesas. Incluso en estos flujos automáticos siguen siendo obligatorias:

- fecha correcta;
- turno correcto;
- mesa existente y activa;
- zona coherente;
- ausencia de mesas repetidas;
- capacidad y unión válidas;
- ausencia de colisión;
- autoridad del backend;
- atomicidad de la operación;
- liberación completa cuando corresponda.

### 51.8 CHECKLIST V4

- [ ] PENDIENTE + asignar → `CONFIRMADA`.
- [ ] PENDIENTE + sentar sin mesa → asignar + `CONFIRMADA` + `SENTADA` en un flujo continuo.
- [ ] CONFIRMADA + sentar sin mesa → asignar + `SENTADA` en un flujo continuo.
- [ ] CONFIRMADA + sentar con mesa → `SENTADA` directa.
- [ ] Asignar normalmente nunca sienta.
- [ ] Ninguna de estas reglas debe eliminar las validaciones autoritativas de mesas.

---
# 53. PRINCIPIO FINAL


La pregunta que debe hacerse antes de cualquier cambio es:

> **“¿Qué hacía exactamente V2 en este caso y dónde está demostrado?”**

Si V2 lo hacía de una manera concreta, V4 debe conservarla.

Si V2 no está demostrado, primero se audita.

Si V4 ya lo hace correctamente, no se toca.

Si V4 lo hace parcialmente, se corrige solo la parte necesaria.

Si V4 lo hace de forma diferente a V2, se considera discrepancia funcional hasta demostrar lo contrario.

**Esta Biblia es la referencia funcional para toda la futura evolución del sistema de mesas de Camborio Reservas V4.**
