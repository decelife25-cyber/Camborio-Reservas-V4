# AUDITORÍA V4: Camborio Reservas

## QUÉ SE HA AUDITADO
Se ha realizado una auditoría exhaustiva del código fuente del repositorio `Camborio-Reservas-V2` para comprender el estado final del sistema de reservas y facilitar su evolución a la versión **V4**. Se ha revisado la capa de acceso a datos (Supabase), las lógicas de negocio principales (Reservas, Clientes, Horarios, Mesas) y la diferencia arquitectónica entre la zona privada y pública.

## VERSIÓN CONSIDERADA VÁLIDA
La versión de referencia utilizada para proyectar la V4 es el estado posterior a la finalización de las migraciones de base de datos a Supabase (`CR_DATOS_BACKEND = 'SUPABASE'`), donde Google Sheets quedó obsoleto como fuente de verdad. El contrato SQL validado mediante el archivo `00_auditoria_catalogo_actual.sql` es la base técnica oficial.

## QUÉ SE DESCARTA
Para la nueva versión (V4) se descarta por completo:
- La implementación y el uso de **Google Sheets** como base de datos o almacenamiento secundario.
- La infraestructura de UI renderizada en servidor mediante **Google Apps Script** (`HtmlService`, archivos `.html`).
- Archivos de sincronización y validación bidireccional entre Sheets y Supabase.

## DOCUMENTOS DE LA AUDITORÍA
La investigación se detalla en los siguientes archivos adjuntos:
- `01_RESUMEN_EJECUTIVO.md`: Resumen general de la situación.
- `02_ESTADO_FINAL_SUPABASE.md`: Análisis de la consolidación de PostgreSQL.
- `03_LOGICA_NEGOCIO.md`: Extracción de reglas de Reservas, Clientes, Mesas, Horarios.
- `04_CONTRATO_BASE_DATOS.md`: Esquemas finales y tablas activas.
- `05_RPC_FUNCIONES_TRIGGERS.md`: Scripts y procedimientos almacenados en uso.
- `06_PUBLICO_VS_PRIVADO.md`: Delimitación funcional para las futuras PWA y APK.
- `07_GOOGLE_SHEETS_LEGACY.md`: Resumen de las herramientas a eliminar.
- `08_CODIGO_REUTILIZABLE.md`: Guía de funciones a portar intactas a V4.
- `09_ARQUITECTURA_V4.md`: Propuesta de despliegue para el nuevo sistema.
- `10_PLAN_CONSTRUCCION_V4.md`: Pasos propuestos para desarrollar V4.
- `11_PLAN_PRUEBAS_V4.md`: Guía de casos de uso para evitar regresiones.
- `12_DISCREPANCIAS_Y_RIESGOS.md`: Notas sobre concurrencia, timezone y acoplamientos.
- `13_REVISION_FINAL_AUDITORIA.md`: Revisión crítica final con dependencias exactas comprobadas y correcciones.

## CONCLUSIONES
El paso a V4 no consiste en migrar código antiguo, sino en reimplementar limpiamente el backend y el frontend (PWA para clientes y APK para el restaurante) manteniendo **intacto** el modelo de datos robusto de Supabase y sus reglas de negocio estandarizadas.

## SIGUIENTE PASO RECOMENDADO
Proceder con la **Fase 1 y Fase 2** del Plan de Construcción: crear el proyecto limpio de Supabase utilizando el esquema base y desarrollar la lógica core abstraída en TypeScript/JavaScript antes de diseñar interfaces.
