import { supabase } from '../lib/supabase';

export async function sendAuthorizedConfirmationEmail(reservaId: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) return { sent: false, skipped: true, reason: 'SIN_SESION' };
  const { data, error } = await supabase.functions.invoke('public-reservas', {
    body: {
      action: 'confirmation-email',
      reservaId,
      _authorization: 'Bearer ' + accessToken,
    },
  });
  if (error) throw error;
  return data;
}
