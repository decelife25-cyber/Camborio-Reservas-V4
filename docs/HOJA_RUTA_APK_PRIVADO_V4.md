# HOJA DE RUTA — APK PRIVADO CAMBORIO RESERVAS V4

> Documento de continuidad del proyecto.
>
> **Objetivo:** que cualquier nueva conversación, Jules o persona que continúe el desarrollo pueda saber exactamente qué se ha hecho, cuál es el estado real y cuál es el siguiente paso, sin rehacer trabajo ni cambiar el alcance.

---

## 1. IDENTIDAD DEL PROYECTO

- **Repositorio:** `decelife25-cyber/Camborio-Reservas-V4`
- **Proyecto:** Camborio Reservas V4
- **Componente de este documento:** APK privado para personal de Camborio
- **Backend oficial:** Supabase V4
- **Backend Supabase:** `caeszgtogifserrxdrcw`
- **Zona horaria funcional:** Europe/Madrid
- **PWA pública:** separada del APK privado
- **V2 / Apps Script / Google Sheets:** legacy y fuera de la arquitectura del APK V4

El APK privado debe funcionar como aplicación Android independiente para el personal de Camborio. No debe depender de Google Apps Script, Google Sheets, HtmlService ni de la antigua arquitectura de Apps Script.

---

# 2. REGLA PRINCIPAL DE CONTINUIDAD

**NO empezar el APK desde cero.**

Existe trabajo previo de Jules y existe documentación de auditoría que define qué debe conservarse y qué debe descartarse.

Antes de modificar código, siempre:

1. Revisar este documento.
2. Revisar el estado real de `android_app/`.
3. Revisar el PR #33 y sus commits relevantes.
4. Revisar los documentos de `docs/auditoria-v4/`.
5. Revisar `docs/ANDROID_APK.md` y `plan.md`.
6. Identificar qué está realmente implementado.
7. Continuar solamente con el bloque que corresponda.

No rehacer componentes que ya funcionen.

---

# 3. DOCUMENTACIÓN TÉCNICA DE REFERENCIA

La auditoría V4 contiene estos 13 documentos y constituye la referencia funcional y arquitectónica:

1. `docs/auditoria-v4/01_RESUMEN_EJECUTIVO.md`
2. `docs/auditoria-v4/02_ESTADO_FINAL_SUPABASE.md`
3. `docs/auditoria-v4/03_LOGICA_NEGOCIO.md`
4. `docs/auditoria-v4/04_CONTRATO_BASE_DATOS.md`
5. `docs/auditoria-v4/05_RPC_FUNCIONES_TRIGGERS.md`
6. `docs/auditoria-v4/06_PUBLICO_VS_PRIVADO.md`
7. `docs/auditoria-v4/07_GOOGLE_SHEETS_LEGACY.md`
8. `docs/auditoria-v4/08_CODIGO_REUTILIZABLE.md`
9. `docs/auditoria-v4/09_ARQUITECTURA_V4.md`
10. `docs/auditoria-v4/10_PLAN_CONSTRUCCION_V4.md`
11. `docs/auditoria-v4/11_PLAN_PRUEBAS_V4.md`
12. `docs/auditoria-v4/12_DISCREPANCIAS_Y_RIESGOS.md`
13. `docs/auditoria-v4/13_REVISION_FINAL_AUDITORIA.md`

También son referencia:

- `docs/auditoria-v4/README.md`
- `docs/ANDROID_APK.md`
- `plan.md`
- Todo el contenido actual de `android_app/`

### Principios extraídos de la auditoría

- Supabase es la fuente de verdad.
- El APK privado usa Supabase Auth y la base de datos/RPC existentes.
- No se debe copiar la antigua UI de Apps Script literalmente.
- La lógica de negocio debe conservarse, pero implementarse correctamente en TypeScript/React cuando corresponda.
- No se deben reintroducir dependencias de Google Sheets o Apps Script.
- Deben respetarse tablas, columnas, RPC, triggers, estados y reglas existentes.
- La zona horaria funcional es Europe/Madrid.
- El cambio de fecha/turno que provoque pasar de COMIDA a CENA o viceversa debe respetar la regla de desasignación de mesas documentada.
- El APK es la aplicación privada para operaciones del personal.

---

# 4. TRABAJO YA REALIZADO

