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

La selección de mesas debe respetar la capacidad necesaria de la reserva y las reglas V2 de combinación.

No se debe inventar una fórmula nueva en V4.

La capacidad debe extraerse del contrato V2 y mantenerse coherente con:

- número de comensales;
- mesa individual;
- grupo de mesas unidas;
- zona;
- restricciones de unión.

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

# 46. REGLAS ESPECIALES QUE DEBEN VERIFICARSE DIRECTAMENTE EN V2

Antes de convertirlas en reglas obligatorias de V4, hay que localizar y documentar el código V2 exacto para:

1. cualquier exclusión especial de una mesa concreta;
2. reglas exactas de `Unible`;
3. reglas exactas de `GrupoUnion`;
4. fórmula exacta de capacidad para mesas unidas;
5. todas las transiciones posibles de estados;
6. reglas exactas de SENTAR;
7. reglas exactas de FINALIZAR;
8. reglas exactas de NO-SHOW;
9. restricciones exactas al cancelar una reserva SENTADA;
10. cualquier diferencia entre asignación privada y pública.

**No se deben inventar estas reglas a partir de una inferencia.**

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

## BLOQUE A — IDENTIDAD

- [ ] Una reserva es una única entidad.
- [ ] Mesa principal y adicionales pertenecen al mismo `reserva_id`.
- [ ] La primera mesa seleccionada es principal.
- [ ] Las siguientes son adicionales.
- [ ] Solo existe una principal activa.
- [ ] No existen mesas repetidas.

## BLOQUE B — FECHA/TURNO

- [ ] Toda asignación tiene fecha.
- [ ] Toda asignación tiene turno.
- [ ] Fecha de asignación = fecha de reserva.
- [ ] Turno de asignación = turno de reserva.
- [ ] No se mezclan COMIDA/CENA.
- [ ] Misma mesa/día/turno produce colisión.
- [ ] Misma mesa/día/turno diferente produce disponibilidad.
- [ ] Misma mesa en días distintos puede utilizarse.
- [ ] La propia reserva se excluye de su propia colisión.

## BLOQUE C — ESTADOS

- [ ] PENDIENTE puede asignar.
- [ ] CONFIRMADA puede asignar.
- [ ] SENTADA mantiene bloqueo.
- [ ] Estados finales/cancelados liberan.
- [ ] Estados no asignables no pueden mantener asignación bloqueante.
- [ ] Las transiciones respetan el contrato V2.

## BLOQUE D — MESA

- [ ] Mesa existe.
- [ ] Mesa está activa.
- [ ] Mesa pertenece a una zona válida.
- [ ] Mesa respeta capacidad.
- [ ] Mesa respeta reglas de unión.
- [ ] Mesa no está ocupada por otra reserva compatible.
- [ ] Concurrencia está protegida por backend/DB.

## BLOQUE E — MULTIMESA

- [ ] Principal correctamente identificada.
- [ ] Adicionales correctamente identificadas.
- [ ] Misma reserva en todas las mesas.
- [ ] Misma fecha.
- [ ] Mismo turno.
- [ ] Sin mesas repetidas.
- [ ] Unión válida.
- [ ] Capacidad válida.
- [ ] Liberación completa.

## BLOQUE F — PLANO

- [ ] El plano representa el estado real.
- [ ] COMIDA y CENA son independientes.
- [ ] Una mesa adicional apunta a la misma reserva.
- [ ] Se puede abrir la reserva desde cualquiera de sus mesas.
- [ ] Se visualiza correctamente el conjunto de mesas.
- [ ] SIN ASIGNAR abre la reserva correcta.
- [ ] La asignación se realiza sobre el contexto correcto.

## BLOQUE G — OPERACIONES

- [ ] Asignar.
- [ ] Cambiar asignación.
- [ ] Quitar asignación.
- [ ] Cambiar fecha.
- [ ] Cambiar hora.
- [ ] Cambiar turno.
- [ ] Sentar.
- [ ] Finalizar.
- [ ] Cancelar/no-show.
- [ ] Liberar todas las mesas.
- [ ] No dejar asignaciones huérfanas.

## BLOQUE H — CONCURRENCIA

- [ ] Validación frontend.
- [ ] Validación backend.
- [ ] Restricción DB.
- [ ] Operación atómica.
- [ ] Carrera entre dos dispositivos controlada.
- [ ] Error de concurrencia manejado.
- [ ] UI se refresca tras una operación.

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
15. Unión inválida → rechazar.
16. Capacidad insuficiente → rechazar.

---

# 50. REGLA DE TRABAJO PARA LAS FUTURAS CORRECCIONES

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

# 51. PRINCIPIO FINAL

La pregunta que debe hacerse antes de cualquier cambio es:

> **“¿Qué hacía exactamente V2 en este caso y dónde está demostrado?”**

Si V2 lo hacía de una manera concreta, V4 debe conservarla.

Si V2 no está demostrado, primero se audita.

Si V4 ya lo hace correctamente, no se toca.

Si V4 lo hace parcialmente, se corrige solo la parte necesaria.

Si V4 lo hace de forma diferente a V2, se considera discrepancia funcional hasta demostrar lo contrario.

**Esta Biblia es la referencia funcional para toda la futura evolución del sistema de mesas de Camborio Reservas V4.**
