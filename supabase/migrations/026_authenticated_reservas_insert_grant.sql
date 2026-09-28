-- Allow the authenticated private panel to create reservations.
GRANT INSERT ON TABLE public."Reservas" TO authenticated;
