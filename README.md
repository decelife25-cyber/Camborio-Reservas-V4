# Camborio-Reservas-V4

Nueva arquitectura de Camborio Reservas.

## Objetivo

Construir una versión limpia y mantenible de Camborio Reservas conservando la lógica de negocio validada durante el desarrollo de V2, pero eliminando dependencias antiguas y separando claramente la aplicación pública de la privada.

## Arquitectura prevista

- **PWA pública:** acceso desde Internet para clientes, sin instalación obligatoria.
- **APK privada Android:** aplicación instalada para el personal de Camborio.
- **Backend único:** proyecto Supabase `ReservasV4` para desarrollo.
- **Repositorio único:** este repositorio contiene las aplicaciones y los contratos compartidos.

## Punto de partida

La carpeta raíz contiene únicamente el punto estable de interfaz de `Camborio-Reservas-Publico`: pantallas, estilos y flujo visual. La lógica de backend todavía no está conectada.

La aplicación antigua `Camborio-Reservas-V2` es la referencia funcional para reglas de negocio y comportamiento. No se deben copiar automáticamente sus problemas técnicos.

## Reglas de trabajo

1. No tocar la base real de reservas.
2. No tocar `PortalDecelife`.
3. No introducir claves secretas de Supabase en frontend.
4. Implementar una funcionalidad cada vez y probarla contra `ReservasV4`.
5. Antes de reescribir una regla de negocio, comprobar cómo funciona en V2.
6. No añadir parches para ocultar errores: primero localizar la causa.

## Estado inicial

Las pantallas funcionan como prototipo local. Las operaciones reales de crear, consultar, modificar, cancelar, correo y PDF se conectarán posteriormente mediante un contrato Supabase revisado.
