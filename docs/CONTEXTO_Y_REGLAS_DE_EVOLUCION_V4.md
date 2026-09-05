# CONTEXTO Y REGLAS DE EVOLUCIÓN — CAMBORIO RESERVAS V4

> **DOCUMENTO DE CONTEXTO CRÍTICO.**
> Este archivo debe leerse antes de modificar, depurar o rediseñar Camborio Reservas V4.
> Su objetivo es evitar que se vuelva a perder tiempo reinventando lógica, comportamiento o diseño que ya fueron trabajados y validados durante meses en V1, V2 y V3.

## 1. Historia real del proyecto

Camborio Reservas no nace en V4. Es el resultado de varios meses de desarrollo, depuración y pruebas.

### V1 — Google Sheets

La primera versión utilizaba Google Sheets como almacenamiento principal.

- Funcionaba, pero era demasiado lenta.
- Cuando había actividad, las lecturas y escrituras podían tardar demasiado.
- La experiencia no era adecuada para un uso real en un establecimiento.

### V2 — AppSheet + Google Sheets

La V2 evolucionó hacia AppSheet manteniendo Google Sheets como base de datos.

- Supuso una mejora respecto a la V1.
- Aun así, seguía existiendo el problema de rendimiento provocado por Sheets.
- Existía incluso un botón para recargar datos porque la actualización podía resultar lenta.
- La V2 acumuló una cantidad importante de trabajo de negocio, comportamiento, validaciones, interfaz y depuración.

**La V2 es una fuente de referencia muy importante y NO debe tratarse como una versión descartable.**

### V3 — Supabase + AppSheet

En la V3 se trasladó la base de datos desde Google Sheets a Supabase.

El cambio fue fundamental por rendimiento:

- Las operaciones pasaron a ser mucho más rápidas.
- Guardar datos dejó de depender de los tiempos de Google Sheets.
- Se comprobó en la práctica que Supabase era mucho más adecuado para la velocidad que necesita la aplicación.

AppSheet siguió utilizándose en la parte privada, pero quedó claro que no era el destino final deseado para una aplicación comercial propia.

### V4 — PWA pública + aplicación Android instalable

La V4 representa la evolución hacia una aplicación propia:

- PWA para la parte pública.
- Aplicación Android instalable/nativa como objetivo.
- Supabase como backend oficial.
- Sin depender de AppSheet para la experiencia final del producto.

La V4 NO debe considerarse un proyecto nuevo desde cero.

Es una **adaptación y evolución** de todo el conocimiento, lógica y depuración acumulados en V1/V2/V3.

---

## 2. Principio fundamental: no reinventar lo que ya existe

La regla principal de V4 es:

> **Antes de crear una solución nueva, hay que buscar cómo se resolvió en V2 y V3.**

La lógica de negocio ya ha sido trabajada durante meses.

Por ejemplo, la aplicación debe impedir comportamientos que, aunque técnicamente puedan llegar a ejecutarse, son incorrectos desde el punto de vista del negocio.

Ejemplo:

- Una reserva para las 22:00 no debe poder sentarse a las 15:00.
- Una mesa asignada a un turno no debe poder utilizarse de forma incoherente con otro turno.
- Las operaciones que puedan generar estados imposibles deben estar bloqueadas.

Que una operación sea técnicamente posible **no significa que sea válida para el negocio**.

Estas reglas no deben volver a descubrirse mediante ensayo y error. Hay que localizar la lógica existente en V2/V3, comprobarla y adaptarla a la arquitectura V4.

---

## 3. V2 es referencia funcional Y visual

Cuando una funcionalidad ya existe en V2 y funciona correctamente, el procedimiento correcto para V4 es:

1. Localizar cómo está resuelta en V2.
2. Entender la lógica y las reglas de negocio.
3. Entender la interfaz y el comportamiento esperado.
4. Trasladar/adaptar la solución a la arquitectura V4.
5. Sustituir únicamente las partes que dependen de la tecnología antigua (por ejemplo, Google Sheets/AppSheet) por las equivalentes de V4 (Supabase/PWA/JavaScript).
6. Mantener el comportamiento validado salvo que exista una razón explícita para cambiarlo.

**No significa copiar código literalmente.**

Significa conservar el conocimiento y el resultado validado, adaptándolo a la nueva arquitectura.

---

## 4. El diseño visual no debe hacerse por tanteo

Esta regla es especialmente importante.

Si una versión anterior contiene un diseño que ya se considera correcto, **hay que utilizar sus medidas reales como referencia**.

No se debe hacer:

- "Vamos a probar con 140 px."
- "Quizá 150 px quede mejor."
- "Vamos a cambiar el tamaño y vemos."
- "Vamos a aproximarnos al diseño."

Si el diseño de referencia dice que el logo mide **156 px**, se utilizan **156 px**.

Si el título tiene un tamaño concreto, se conserva ese tamaño.

Si el cuerpo utiliza un tamaño concreto, se conserva.

Si existen márgenes, padding, anchuras, alturas, tamaños de botones o proporciones concretas en el código de referencia, deben estudiarse y reutilizarse.

### Ejemplo real: PDF

El PDF de V2 ya tenía un diseño trabajado y proporcionado. La referencia contenía medidas concretas, entre ellas:

- cuerpo: 14 px
- padding del documento: 22 px 34 px 26 px
- logo: 156 px
- título principal: 34 px
- subtítulo/marca secundaria: 21 px
- dirección/teléfono: 14 px
- título del código: 20 px
- código: 40 px
- tabla: 14 px
- padding de celdas: 11 px / 14 px
- título de aviso: 18 px
- texto: 14 px
- título de consulta: 17 px
- pie: 15 px
- fecha de generación: 11 px