## 4.1. Auditoría exhaustiva previa a cualquier implementación

**Este punto es especialmente importante para la continuidad del proyecto.** Antes de que Jules empezara a tocar la implementación de V4, se le pidió expresamente realizar una **auditoría exhaustiva/forense del proyecto existente** y dejar por escrito en el repositorio todo lo descubierto, para que el conocimiento del proyecto no dependiera de una conversación concreta.

La auditoría fue tan amplia que Jules la estructuró en **13 documentos técnicos**, almacenados en `docs/auditoria-v4/`. Estos 13 archivos NO son una documentación que apareciera después de desarrollar el APK: son el resultado documentado de aquella auditoría previa y constituyen la base técnica que debía guiar la construcción de V4.

Por tanto, cuando se indique a Jules que revise la auditoría, debe entenderse que debe consultar **los 13 documentos completos como un único trabajo de auditoría**, no como trece tareas independientes.

La conclusión arquitectónica es:

**Supabase V4 + PWA pública + APK privado**, eliminando la dependencia operacional de Apps Script/Google Sheets.

La antigua arquitectura de Apps Script no debe volver a ser el backend del APK.

---

## 4.2. Implementación inicial del APK

El PR principal de referencia es:

**PR #33 — Implementación completa del APK Privado (Fases 1-3)**

En ese trabajo Jules incorporó, entre otras cosas:

- proyecto React + Vite + TypeScript en `android_app/`;
- Tailwind;
- Capacitor;
- configuración Android;
- navegación y pantallas privadas;
- integración con Supabase;
- Login;
- Inicio;
- Reservas;
- Mesas;
- Calendario;
- Clientes;
- Historial;
- Configuración;
- regla de limpieza de mesas al cambiar fecha/turno;
- modal de asignación de mesas principales/adicionales;
- configuración de Gradle;
- workflow de GitHub Actions;
- generación/verificación de `app-debug.apk`;
- documentación en `docs/ANDROID_APK.md`.

---

## 4.3. Correcciones críticas ya realizadas por Jules

Durante la continuación del PR #33 se detectaron dos problemas importantes:

### App.tsx

`android_app/src/App.tsx` había quedado con comportamiento de template Vite y no montaba correctamente la aplicación privada real.

Se pidió expresamente restaurar:

- Router;
- Layout;
- AuthProvider;
- navegación real;
- aplicación privada real desde el arranque.

Jules indicó haberlo corregido.

### gradlew

`android_app/android/gradlew` tenía un problema en el CLASSPATH.

También se corrigió.

### Java / CI

Se realizaron ajustes relacionados con:

- Java 21;
- Node;
- Capacitor CLI;
- Tailwind/PostCSS;
- configuración Gradle;
- GitHub Actions.

---

## 4.4. Commit importante conocido

Commit de referencia de la corrección de entrada/routing y Gradle:

`89f59b1178e0bec5d65b7c80e10f84dd904da942`

Mensaje:

`fix(android): restore correct routing in App.tsx and fix CLASSPATH inside gradlew`

Este commit forma parte del historial que debe conservarse y revisarse antes de realizar nuevas modificaciones.

---

# 5. ESTADO ACTUAL EXACTO

## Estamos en el BLOQUE 1 de 4.

El Bloque 1 **todavía no debe considerarse terminado hasta que Jules entregue un PR verificable y lo revisemos**.

El objetivo inmediato es consolidar la base del APK, no completar todavía todas las funciones.

### Estado esperado del Bloque 1

Debe quedar correctamente consolidado:

- React/TypeScript;
- App.tsx real;
- Router;
- Layout privado;
- AuthProvider;
- Supabase V4;
- protección de rutas;
- sesión;
- navegación;
- Login;
- Inicio;
- rutas de Reservas;
- rutas de Mesas;
- rutas de Calendario;
- rutas de Clientes;
- rutas de Historial;
- ruta de Configuración;
- Capacitor;
- Android;
- Gradle;
- GitHub Actions;
- build reproducible;
- generación de `app-debug.apk`.

### El Bloque 1 NO debe completar todavía

- lógica avanzada de reservas;
- calendario completo;
- asignación avanzada de mesas;
- gestión completa de clientes;
- historial completo;
- configuración avanzada;
- pruebas finales de todo el sistema.

Eso pertenece a los siguientes bloques.

---

