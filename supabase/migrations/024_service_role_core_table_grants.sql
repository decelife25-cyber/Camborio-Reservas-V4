-- Camborio Reservas V4
-- Port de seguridad operativa de V2: el backend server-side usa service_role
-- para acceder a las tablas core. anon/authenticated no reciben acceso.

GRANT USAGE ON SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public."Clientes",
  public."Clientes_Bloqueados",
  public."Configuracion",
  public."Horarios",
  public."Log",
  public."Mesas",
  public."Notificaciones",
  public."Personal",
  public."Reservas",
  public."Zonas"
TO service_role;