Cuando se dispone de estas medidas, **no hay que volver a experimentar visualmente hasta acertar**. Se deben trasladar y adaptar.

---

## 5. Rendimiento: requisito no negociable

La aplicación se utiliza en un entorno real de restauración y debe ser fluida.

La experiencia de V1/V2 con Google Sheets demostró que una aplicación que tarda segundos —o especialmente varios segundos— en guardar o consultar datos no es práctica.

Por tanto:

- Las operaciones deben ser rápidas.
- No se deben introducir llamadas innecesarias.
- No se debe cargar toda la aplicación si solo hace falta una parte.
- El panel privado debe ser ligero y modular.
- Las soluciones deben priorizar una respuesta inmediata para el uso en TPV/comandero.

**La velocidad no es un detalle estético: es un requisito funcional del proyecto.**

---

## 6. Depuración acumulada: no romper lo que ya está corregido

V4 lleva meses de depuración.

Durante ese trabajo se han corregido comportamientos extraños, estados imposibles, restricciones de fechas/horas, mesas, turnos, reservas y numerosos detalles de interfaz.

Por tanto:

> **Una modificación nueva debe considerarse peligrosa si puede alterar una regla que ya fue corregida anteriormente.**

Antes de modificar una función existente hay que comprobar:

- qué comportamiento actual tiene;
- qué regla de negocio protege;
- si existe una implementación equivalente en V2/V3;
- qué pantallas dependen de ella;
- y si el cambio puede afectar a otra parte del sistema.

No se debe "limpiar" o "simplificar" código antiguo solo porque parezca menos elegante si ese código protege una regla de negocio ya validada.

---

## 7. Prioridad de fuentes

Para decidir cómo debe comportarse V4:

### 1.º — Reglas de negocio ya validadas
La lógica funcional desarrollada y depurada durante V2/V3 tiene prioridad sobre una interpretación nueva.

### 2.º — V2 como referencia funcional y visual
Si una función o diseño ya existe en V2, estudiarlo antes de diseñar uno nuevo.

### 3.º — V3 como referencia de evolución técnica
V3 muestra cómo se adaptó el negocio a Supabase y qué problemas se resolvieron durante esa transición.

### 4.º — Arquitectura V4
La implementación final debe estar adaptada a PWA/Supabase/JavaScript y a los objetivos de V4.

### 5.º — Mejoras nuevas
Solo después de conservar lo anterior se deben introducir cambios nuevos, y deben estar claramente identificados como tales.

---

## 8. Regla para futuras modificaciones

Cada trabajo debe seguir este orden:

1. **Identificar un único problema.**
2. **Localizar la implementación anterior en V2/V3.**
3. **Analizar la causa real.**
4. **Determinar qué parte es lógica de negocio y qué parte es tecnología antigua.**
5. **Preparar una modificación mínima y adaptada a V4.**
6. **No cambiar otras partes sin necesidad.**
7. **Revisar el diff/PR antes de integrar.**
8. **Desplegar.**
9. **Comprobar el resultado.**
10. **Solo entonces pasar al siguiente problema.**

---

## 9. Regla específica para interfaces y gráficos

Cuando exista una referencia anterior aprobada:

> **Primero se copia la especificación visual; después se adapta la tecnología.**

No al revés.

El objetivo no es conseguir algo "parecido".

El objetivo es conseguir el mismo resultado visual, utilizando las medidas, proporciones, tipografías, márgenes y estructura ya conocidas, salvo que se haya pedido expresamente un cambio.

La adaptación tecnológica puede cambiar el mecanismo de generación, pero no debe cambiar arbitrariamente el resultado visual.

---

## 10. Cambios expresamente previstos para V4

Existe una mejora visual/funcional pendiente que sí forma parte del objetivo de V4: **la implementación del modo día/noche**.

Debe tratarse como una mejora explícita y controlada, no como una excusa para rediseñar de nuevo toda la aplicación.

---

## 11. Qué NO hacer

- No empezar V4 como si no existieran V2 y V3.
- No reinventar reglas de negocio ya depuradas.
- No sustituir una solución conocida por otra experimental sin motivo.
- No rediseñar una interfaz que ya tiene una referencia aprobada.
- No ajustar tamaños visuales por prueba y error cuando el código anterior proporciona las medidas exactas.
- No tocar V2 para solucionar V4.
- No introducir cambios grandes cuando el problema es pequeño.
- No modificar varias áreas simultáneamente sin necesidad.
- No romper una regla de negocio para hacer el código aparentemente más sencillo.
- No confundir una posibilidad técnica con una operación válida para el negocio.

---

## 12. Regla final para cualquier nuevo chat o desarrollador

Si otro chat, agente o desarrollador entra en este repositorio, debe asumir lo siguiente:

> **Camborio Reservas V4 es la cuarta etapa de un proyecto que lleva meses de desarrollo y depuración. La lógica de negocio no empieza en V4. V2 y V3 contienen conocimiento y soluciones que deben estudiarse y reutilizarse. V4 debe adaptar ese trabajo a Supabase + PWA + Android, no reinventarlo. Cuando exista una referencia visual o funcional ya validada, se debe copiar/adaptar con sus medidas y reglas reales, no aproximarla mediante ensayo y error. La velocidad, la estabilidad y el respeto por las reglas de negocio son requisitos fundamentales.**

Este documento debe consultarse **antes de cualquier cambio importante en V4**.
