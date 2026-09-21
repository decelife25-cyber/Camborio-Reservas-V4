import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import ReservationCard from '../components/ReservationCard';

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
  Turno: 'COMIDA' | 'CENA' | string | null;
  Observaciones: string | null;
};

const CANCELADAS = new Set(['CANCELADA_CLIENTE', 'CANCELADA_LOCAL']);

function formatDateParts(value: Date) {
  const day = value.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' });
  const dayNumber = value.toLocaleDateString('es-ES', { day: 'numeric', timeZone: 'Europe/Madrid' });
  const month = value.toLocaleDateString('es-ES', { month: 'long', timeZone: 'Europe/Madrid' });
  const year = value.toLocaleDateString('es-ES', { year: 'numeric', timeZone: 'Europe/Madrid' });
  return { day: day.toUpperCase(), date: dayNumber + ' ' + month.toUpperCase() + ' ' + year };
}

function formatTime(value: string) {
  return String(value || '').slice(0, 5);
}

function statusLabel(status: string) {
  if (status === 'CONFIRMADA') return 'CONFIRMADA';
  if (status === 'PENDIENTE') return 'PENDIENTE';
  if (status === 'SENTADA') return 'SENTADA';
  if (status === 'FINALIZADA') return 'FINALIZADA';
  if (status === 'NO_PRESENTADO') return 'NO PRESENTADO';
  return status;
}

export default function Inicio() {
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [turnos, setTurnos] = useState({ COMIDA: true, CENA: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchReservas() {
    setLoading(true);
    setError('');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

    const { data, error: queryError } = await supabase
      .from('Reservas')
      .select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Turno,Observaciones')
      .eq('FechaReserva', today)
      .order('HoraReserva', { ascending: true });

    if (queryError) {
      console.error('Error cargando reservas de hoy', queryError);
      setError('No se pudieron cargar las reservas.');
      setReservas([]);
    } else {
      setReservas((data || []).filter((r: Reserva) => !CANCELADAS.has(r.Estado)));
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchReservas();
  }, []);

  const comida = useMemo(() => reservas.filter(r => r.Turno === 'COMIDA'), [reservas]);
  const cena = useMemo(() => reservas.filter(r => r.Turno === 'CENA'), [reservas]);

  const visibles = useMemo(
    () => reservas.filter(r => {
      const turno = r.Turno === 'COMIDA' || r.Turno === 'CENA' ? r.Turno : null;
      return !turno || turnos[turno];
    }),
    [reservas, turnos]
  );

  const toggleTurno = (turno: 'COMIDA' | 'CENA') => {
    setTurnos(current => ({ ...current, [turno]: !current[turno] }));
  };

  return (
    <section className="today-screen" aria-label="Reservas de hoy">
      <header className="date-turn-header">
        <div className="today-title">
          <span className="today-calendar" aria-hidden="true">📅</span>
          <span className="today-day">{formatDateParts(new Date()).day}</span>
          <span className="today-date">{formatDateParts(new Date()).date}</span>
        </div>

        <div className="turn-actions">
          <button
            className={'turn-button ' + (turnos.COMIDA ? 'selected' : '')}
            onClick={() => toggleTurno('COMIDA')}
            type="button"
          >
            ☀ Comida ({comida.length})
          </button>
          <button
            className={'turn-button ' + (turnos.CENA ? 'selected' : '')}
            onClick={() => toggleTurno('CENA')}
            type="button"
          >
            🌙 Cena ({cena.length})
          </button>
          <button className="filter-button" type="button" aria-label="Filtrar reservas" title="Filtrar reservas">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" />
            </svg>
          </button>
        </div>
      </header>

      <div className="reservation-scroll">
        {loading ? (
          <div className="empty-message">Cargando reservas...</div>
        ) : error ? (
          <div className="empty-message error-message">{error}</div>
        ) : visibles.length === 0 ? (
          <div className="empty-message">No hay reservas para esta fecha.</div>
        ) : (
          visibles.map(reserva => (
            <ReservationCard key={reserva.ReservaID} reserva={reserva} />
          ))
        )}
      </div>
    </section>
  );
}
