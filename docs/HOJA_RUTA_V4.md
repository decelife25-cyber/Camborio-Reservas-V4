# Camborio Reservas V4 — Hoja de ruta

## Objetivo
Crear la nueva versión de Camborio Reservas manteniendo la lógica de negocio desarrollada durante meses en V2, con una PWA pública para clientes y una aplicación Android privada para el personal.

## Arquitectura acordada
- Un único repositorio: `Camborio-Reservas-V4`.
- Un único backend de desarrollo: Supabase `ReservasV4`.
- PWA pública: acceso desde Internet, sin instalación obligatoria.
- APK privada: aplicación Android para el personal.
- V2 se conserva como referencia funcional.
- La base antigua de producción y PortalDecelife no se modifican.

## Punto de partida
- Se conservan las pantallas y diseño del proyecto público actual.
- No se reutiliza la lógica de Supabase que estaba provocando errores.
- No se copian datos reales.

## Fases
1. Auditar Camborio-Reservas-V2 y recuperar la lógica funcional real.
2. Comparar esa lógica con ReservasV4 y definir el contrato definitivo.
3. Completar la base de desarrollo solo cuando el contrato esté comprobado.
4. Conectar la PWA progresivamente, empezando por crear una reserva.
5. Probar consulta, modificación y cancelación.
6. Construir la aplicación privada Android sobre el mismo backend.
7. Validar el conjunto completo antes de sustituir cualquier sistema anterior.

## Estado actual
- [x] Repositorio V4 creado y privado.
- [x] Pantallas iniciales copiadas.
- [x] Backend nuevo ReservasV4 existente.
- [ ] Logo `camborio.png` incorporado.
- [ ] Auditoría completa de V2.
- [ ] Contrato definitivo de datos.
- [ ] PWA conectada a ReservasV4.
- [ ] APK privada.
- [ ] Pruebas finales.

## Normas de trabajo
- No pedir al usuario capturas cuando la información pueda obtenerse directamente mediante las herramientas disponibles.
- Evitar parches aislados: localizar primero la causa y corregirla de forma completa.
- Mantener los cambios pequeños y comprobables.
- Revisar y cerrar los PR cuando corresponda.
- No modificar producción, PortalDecelife ni datos reales.
- Registrar en esta hoja los hitos importantes para facilitar la continuidad entre chats.
