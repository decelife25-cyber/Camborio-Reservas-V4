# HOJA DE RUTA — Camborio Reservas V4

Actualizado: 22/09/2026
Rama actual: feat/v4-planos-mesas-v2-1.0.029

## PRINCIPIO
V4 debe conservar la apariencia y comportamiento de V2 como referencia visual y funcional. Copiar CSS, distribución, tamaños, tipografías, posiciones y comportamiento siempre que sea posible. No inventar UI si V2 ya tiene una solución. Adaptar solo lo necesario a V4/Supabase. No modificar V2.

Workflow: un problema cada vez; cambio pequeño; build; prueba real Android; revisión; y SOLO después de aprobación del usuario fusionar el PR.

## ESTADO
Implementado/probado: cabecera y menú V4, HACER RESERVA, CALENDARIO, BUSCAR RESERVA, RESERVAS HOY, CONFIRMAR, PLANOS DE MESAS inicial, modo día/noche, filtro compartido, ReservationCard compartido, rueda de hora V2, selector de fecha, observaciones, mesas adicionales/uniones y Supabase.
Última versión preparada: V1.0.031. Verificar siempre GitHub Actions antes de entregar APK.

## PLANOS DE MESAS: UN SOLO COMPONENTE
No duplicar el plano entre PLANOS DE MESAS y ASIGNAR MESA. Debe existir un único componente de plano reutilizable.

### PLANOS DE MESAS
- Mostrar fecha pulsable.
- Al pulsar fecha, abrir el mismo selector usado en HACER RESERVA.
- Día actual seleccionado inicialmente.
- Permitir consultar otros días futuros.
- Mostrar COMIDA/CENA porque es consulta general.
- Mostrar TERRAZA/SALÓN/CHILL OUT.
- Cargar estado según fecha + turno.

### ASIGNAR MESA
Al pulsar SIN ASIGNAR en una reserva, abrir ficha de asignación usando el MISMO componente de plano.
No mostrar selector COMIDA/CENA porque la reserva ya tiene hora.
Mostrar NOMBRE, FECHA, TELÉFONO, HORA, PERSONAS/PAX y MESAS ASIGNADAS.
Debajo mostrar TERRAZA/SALÓN/CHILL OUT y el mismo plano.

## TURNO AUTOMÁTICO
- Hora menor de 18:00 = COMIDA.
- Hora desde 18:00 inclusive = CENA.
La asignación carga automáticamente ese turno.

## LEYENDA
Plano general: LIBRE, RESERVADA, OCUPADA, DESACTIVADA.
Asignación: PRINCIPAL, ADICIONAL, CAMBIO PENDIENTE, LIBRE, RESERVADA, OCUPADA, DESACTIVADA.
Pendiente: en modo día la leyenda inferior no se ve bien. Corregir contraste/color para que todos los elementos sean legibles como en modo noche.

## ASIGNACIÓN
1. Pulsar SIN ASIGNAR.
2. Abrir ficha.
3. Mostrar datos.
4. Determinar turno por hora.
5. Cargar plano.
6. Seleccionar PRINCIPAL.
7. Seleccionar una o varias ADICIONALES.
8. Mostrar CAMBIO PENDIENTE antes de guardar.
9. GUARDAR ASIGNACIÓN.
10. Persistir Mesa y MesasAdicionales en Supabase.
11. Refrescar estado.

## FECHA
El plano general debe permitir cambiar de día mediante el mismo calendario de HACER RESERVA.
Componente común: android_app/src/components/FechaPicker.tsx

## DISTRIBUCIÓN CAMBORIO
Conservar exactamente V2:
- TERRAZA: mesas 1–21.
- SALÓN: mesas 101–110.
- CHILL OUT: mesas 201–210.
No recolocar manualmente salvo mediante el futuro diseñador.

## FUTURO: DISEÑADOR DE PLANOS
Documento: docs/FUTURO_DISENADOR_PLANOS_MESAS.md
Ruta: CONFIGURACIÓN → MESAS → DISEÑADOR DE PLANOS.
Debe permitir crear/renombrar/activar/desactivar/ocultar planos; añadir/eliminar/duplicar mesas; arrastrar; redimensionar; numerar/renumerar; capacidad; ocultar/mostrar; activar/desactivar; uniones; previsualización; adaptación a pantallas; coordenadas relativas.
El plano de Camborio debe acabar siendo configuración de datos, no dibujo fijo en código.

## OBJETIVO MULTIESTABLECIMIENTO
Separar motor común de configuración del establecimiento.
Configuración: nombre, logo, colores, teléfonos, correo, horarios, turnos, planos, mesas, capacidades, uniones y parámetros.
La misma aplicación debe poder adaptarse a otros bares sin modificar el núcleo.

## ORDEN INMEDIATO
1. Terminar PLANOS DE MESAS.
2. Corregir leyenda completa en modo día.
3. Terminar SIN ASIGNAR → ASIGNAR MESA.
4. Reutilizar el mismo componente de plano.
5. Turno automático por hora.
6. Mostrar ficha completa de reserva.
7. Principal/adicional/cambio pendiente.
8. Guardar en Supabase.
9. Probar diferentes horas, días y zonas.
10. Probar día/noche.
11. Generar APK y verificar Actions.
12. Usuario prueba.
13. Solo después de aprobación, fusionar PR.

Después: Configuración → Parámetros → Horarios → Mesas → Diseñador visual.

## REGLAS
- No duplicar componentes.
- No tocar V2.
- No cambiar diseño sin motivo.
- No hacer varias funcionalidades grandes en un mismo cambio.
- No entregar APK sin build verificado.
- No afirmar que funciona sin comprobar Actions.
- Mantener versiones incrementales.
- No rehacer lo que el usuario ya ha aprobado.
- Prioridad: funcionamiento real + fidelidad V2 + reutilización.

## HANDOFF
La siguiente tarea es unificar definitivamente PLANOS DE MESAS y ASIGNAR MESA mediante un único componente, corregir la leyenda del modo día y hacer que SIN ASIGNAR abra la ficha de la reserva con el plano correspondiente a su hora.
NO empezar todavía el Diseñador de Planos.
