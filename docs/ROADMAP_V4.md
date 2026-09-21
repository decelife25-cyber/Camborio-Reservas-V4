# ROADMAP V4 — ESTADO ACTUAL Y CONTINUIDAD

Fecha de actualización: 21/09/2026

## Objetivo actual

Terminar la primera pantalla del panel privado Android de Camborio Reservas V4, reproduciendo **de forma fiel la pantalla privada V2 ya validada** y adaptándola correctamente al WebView/Android del dispositivo real.

La prioridad NO es seguir añadiendo pantallas. La prioridad es cerrar esta primera pantalla.

## Estado

### Completado / operativo

- Backend oficial V4: Supabase.
- Autenticación privada: Supabase Auth funcionando.
- Lectura de `public."Reservas"` corregida con permisos `authenticated`.
- Inicio ya consulta la tabla `Reservas` real de Supabase.
- Panel público/PWA funcional y debe permanecer intacto.
- PDF de reservas funcional y fuera de alcance.
- Firma estable del APK configurada.
- Splash Android corregido para Android 12+.
- Botón de refresco del panel privado sustituido por modo día/noche.
- PR #65 contiene una primera adaptación de medidas V2 y reglas responsive, pero **NO debe considerarse validada visualmente**.

### Problema actual

La primera pantalla privada sigue sin coincidir con V2.

Durante varios intentos se copiaron medidas CSS de V2, pero el resultado físico en el dispositivo no coincidía con la captura de V2. La causa no debe volver a suponerse ni corregirse mediante números inventados.

La última evidencia del dispositivo muestra dos problemas distintos según la versión probada:

1. Versiones anteriores: interfaz gigantesca.
2. Última prueba mostrada por el usuario (V1.0.2): interfaz ya demasiado reducida, logo demasiado pequeño y demasiado espacio vacío arriba.

Por tanto, el siguiente agente debe medir y entender **cómo V2 adapta realmente su viewport/WebView al dispositivo**, no aplicar otro factor arbitrario.

## Referencia visual obligatoria

La referencia es la pantalla privada V2 real, no una aproximación:

- Cabecera compacta.
- Logo/emblema y marca alineados como V2.
- Controles de modo, configuración y cierre de sesión.
- Menú 3x2 compacto.
- Reservas Hoy seleccionado.
- Cabecera de fecha/turnos compacta.
- Botones Comida/Cena y filtro.
- Mensaje de ausencia de reservas.
- Todo debe ocupar la pantalla móvil como V2.

El usuario ha indicado expresamente:

> No quiere que V4 "se parezca" a V2. Quiere que se reproduzca el diseño y adaptación de V2 utilizando los datos reales existentes.

## Regla crítica para el siguiente agente

NO:

- inventar factores de escala;
- cambiar tamaños a ojo;
- hacer otra cadena de pruebas sin comparar V2 y V4;
- asumir que el ancho CSS del WebView equivale al ancho físico;
- tocar Supabase o la lógica de reservas para resolver un problema visual;
- tocar el panel público;
- tocar el PDF.

SÍ:

1. Inspeccionar V2 directamente.
2. Inspeccionar V4 directamente.
3. Comparar viewport, `devicePixelRatio`, density, meta viewport, CSS, WebView/Capacitor y cualquier regla de escalado de V2.
4. Determinar la transformación real que hace que V2 se vea correctamente en el mismo dispositivo.
5. Aplicar esa adaptación a V4 de forma controlada.
6. Probar con una APK claramente versionada.
7. Solo después continuar con la siguiente pantalla.

## Versionado APK

El usuario necesita identificar inequívocamente qué APK está instalando.

La APK debe llevar:

- `versionName` explícito: 1.0.1, 1.0.2, 1.0.3...
- `versionCode` creciente.
- Versión visible discretamente dentro del panel privado, por ejemplo `V1.0.2`.
- Nombre del artefacto/APK claramente identificable.

IMPORTANTE: el repositorio principal consultado actualmente todavía contiene referencias antiguas de versionado (`package.json` 0.0.0 y `build.gradle` versionName 1.0 en el estado main inspeccionado). El usuario mostró en el dispositivo una APK con `V1.0.2`, por lo que el nuevo agente debe comprobar qué commit/branch produjo exactamente esa APK antes de asumir que corresponde a main.

## PRs relevantes

- PR #55: primera pantalla privada V2-like.
- PR #56: compactación + modo día/noche.
- PR #57: intento de igualar layout V2.
- PR #61: intento de responsive V2 con factor de escala.
- PR #62: calibración de ese factor.
- PR #64: corrección del splash Android.
- PR #65: copia directa de medidas/breakpoints V2; sigue abierto y no está validado visualmente.

No fusionar PR #65 ni otra solución visual sin revisar primero el resultado.

## Próximo objetivo inmediato

Resolver SOLO:

**Escala/adaptación de la pantalla Inicio privada V4 para que coincida con V2 en el dispositivo real.**

Después:

1. versionar APK;
2. mostrar versión;
3. generar APK;
4. usuario instala y comprueba;
5. comparar captura V4 contra captura V2;
6. cerrar la pantalla Inicio;
7. pasar a la siguiente pantalla.

## Arquitectura que no debe alterarse

- Backend: Supabase.
- Proyecto Supabase: `caeszgtogifserrxdrcw`.
- Android: Capacitor.
- Frontend: React + TypeScript.
- V4 independiente de Apps Script/Google Sheets.
- V2 solo como referencia funcional/visual.
