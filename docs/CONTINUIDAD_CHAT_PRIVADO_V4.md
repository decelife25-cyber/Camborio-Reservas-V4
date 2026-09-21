# CONTINUIDAD CHAT — CAMBORIO RESERVAS V4 / PANEL PRIVADO

## LEER ESTE ARCHIVO PRIMERO

Este archivo existe para que un nuevo chat pueda continuar el trabajo sin repetir un día de investigación ni volver a inventar soluciones.

**Repositorio:** `decelife25-cyber/Camborio-Reservas-V4`

**Archivo de roadmap:** `docs/ROADMAP_V4.md`

**Documento de contexto obligatorio:** `docs/CONTEXTO_Y_REGLAS_DE_EVOLUCION_V4.md`

**Auditoría completa:** `docs/auditoria-v4/`

---

## 1. QUÉ ESTAMOS HACIENDO AHORA

Estamos construyendo el **panel privado Android de Camborio Reservas V4**.

La primera pantalla es "Reservas Hoy / Inicio".

El problema actual es exclusivamente visual/responsive: la pantalla V4 no se adapta físicamente como la pantalla privada V2 en el mismo móvil.

El usuario ha probado muchas APK durante el 21/09/2026 y está frustrado porque los cambios anteriores no reproducían V2.

### Estado visual observado

- Varias APK anteriores: TODO aparecía gigantesco.
- Una última APK mostrada por el usuario aparece ya demasiado reducida: logo pequeño, mucho espacio vacío arriba y elementos demasiado separados.
- Esa última captura muestra discretamente `V1.0.2`.
- Por tanto, la dirección correcta NO es seguir aumentando/reduciendo números a ojo.

Hay que descubrir el mecanismo real de adaptación de V2.

---

## 2. REGLA ABSOLUTA

El usuario ha dicho que no quiere una versión "parecida" a V2.

Quiere:

**V4 = misma composición, proporciones, tamaños, posiciones y adaptación responsive de V2, adaptada a React/Capacitor/Supabase.**

Antes de tocar CSS hay que estudiar V2 y V4.

No inventar un `--v2s`, `zoom: 0.42`, `transform: scale(...)` u otro factor sin haber demostrado de dónde sale.

La última prueba con `zoom` produjo una versión demasiado pequeña y con una separación superior incorrecta. No repetir ese método a ciegas.

---

## 3. QUÉ YA FUNCIONA Y NO TOCAR

- Supabase es el backend oficial.
- Auth privado funciona.
- `public."Reservas"` tiene el permiso SELECT necesario para `authenticated`.
- Inicio consulta la tabla real `Reservas`.
- El PDF de reserva funciona perfectamente. NO tocar.
- Panel público/PWA funciona. NO tocar salvo una petición explícita.
- Email/OAuth funciona/está configurado. NO tocar para resolver este problema visual.
- Splash Android ya fue corregido.
- Firma estable del APK ya está configurada.
- El botón verde de refresco fue sustituido por modo día/noche.

---

## 4. ARCHIVOS V4 PRINCIPALES PARA ESTA PANTALLA

### `android_app/src/pages/Inicio.tsx`
Renderiza:

- fecha actual;
- Comida;
- Cena;
- filtro;
- estado vacío;
- tarjetas de reservas.

Consulta:

`public."Reservas"`

Campos usados:

`ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Turno`

### `android_app/src/components/Layout.tsx`

Renderiza:

- cabecera;
- logo;
- TABERNA CAMBORIO;
- CERVECERÍA · TAPERÍA;
- modo día/noche;
- configuración;
- cerrar sesión;
- menú 3x2.

### `android_app/src/index.css`

Contiene el layout completo del panel privado y los intentos de adaptación V2.

Este archivo es el principal objetivo visual.

---

## 5. REFERENCIA V2 QUE HAY QUE ESTUDIAR

Repositorio:

`decelife25-cyber/Camborio-Reservas-V2`

Referencia histórica especialmente importante:

commit `af81beafe854f4a18e680b3c20821adcea260efc`

Archivos relevantes:

- `Privado.html`
- `Privado_Header.html`
- `Privado_Menu.html`
- `Privado_CSS_Tema.html`
- `Privado_CSS_Botones.html`
- `Privado_CSS_Reservas.html`
- `Publico_Header.html`
- `Publico_CSS_Base.html`
- archivos de logo/publico correspondientes.

Medidas V2 ya comprobadas:

### Menú V2

Base:

- 3 columnas.
- gap 7px.
- min-height 150px.
- padding 14px 8px.
- gap interno 12px.
- icono 50px.
- texto 24px.
- line-height 1.12.

Hasta 620px:

- min-height 144px.
- padding 12px 4px.
- gap 10px.
- icono 46px.
- texto `clamp(18px,5.4vw,22px)`.

Hasta 360px:

- gap 5px.
- min-height 140px.
- padding horizontal 2px.
- icono 43px.
- texto 18px.

### Cabecera privada V2

Valores comprobados durante la auditoría:

