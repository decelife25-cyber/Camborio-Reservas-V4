# Continuidad del proyecto — Camborio Reservas V4

## 1. Decisión principal

Se ha decidido separar la nueva aplicación de reservas de la aplicación actual de Google Apps Script.

Habrá dos productos independientes:

1. **PWA pública**: nueva aplicación web para que los clientes hagan, consulten, modifiquen o cancelen sus reservas.
2. **Aplicación privada Android**: futura APK/nativa para el personal de Camborio.

Ambas aplicaciones deberán trabajar directamente con Supabase y no depender de Google Apps Script.

## 2. Aplicación actual

La versión actualmente operativa procede de Camborio Reservas V2/V3 y todavía contiene restos de la arquitectura anterior basada en Google Sheets/Apps Script.

Se ha observado que algunos cambios recientes llegaron a provocar problemas de conexión, disponibilidad de horarios y elementos visuales. Por eso la nueva PWA no debe construirse modificando indiscriminadamente el código antiguo: se parte de una aplicación nueva y limpia.

## 3. Base de datos

Se considera preferible disponer de una **base de datos Supabase de desarrollo independiente**, con el mismo esquema que la base de datos real de reservas.

Objetivo:

- La aplicación actual continúa trabajando con datos reales.
- La nueva PWA puede probar crear, modificar, confirmar, cancelar y consultar reservas sin tocar los datos reales.
- Cuando la nueva aplicación esté terminada y probada, se podrá configurar para apuntar a la base de datos real.
- Para facilitar ese cambio, desarrollo y producción deben mantener el mismo esquema, nombres de tablas, columnas, relaciones y reglas relevantes.

## 4. Seguridad / claves

La nueva arquitectura deberá evitar claves de personal incrustadas en el código cuando sea posible. El sistema de acceso privado deberá diseñarse para que las credenciales o códigos modificables puedan cambiarse sin tener que recompilar toda la aplicación.

Nunca se deben introducir claves secretas de Supabase en el frontend. La clave pública/anónima y las políticas RLS deberán diseñarse correctamente.

## 5. Limpieza del código antiguo

No se hará una limpieza masiva del repositorio antiguo como primer paso de esta migración.

La estrategia es:

- conservar la aplicación actual funcionando;
- crear la nueva PWA desde cero;
- reutilizar únicamente lógica o contratos que hayan sido comprobados y sean útiles;
- eliminar de la nueva aplicación cualquier dependencia de Google Sheets, SpreadsheetApp o Apps Script;
- revisar progresivamente reglas de negocio y comportamiento durante la construcción.

Elementos antiguos como el botón/icono de actualización que servía para sincronizar datos con Google Sheets **no deben existir en la nueva aplicación**.

## 6. Diseño conocido

La interfaz debe estar optimizada para móvil y ser rápida, clara y sencilla.

La identidad visual debe corresponder a Cervecería Tapería Camborio, incluyendo el logotipo correcto y su estilo visual.

La pantalla pública actual contiene, como referencia funcional:

- Nombre
- Teléfono
- Email opcional
- Número de personas
- Fecha
- Hora
- Observaciones
- Enviar reserva
- Ya tengo una reserva / modificar o cancelar
- Dirección y teléfono de reservas

La nueva PWA debe mejorar la experiencia sin perder las funciones necesarias.

## 7. Problemas detectados en la versión actual que no deben reproducirse

- Logo público que en determinadas versiones no carga correctamente.
- Horarios que han aparecido como no disponibles cuando sí deberían existir.
- Dependencias o errores de conexión con Supabase.
- Dependencias residuales de Google Apps Script/Google Sheets.
- Código con dualidad de backend antiguo y nuevo.
- Elementos de interfaz sin sentido para la arquitectura definitiva.

## 8. Forma de trabajo

Se seguirá una estrategia controlada:

1. Diseñar una pantalla o funcionalidad.
2. Implementarla.
3. Probarla con la base de desarrollo.
4. Revisar errores.
5. Aprobar el resultado.
6. Continuar con la siguiente pieza.

No se debe modificar la aplicación real innecesariamente durante este proceso.

## 9. Migración final

Cuando la PWA esté terminada y validada:

- se verificará que su esquema de datos es compatible con producción;
- se cambiará la configuración de Supabase de desarrollo a producción;
- se probará con los datos reales sin modificar funcionalidades accidentalmente;
- se pondrá la PWA en producción desde el dominio/portal de Decelife.

Después se seguirá el mismo enfoque para la aplicación privada Android.
