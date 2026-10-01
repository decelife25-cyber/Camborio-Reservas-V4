import { mostrarTelefono } from '../utils/phone';
import { useEffect, useState } from 'react';
import { Check, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendAuthorizedConfirmationEmail } from '../services/reservationEmail';

type Reserva = {
  ReservaID: string;
  CodigoReserva: string | null;
  FechaReserva: string;
  HoraReserva: string;
  Nombre: string | null;
  Telefono: string | null;
  Personas: number | null;
  Estado: string;
  Mesa: string | null;
  Email?: string | null;
  EmailReservaAutorizado?: boolean | null;
};

function formatDate(value: string) {
  return new Date(value + 'T12:00:00').toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatWeekday(value: string) {
  return new Date(value + 'T12:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
  }).toUpperCase();
}

function formatTime(value: string) {
  return String(value || '').slice(0, 5);
}

export default function Confirmar() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [error, setError] = useState('');

  async function fetchPendientes() {
    setLoading(true);
    setError('');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

    for (let intento = 0; intento < 3; intento += 1) {
      if (intento > 0) {
        await new Promise(resolve => setTimeout(resolve, 300 * intento));
        await supabase.auth.getSession();
      }

      const { data, error: queryError } = await supabase
        .from('Reservas')
        .select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Email,EmailReservaAutorizado')
        .eq('Estado', 'PENDIENTE')
        .gte('FechaReserva', today)
        .order('FechaReserva', { ascending: true })
        .order('HoraReserva', { ascending: true });

      if (!queryError) {
        setReservas((data || []) as Reserva[]);
        setLoading(false);
        return;
      }

      console.error('Error cargando reservas por confirmar (intento ' + (intento + 1) + '/3)', queryError);
    }

    setError('No se pudieron cargar las reservas.');
    setReservas([]);
    setLoading(false);
  }

  useEffect(() => {
    fetchPendientes();
  }, []);

  async function confirmarReserva(reserva: Reserva) {
    setConfirming(reserva.ReservaID);
    const { error: updateError } = await supabase
      .from('Reservas')
      .update({ Estado: 'CONFIRMADA' })
      .eq('ReservaID', reserva.ReservaID);

    if (updateError) {
      console.error('Error confirmando reserva', updateError);
      setError('No se pudo confirmar la reserva.');
      setConfirming(null);
      return;
    }

    if(reserva.EmailReservaAutorizado===true){
      try{
        await sendAuthorizedConfirmationEmail(reserva.ReservaID);
      }catch(emailError){
        console.warn('Reserva confirmada, pero no se pudo enviar el email de confirmación',emailError);
        setError('Reserva confirmada, pero no se pudo enviar el email de confirmación.');
      }
    }

    setReservas(current => current.filter(item => item.ReservaID !== reserva.ReservaID));
    window.dispatchEvent(new Event('camborio-pending-count-change'));
    setConfirming(null);
  }

  return (
    <section className="confirm-screen" aria-label="Reservas por confirmar">
      <header className="subscreen-header">
        <h1>RESERVAS POR CONFIRMAR ({reservas.length})</h1>
        <button className="subscreen-back" type="button" onClick={() => window.history.back()} aria-label="Volver">
          <ArrowLeft size={22} />
        </button>
      </header>

      {loading ? (
        <div className="confirm-empty">Cargando reservas...</div>
      ) : error ? (
        <div className="confirm-empty confirm-error">{error}</div>
      ) : reservas.length === 0 ? (
        <div className="confirm-empty">NO HAY RESERVAS PENDIENTES.</div>
      ) : (
        <div className="confirm-list">
          {reservas.map(reserva => (
            <article className="confirm-card" key={reserva.ReservaID}>
              <div className="confirm-date">
                <strong>{formatDate(reserva.FechaReserva).slice(0, 5)}</strong>
                <span>{formatDate(reserva.FechaReserva).slice(6)}</span>
              </div>
              <div className="confirm-day">
                <span>{formatWeekday(reserva.FechaReserva)}</span>
                <strong>{formatTime(reserva.HoraReserva)}</strong>
              </div>
              <div className="confirm-pax">{reserva.Personas || 0} PAX</div>
              <div className="confirm-client">
                <strong>👤 {reserva.Nombre || 'SIN NOMBRE'}</strong>
                <span>☎ {mostrarTelefono(reserva.Telefono)} · {reserva.CodigoReserva ? (
                  <button
                    type="button"
                    className="confirm-code-button"
                    onClick={() => navigate('/buscar?codigo=' + encodeURIComponent(reserva.CodigoReserva!))}
                    aria-label={'Abrir reserva ' + reserva.CodigoReserva}
                  >
                    <b>{reserva.CodigoReserva}</b>
                  </button>
                ) : <b>—</b>}</span>
              </div>
              <button
                className="confirm-check"
                type="button"
                onClick={() => confirmarReserva(reserva)}
                disabled={confirming === reserva.ReservaID}
                aria-label={'Confirmar reserva ' + (reserva.CodigoReserva || '')}
              >
                {confirming === reserva.ReservaID ? '…' : <Check size={32} strokeWidth={3} />}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
