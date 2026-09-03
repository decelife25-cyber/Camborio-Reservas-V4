# 02. ESTADO FINAL SUPABASE

## 1. COMMIT DE REFERENCIA
El estado final de la base de datos y la implementación oficial de backend recaen sobre Supabase.
- **Commit:** `444d282 supabase: añadir auditoria de catalogo para clon exacto`
- **Ramas/Referencias Relevantes:** El estado final se determina por la declaración de `CR_DATOS_BACKEND = 'SUPABASE'` en `02_Datos.gs` y por el documento `docs/CAMBORIO_RESERVAS_V3_SUPABASE_ESTABLE.md`, que marca el primer punto estable sobre Supabase donde Sheets deja de participar en el funcionamiento normal.

## 2. EVOLUCIÓN (MIGRACIONES)
En el directorio `supabase/migrations/` se documenta la historia completa de la estructura final. El proyecto evolucionó desde compatibilidad híbrida hasta llegar a escrituras y lecturas 100% sobre PostgreSQL:
1. `001_esquema_inicial.sql`
2. `008_generadores_identificadores_autoritativos.sql`
3. `009_creacion_transaccional_reservas.sql`
4. `011_gestion_autoritativa_clientes.sql`
5. Migraciones `018...` y `023_corregir_esquema_generador_codigo_reserva.sql` corrigen y ajustan el esquema final para producción.

## 3. AUDITORÍA DEL CATÁLOGO ACTUAL
El archivo `supabase/00_auditoria_catalogo_actual.sql` sirve como diagnóstico absoluto de todo el esquema de producción. Incluye scripts para extraer:
- Tablas y Columnas (esquema `public`).
- Claves primarias (PK), foráneas (FK), `UNIQUE` y restricciones (`CHECK`).
- Funciones RPC (ej. `cr_generar_codigo_reserva`, `cr_actualizar_updated_at`).
- Triggers (ej. `cr_normalizar_telefono_fila`).
- RLS Policies.

Este catálogo es la fuente de la verdad para construir el esquema idéntico en V4, sin arrastrar los problemas estructurales iniciales.

## 4. CONCLUSIÓN DE ESTADO
El proyecto en su versión 2.0.0 (según `00_Config.gs`) o V3 (según los nombres de las ramas de transición) se encuentra en un estado donde **Supabase es 100% autoritativo** para Reservas, Mesas y Clientes. Google Sheets sigue en el código únicamente por "herencia y código legacy". Las operaciones de negocio confían estrictamente en la integridad referencial y restricciones que ofrece PostgreSQL.
