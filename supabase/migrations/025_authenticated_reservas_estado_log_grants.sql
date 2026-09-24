-- Allow the authenticated private panel to persist reservation status changes
-- and their audit log entries.
GRANT UPDATE ON TABLE public."Reservas" TO authenticated;
GRANT INSERT ON TABLE public."Log" TO authenticated;
