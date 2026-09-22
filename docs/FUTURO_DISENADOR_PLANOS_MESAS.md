# FUTURO — Diseñador de Planos de Mesas

> Documento de referencia para retomar esta funcionalidad cuando V4 esté estabilizada. No implementar todavía.

## Objetivo

Crear en **CONFIGURACIÓN → MESAS** una herramienta visual, provisionalmente llamada **Diseñador de Planos**, para diseñar y administrar los planos de mesas desde la propia aplicación.

El plano no debe quedar dibujado de forma fija en código. Debe ser una configuración almacenada que el motor de V4 pueda leer y representar.

La herramienta debe servir para Camborio y quedar preparada para reutilizar el mismo núcleo de la aplicación en otros bares/restaurantes, personalizando configuración, planos, mesas, logotipo, correo, teléfonos, colores y otros datos sin reprogramar el motor.

## Acceso

**CONFIGURACIÓN → MESAS → DISEÑADOR DE PLANOS**

## Gestión de planos

Debe permitir:

- Ver los planos existentes.
- Crear planos nuevos.
- Renombrar planos.
- Activar/desactivar planos.
- Ocultar planos.
- Eliminar planos cuando no existan dependencias que lo impidan.
- Tener tantos planos como necesite cada establecimiento.

Camborio actualmente tiene:
- TERRAZA
- SALÓN
- CHILL OUT

Otro establecimiento podría tener INTERIOR, TERRAZA, PLANTA 1, PLANTA 2, PRIVADO, etc.

## Editor visual

Cada plano tendrá un lienzo táctil donde se pueda:

- Añadir mesas.
- Seleccionar mesas.
- Arrastrarlas con el dedo.
- Moverlas libremente.
- Redimensionarlas.
- Numerarlas.
- Cambiar su numeración.
- Duplicarlas.
- Eliminarlas.
- Activarlas/desactivarlas.
- Ocultarlas/mostrarlas.
- Editar capacidad.
- Configurar si son unibles.
- Configurar grupo de unión.
- Editar otras propiedades necesarias para la operativa.

Debe estar pensado para móvil/TPV y ser rápido de usar.

## Estados

Separar configuración de estado operativo.

Configuración:
- ACTIVA
- DESACTIVADA
- OCULTA

Estado operativo:
- LIBRE
- RESERVADA
- OCUPADA

Una mesa desactivada no debe utilizarse para reservas normales. Una mesa oculta puede existir sin mostrarse en el plano operativo.

## Numeración

La numeración debe ser editable y no debe romper referencias históricas.

Ejemplo:
- Mesa 1 → 25
- Mesa 25 → 26

Debe evitarse que dos mesas activas del mismo plano tengan accidentalmente el mismo número.

Las reservas deben utilizar identificadores estables siempre que sea posible, no depender únicamente del texto de la numeración.

## Posición y tamaño

**No guardar posiciones únicamente en píxeles.**

Usar coordenadas relativas/normalizadas:

- X = porcentaje
- Y = porcentaje
- ancho = porcentaje
- alto = porcentaje

Ejemplo:

`Mesa 15: X=20%, Y=24%, ancho=8%, alto=8%`

Así el plano se adapta a móviles, resoluciones y tamaños de pantalla diferentes.

El diseñador debe permitir:
- Ajustar el plano a la pantalla.
- Previsualizar.
- Redimensionar el lienzo.
- Mantener las mesas dentro de los límites.
- Adaptar automáticamente la visualización a distintos dispositivos.

## Elementos visuales

Inicialmente mantener el estilo de Camborio/V2.

A futuro se pueden permitir:
- Mesa cuadrada.
- Mesa rectangular.
- Mesa redonda.
- Otros tipos/formatos.
- Texto.
- Separadores.
- Marcos.
- Zonas.

Estos elementos adicionales no son imprescindibles para la primera versión.

## Uniones

Mantener el concepto de mesas unibles.

Cada mesa podrá tener:
- Se puede unir: sí/no.
- Grupo de unión.
- Relaciones necesarias para representar mesas adicionales/uniones.

El diseñador debe permitir preparar estas relaciones sin tocar código.

## Configuración del establecimiento

Separar:

### Motor común
- Reservas.
- Clientes.
- Calendario.
- Estados.
- Mesas.
- Planos.
- Confirmaciones.
- Historial.
- Configuración.

### Configuración del establecimiento
- Nombre.
- Logotipo.
- Colores.
- Teléfono de reservas.
- Teléfono principal.
- Correo.
- Horarios.
- Turnos.
- Planos.
- Mesas.
- Capacidades.
- Uniones.
- Otros parámetros propios.

## Objetivo multiestablecimiento

Ejemplo conceptual:

**BAR A**
- Logo A
- Colores A
- Correo A
- Terraza A
- 18 mesas

**BAR B**
- Logo B
- Colores B
- Correo B
- Interior B
- Terraza B
- 35 mesas

El núcleo no debería necesitar cambios de código para adaptar la distribución de mesas.

## Modelo de datos futuro

No fijar todavía el esquema definitivo, pero debe contemplar entidades equivalentes a:

### Establecimiento
- id
- nombre
- logo
- colores
- teléfonos
- correo
- configuración general

### Plano
- id
- establecimiento_id
- nombre
- orden
- activo
- visible
- ancho lógico
- alto lógico
- configuración visual

### Mesa
- id
- plano_id
- número
- nombre opcional
- x
- y
- ancho
- alto
- capacidad
- activa
- visible
- unible
- grupo_union
- tipo/forma
- orden

Las reservas deben referenciar mesas mediante identificadores estables siempre que sea posible.

## Compatibilidad con Camborio

El diseñador debe poder reproducir el plano actual de Camborio:

- TERRAZA con su distribución actual.
- SALÓN con su distribución actual.
- CHILL OUT con su distribución actual.
- Numeración actual.
- Posiciones actuales.
- Estados.
- Uniones.

La migración no debe alterar las reservas históricas.

## Orden de implementación

No comenzar hasta que:

1. Planos de Mesas V4 esté funcionando.
2. Se prueben mesas libres.
3. Se prueben mesas reservadas.
4. Se prueben mesas ocupadas.
5. Se prueben mesas desactivadas.
6. Se prueben COMIDA/CENA.
7. Se prueben mesas adicionales.
8. Se prueben uniones.
9. Se prueben acciones sobre reservas desde el plano.
10. Configuración esté estabilizada.

Después:

1. Diseñar modelo de datos.
2. Crear el diseñador.
3. Migrar el plano fijo actual de Camborio al nuevo modelo.
4. Comprobar que visualmente sigue siendo igual.
5. Probar mover mesas.
6. Probar crear/eliminar/renumerar.
7. Probar redimensionado y adaptación a diferentes pantallas.
8. Probar estados.
9. Probar uniones.
10. Integrarlo definitivamente con Planos de Mesas.

## Principio fundamental

**El Diseñador de Planos debe ser una herramienta de configuración, no otra pantalla programada específicamente para Camborio.**

La aplicación debe leer el plano desde la configuración y dibujarlo.

Así, en el futuro, cambiar el plano de un restaurante será una operación de configuración y no una modificación del código fuente.
