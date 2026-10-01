ALTER TABLE public."Reservas" ADD COLUMN IF NOT EXISTS "FechaConfirmacion" timestamptz;

CREATE OR REPLACE FUNCTION public.cr_marcar_fecha_confirmacion()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."Estado" = 'CONFIRMADA' AND COALESCE(OLD."Estado",'') IS DISTINCT FROM 'CONFIRMADA' THEN
    NEW."FechaConfirmacion" := COALESCE(NEW."FechaEstado", now());
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_reservas_fecha_confirmacion ON public."Reservas";
CREATE TRIGGER trg_reservas_fecha_confirmacion
BEFORE UPDATE OF "Estado" ON public."Reservas"
FOR EACH ROW EXECUTE FUNCTION public.cr_marcar_fecha_confirmacion();
