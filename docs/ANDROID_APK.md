# Camborio Reservas V4 - Aplicación Android Privada

Este documento describe la arquitectura, construcción y control de versiones de la aplicación privada para el personal de Taberna Camborio, desarrollada como parte de la V4.

## Arquitectura Elegida

La aplicación ha sido desarrollada utilizando una arquitectura **Híbrida/PWA empaquetada con Capacitor**.
- **Frontend:** Construido con React, TypeScript y TailwindCSS.
- **Enrutamiento:** `react-router-dom` para navegación fluida tipo SPA sin recargas.
- **Empaquetado:** Capacitor (`@capacitor/core`, `@capacitor/android`) se encarga de compilar el código web y empaquetarlo en un APK nativo Android.
- **Backend:** Conexión directa a Supabase V4 utilizando el cliente `@supabase/supabase-js`.

**Razón de la elección:** Permite conservar la agilidad de desarrollo, mantener una fidelidad visual perfecta (modo claro/oscuro) adaptada a móviles/tablets (TPV) y reutilizar la misma base de código TypeScript para la lógica de negocio compleja (como el manejo de turnos y grupos de mesas), cumpliendo la prioridad de velocidad y estabilidad sin reinventar la lógica en Java/Kotlin.

## Configuración y Supabase

- **Autenticación:** Utiliza Supabase Auth. Los empleados inician sesión con Email y Contraseña. Su rol en Supabase es `authenticated`, lo que permite configurar políticas RLS (Row Level Security) estrictas en la base de datos para diferenciar clientes (PWA) de personal (APK).
- **Módulos implementados:**
  - `Inicio`: Estadísticas del día en tiempo real.
  - `Reservas`: Lista de reservas, confirmación, sentar y cancelar.
  - `Calendario`: Vista de reservas organizadas por turnos (COMIDA/CENA) por día.
  - `Mesas`: Asignación de mesa principal y mesas adicionales respetando bloqueos y disponibilidad en tiempo real.
  - `Clientes`: Directorio de clientes con buscador y contadores de historial.
  - `Historial`: Log de acciones en el sistema.
  - `Configuración`: Muestra la versión real del APK.

## Cómo Generar el APK

Existen dos formas de generar el APK:

### 1. Manualmente en local
1. Navegar al directorio de la app: `cd android_app`
2. Instalar dependencias: `npm install`
3. Construir la web: `npm run build`
4. Sincronizar con Capacitor: `npx cap sync android`
5. Abrir en Android Studio: `npx cap open android` (y darle a Build -> Build APK) o por terminal:
   ```bash
   cd android
   ./gradlew assembleDebug
   ```
   El APK estará en `android_app/android/app/build/outputs/apk/debug/app-debug.apk`

### 2. Automáticamente vía GitHub Actions (CI/CD)
Se ha configurado un workflow en `.github/workflows/android.yml`.
- Cada vez que se haga un `push` o `pull_request` a la rama `main` afectando la carpeta `android_app/`, GitHub Actions construirá el APK.
- **Artifact:** Una vez finalizado el workflow, el APK se puede descargar desde la pestaña "Actions" del repositorio en la sección de "Artifacts".

## Control de Versiones

La versión que se muestra en la pantalla de "Configuración" es la versión REAL leída del propio binario del APK utilizando el plugin `@capacitor/app`.

Para actualizar la versión:
1. Abre el archivo `android_app/android/app/build.gradle`
2. Modifica:
   - `versionCode` (debe ser un número entero que siempre se incrementa, ej. `2`)
   - `versionName` (la versión en formato texto, ej. `"1.0.1"`)
3. Haz un commit y push. GitHub Actions construirá el nuevo APK con esa versión y la aplicación mostrará automáticamente "v1.0.1".
