import { supabase } from '../lib/supabase';

type ReservationEmailData = {
  ReservaID?: string | null;
  CodigoReserva?: string | null;
  Telefono?: string | null;
  Email?: string | null;
  Estado?: string | null;
};

export async function enviarEmailReservaConfirmada(reserva: ReservationEmailData) {
  const email = String(reserva.Email || '').trim();
  const telefono = String(reserva.Telefono || '').trim();
  const codigo = String(reserva.CodigoReserva || '').trim();

  if (!email || !telefono || !codigo) return;

  const { error } = await supabase.functions.invoke('send-camborio-email', {
    body: {
      telefono,
      codigo,
      email,
    },
  });

  if (error) {
    console.warn('No se pudo enviar el email de reserva confirmada', error);
  }
}