- cabecera alrededor de 78px;
- emblema 69px en el breakpoint correspondiente;
- nombre 21–24px;
- línea secundaria 15–16px;
- iconos 44px;
- cerrar sesión 56px.

Pero NO basta con copiar estos números: hay que entender cómo V2 los presenta físicamente en el WebView del dispositivo.

### Base tipográfica V2

`Publico_CSS_Base.html` establece:

- html font-size 16px;
- text-size-adjust 100%;
- body font-size 17px.

Esto debe compararse con V4.

---

## 6. POR QUÉ LOS INTENTOS ANTERIORES FALLARON

Se hicieron varios intentos:

1. Copiar dimensiones aproximadas.
2. Compactar.
3. Crear un factor `--v2s`.
4. Calibrar ese factor.
5. Eliminar el factor y copiar breakpoints directamente.
6. Cambiar viewport/text sizing.
7. Finalmente se probó una reducción global con `zoom`.

El problema es que las capturas demostraron que **el tamaño CSS del WebView de V4 no está produciendo la misma escala física que V2**.

El error fue tratarlo como si bastara con copiar números CSS.

La siguiente investigación debe determinar la causa real:

- viewport CSS;
- devicePixelRatio;
- densidad;
- WebView;
- meta viewport;
- Capacitor;
- Android window/insets;
- diferencias de AppSheet/WebView de V2;
- cualquier CSS/JS de V2 que adapte dimensiones.

---

## 7. VERSIONADO APK

El usuario quiere saber exactamente qué APK está instalando.

La APK debe usar una numeración:

`1.0.1` → `1.0.2` → `1.0.3`...

Y debe mostrar discretamente la versión en pantalla.

La captura más reciente del usuario muestra:

`V1.0.2`

pero el estado `main` inspeccionado del repositorio todavía tenía:

- `android_app/package.json`: `0.0.0`
- `android_app/android/app/build.gradle`: `versionName "1.0"`

Por tanto, el nuevo chat debe averiguar primero **de qué commit/branch salió exactamente la APK V1.0.2** y consolidar el versionado en el repositorio.

No asumir que una APK descargada con nombre `app-debug-17.apk` es la versión correcta.

El `versionName` visible dentro de la aplicación es la identificación fiable para el usuario.

---

## 8. PRs IMPORTANTES

### PR #55
Primera implementación de la pantalla privada V2-like.

### PR #56
Compactación y modo día/noche.

### PR #57
Intento de igualar layout V2.

### PR #61
Responsive mediante factor `--v2s`.

### PR #62
Calibración del factor.

### PR #64
Corrección del splash Android.

### PR #65
"Copia de tamaños del panel privado V2 sin escalado artificial".

Estado comprobado al crear este documento:

- PR #65 está ABIERTO.
- No está validado visualmente.
- No fusionarlo automáticamente.
- El review automático de Codex informó que se habían agotado los límites de code review.

---

## 9. LOS 13 DOCUMENTOS DE LA AUDITORÍA JULES

El nuevo chat debe leerlos, al menos sus conclusiones, antes de hacer cambios estructurales:

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

Especialmente importantes para no romper el proyecto:

- 03 — lógica de negocio.
- 04 — contrato de base de datos.
- 06 — separación público/privado.
- 08 — código reutilizable.
- 09 — arquitectura V4.
- 11 — pruebas.
- 12 — riesgos.
- 13 — revisión final.

---

## 10. FLUJO OBLIGATORIO A PARTIR DE AHORA

Un problema cada vez.

### Paso 1
Leer:

- este archivo;
- `docs/ROADMAP_V4.md`;
- `docs/CONTEXTO_Y_REGLAS_DE_EVOLUCION_V4.md`.

### Paso 2
Inspeccionar V2 y V4.

### Paso 3
Resolver únicamente la adaptación visual/responsive de Inicio.

### Paso 4
Crear PR pequeño.

### Paso 5
Revisar diff.

### Paso 6
Compilar APK.

### Paso 7
Comprobar `versionName`, `versionCode` y versión visible.

### Paso 8
Entregar APK real al usuario.

### Paso 9
El usuario prueba en el mismo dispositivo.

### Paso 10
Comparar captura V2/V4.

### Paso 11
Solo cuando Inicio esté correcto, pasar a otra pantalla.

---

## 11. NO TOCAR

Mientras se corrige Inicio:

- Supabase.
- PDF.
- correo.
- PWA pública.
- lógica de reservas.
- Auth.
- splash.
- firma.
- otras pantallas.

---

## 12. OBJETIVO VISUAL FINAL DE ESTA FASE

La captura V4 debe quedar visualmente equivalente a la V2 de referencia:

- logo y marca correctamente situados arriba;
- sin logo gigante;
- sin logo diminuto;
- sin espacio vacío excesivo;
- cabecera compacta;
- menú 3x2 compacto;
- botones Comida/Cena/filtro correctamente proporcionados;
- fecha compacta;
- mensaje vacío compacto;
- todo adaptado al ancho y alto reales del móvil.

La versión debe ser identificable en pantalla como `V1.0.x`.

**No continuar con nuevas funcionalidades hasta cerrar esta pantalla.**