# 6. LOS 4 BLOQUES DE DESARROLLO

## BLOQUE 1 — BASE Y ARQUITECTURA DEL APK

### Objetivo

Dejar la aplicación Android privada correctamente arrancando y estructurada.

### Trabajos

1. Auditar `android_app/`.
2. Consolidar App.tsx.
3. Consolidar Router.
4. Consolidar Layout.
5. Consolidar AuthProvider.
6. Comprobar Login.
7. Comprobar sesión.
8. Proteger rutas privadas.
9. Conectar Supabase V4.
10. Preparar todas las rutas privadas.
11. Eliminar restos del template Vite del flujo real.
12. Eliminar mocks del flujo real.
13. Comprobar Capacitor.
14. Comprobar Android.
15. Comprobar Gradle.
16. Comprobar GitHub Actions.
17. Generar `app-debug.apk`.

### Resultado

Una base Android real, arrancable y mantenible, preparada para implementar la funcionalidad privada.

---

# BLOQUE 2 — RESERVAS, CALENDARIO Y MESAS

### Objetivo

Implementar/verificar el núcleo operativo diario del personal.

### Reservas

Debe incluir la funcionalidad privada documentada para:

- consultar reservas;
- crear/modificar cuando corresponda;
- cancelar cuando corresponda;
- confirmar;
- gestionar estados;
- consultar por fecha;
- respetar comida/cena;
- respetar horarios;
- respetar las reglas de negocio de Supabase;
- respetar Europe/Madrid.

### Calendario

Debe permitir:

- seleccionar fecha;
- consultar reservas del día;
- diferenciar COMIDA y CENA;
- trabajar con los turnos sin mezclarlos;
- respetar las reglas de horarios;
- mostrar los estados relevantes.

### Mesas

Debe permitir:

- consultar mesas;
- ver disponibilidad/estado por turno;
- asignar mesa principal;
- asignar mesas adicionales;
- gestionar agrupaciones cuando corresponda;
- evitar colisiones;
- mantener separadas COMIDA y CENA.

### Regla crítica

Si una reserva cambia de fecha/hora y el cambio provoca pasar de COMIDA a CENA o de CENA a COMIDA, y tenía mesa o mesas adicionales asignadas:

**las mesas asignadas deben limpiarse automáticamente**, conforme a la regla documentada.

### Resultado

El personal debe poder utilizar el APK para la operativa diaria de reservas, calendario y mesas.

---

# BLOQUE 3 — CLIENTES, HISTORIAL Y CONFIGURACIÓN

### Objetivo

Completar las herramientas privadas de gestión.

### Clientes

Implementar/verificar:

- consulta;
- búsqueda;
- datos del cliente;
- historial relacionado cuando corresponda;
- reglas de bloqueo/estado documentadas;
- integración con Supabase.

### Historial

Implementar/verificar:

- consultas históricas;
- filtros necesarios;
- estados;
- información útil para el personal;
- sin cargar datos innecesarios al inicio.

### Configuración

Implementar/verificar las funciones privadas documentadas para:

- horarios;
- parámetros;
- opciones de operación;
- cualquier configuración prevista por el contrato V4.

No inventar parámetros.

### Rendimiento

El APK debe mantener el principio de:

**abrir → consultar → actuar rápidamente.**

No cargar toda la base de datos al iniciar.

---

# BLOQUE 4 — INTEGRACIÓN FINAL, SEGURIDAD Y PRUEBAS

### Objetivo

Cerrar el APK y dejarlo preparado para uso real.

### Integración

Verificar conjuntamente:

- Login;
- Inicio;
- Reservas;
- Calendario;
- Mesas;
- Clientes;
- Historial;
- Configuración;
- Supabase Auth;
- RLS/permisos;
- RPC;
- estados;
- reglas de negocio.

### Seguridad

Comprobar:

- autenticación;
- sesión;
- protección de rutas;
- permisos;
- no exposición innecesaria de credenciales;
- uso correcto del cliente Supabase;
- compatibilidad con las políticas existentes.

### Pruebas

Ejecutar los casos definidos en:

`docs/auditoria-v4/11_PLAN_PRUEBAS_V4.md`

Incluyendo especialmente:

