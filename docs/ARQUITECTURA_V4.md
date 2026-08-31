# Arquitectura Camborio Reservas V4

## Backend

El backend de desarrollo es el proyecto Supabase `ReservasV4` en la organización `decelife26`, región `eu-west-1`.

La base real de reservas de `decelife25` permanece fuera de este desarrollo y no debe modificarse durante la construcción.

## Aplicaciones

El repositorio V4 tendrá dos aplicaciones claramente separadas:

### PWA pública

Acceso desde Internet para clientes. Debe ser rápida, móvil y no requerir instalación.

Funciones previstas:

- crear reserva;
- consultar reserva;
- modificar reserva;
- cancelar reserva;
- recibir información de la reserva por los canales previstos.

### APK privada

Aplicación Android instalada para el personal de Camborio.

Funciones previstas a partir de la lógica validada en V2:

- reservas del día;
- confirmaciones;
- calendario;
- mesas y asignaciones;
- clientes;
- historial;
- configuración y administración según permisos.

## Fuente funcional

`Camborio-Reservas-V2` es la referencia principal para la lógica de negocio. La V4 debe conservar el comportamiento útil y probado de V2, adaptando únicamente la implementación cuando la arquitectura nueva lo requiera.

No se debe copiar automáticamente código dependiente de Google Sheets, Apps Script u otras partes obsoletas.

## Regla de seguridad

La PWA y el APK comparten el backend, pero no deben compartir automáticamente los mismos permisos. El acceso se diseñará mediante roles, privilegios y RLS/policies apropiadas en Supabase.

No se deben conceder permisos globales por comodidad para ocultar errores de configuración.

## Regla de desarrollo

No implementar toda la funcionalidad de golpe.

Orden recomendado:

1. congelar y validar la interfaz pública;
2. estudiar el contrato de datos y la lógica de V2;
3. conectar una única operación real contra ReservasV4;
4. probarla de extremo a extremo;
5. continuar con la siguiente operación;
6. construir después el APK privado sobre el mismo contrato.

## Fuentes y proyectos que NO deben modificarse

- base real de reservas de `decelife25`;
- `PortalDecelife`;
- repositorio `Camborio-Reservas-V2` salvo cambios explícitamente planificados y revisados.
