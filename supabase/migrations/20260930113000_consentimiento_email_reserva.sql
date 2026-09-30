-- Consentimiento expreso para recibir comunicaciones relacionadas con la reserva.
ALTER TABLE public."Reservas"
  ADD COLUMN IF NOT EXISTS "EmailReservaAutorizado" boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "FechaAutorizacionEmail" timestamptz,
  ADD COLUMN IF NOT EXISTS "EmailReservaUltimoEnvioVersion" timestamptz,
  ADD COLUMN IF NOT EXISTS "EmailReservaEnvioEnCurso" boolean NOT NULL DEFAULT false;