- crear reserva;
- consultar;
- modificar;
- cancelar;
- confirmar;
- cambio de fecha;
- cambio de turno;
- limpieza automática de mesas;
- asignación de mesa;
- mesas adicionales;
- colisiones;
- horarios;
- clientes;
- historial;
- autenticación.

### APK final

- build limpio;
- Gradle;
- GitHub Actions;
- `app-debug.apk`;
- instalación;
- arranque;
- navegación;
- pruebas reales.

El APK final solo se considera terminado después de verificar el comportamiento real.

---

# 7. ORDEN OBLIGATORIO DE TRABAJO

No saltar bloques.

El flujo será siempre:

**Bloque → PR → revisión → merge → build → prueba real → siguiente bloque**

No hacer los cuatro bloques en una sola tarea.

### Para cada bloque

1. Preparar instrucciones para Jules.
2. Jules trabaja exclusivamente en ese bloque.
3. Jules crea PR.
4. Revisar el PR.
5. Corregir cualquier problema encontrado.
6. Fusionar cuando esté revisado.
7. Generar APK si corresponde.
8. Probar.
9. Registrar el resultado.
10. Pasar al siguiente bloque.

---

# 8. REGLAS ABSOLUTAS PARA JULES

Jules debe:

- continuar desde el estado existente;
- leer esta hoja de ruta;
- leer la auditoría V4;
- revisar primero el código actual;
- no rehacer el proyecto;
- no inventar arquitectura;
- no inventar tablas;
- no inventar columnas;
- no inventar RPC;
- no sustituir Supabase;
- no introducir Apps Script;
- no introducir Google Sheets;
- no tocar la PWA pública;
- no tocar V2;
- no tocar el sistema de correo;
- no tocar el PDF de reservas;
- no modificar funcionalidades ajenas al bloque actual;
- no avanzar automáticamente al siguiente bloque;
- dejar constancia de las comprobaciones realizadas;
- generar PR separado por bloque.

Si encuentra un problema que pertenece a otro bloque:

**documentarlo y dejarlo pendiente**, salvo que sea imprescindible para que el bloque actual funcione.

---

# 9. ELEMENTOS QUE NO SE DEBEN TOCAR DURANTE ESTA MIGRACIÓN

Salvo que una tarea futura lo autorice expresamente:

- PWA pública;
- diseño público;
- sistema de correo;
- `send-camborio-email`;
- PDF de reserva;
- `reservation-pdf.js`;
- V2;
- Google Sheets;
- Apps Script;
- funcionalidades que no pertenezcan al bloque actual.

El objetivo es evitar regresiones.

---

# 10. CRITERIO DE "TERMINADO"

Un bloque NO está terminado porque Jules diga que está terminado.

Debe existir:

1. código;
2. PR;
3. revisión;
4. merge;
5. build cuando corresponda;
6. verificación;
7. prueba real cuando corresponda.

Si alguna parte no se ha probado:

**debe considerarse NO VERIFICADA.**

---

# 11. ESTADO Y PRÓXIMO PASO

### Estado actual

**APK privado V4 — BLOQUE 1 pendiente de revisión/ejecución por Jules.**

La instrucción de Bloque 1 ya está preparada.

### Siguiente acción

Jules debe trabajar exclusivamente en:

**BLOQUE 1 — BASE Y ARQUITECTURA DEL APK**

Después:

**PR → revisión → merge → build/prueba**

Solo después de validar el Bloque 1 se prepara la instrucción del:

**BLOQUE 2 — RESERVAS, CALENDARIO Y MESAS**

---

# 12. NOTA PARA FUTURAS CONVERSACIONES

Si esta conversación termina y el desarrollo continúa en otro chat, **NO empezar preguntando qué se estaba haciendo**.

Leer primero:

1. este archivo;
2. PRs/commits recientes del APK;
3. `docs/ANDROID_APK.md`;
4. `docs/auditoria-v4/`.

Después identificar el bloque actual mediante este documento y continuar desde ahí.

**No asumir que un bloque está terminado solo porque existe código. Comprobar PR, merge, build y pruebas.**

---

## RESUMEN EN UNA LÍNEA

**APK privado V4 = Supabase + React/TypeScript + Capacitor/Android → Bloque 1 (base) → Bloque 2 (reservas/calendario/mesas) → Bloque 3 (clientes/historial/configuración) → Bloque 4 (integración/seguridad/pruebas) → APK final verificado.**
