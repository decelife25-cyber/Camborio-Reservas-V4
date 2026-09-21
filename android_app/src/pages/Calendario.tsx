import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
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
  Turno: string | null;
  Observaciones: string | null;
};

const CANCELADAS = new Set(['CANCELADA_CLIENTE', 'CANCELADA_LOCAL']);

function pad(value: number) {
  return String(value).padStart(2, '0');
}

function dateKey(year: number, month: number, day: number) {
  return year + '-' + pad(month + 1) + '-' + pad(day);
}

function todayKey() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function formatDateParts(value: string) {
  const date = new Date(value + 'T12:00:00');
  return {
    day: date.toLocaleDateString('es-ES', { weekday: 'long' }).toUpperCase(),
    date: date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }),
  };
}

export default function Calendario() {
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [reservasMes, setReservasMes] = useState<Reserva[]>([]);
  const [loading, setLoading] = useState(true);

  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  useEffect(() => {
    async function fetchMonth() {
      setLoading(true);
      const start = dateKey(year, month, 1);
      const end = dateKey(year, month, daysInMonth);

      const { data, error } = await supabase
        .from('Reservas')
        .select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Turno,Observaciones')
        .gte('FechaReserva', start)
        .lte('FechaReserva', end)
        .order('FechaReserva', { ascending: true })
        .order('HoraReserva', { ascending: true });

      if (error) {
        console.error('Error cargando calendario', error);
        setReservasMes([]);
      } else {
        setReservasMes(((data || []) as Reserva[]).filter(r => !CANCELADAS.has(r.Estado)));
      }
      setLoading(false);
    }

    fetchMonth();
  }, [year, month, daysInMonth]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const reserva of reservasMes) {
      map[reserva.FechaReserva] = (map[reserva.FechaReserva] || 0) + 1;
    }
    return map;
  }, [reservasMes]);

  const reservasSeleccionadas = useMemo(
    () => reservasMes.filter(r => r.FechaReserva === selectedDate),
    [reservasMes, selectedDate]
  );

  const selectedParts = formatDateParts(selectedDate);

  function changeMonth(delta: number) {
    const next = new Date(year, month + delta, 1);
    setMonthDate(next);
    const candidateDay = Math.min(
      Number(selectedDate.slice(8, 10)),
      new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()
    );
    setSelectedDate(dateKey(next.getFullYear(), next.getMonth(), candidateDay));
  }

  return (
    <section className="calendar-screen" aria-label="Calendario de reservas">
      <header className="date-turn-header">
        <div className="today-title">
          <span className="today-calendar" aria-hidden="true">📅</span>
          <span className="today-day">{selectedParts.day}</span>
          <span className="today-date">{selectedParts.date}</span>
        </div>
        <div className="turn-actions">
          <button className="turn-button selected" type="button">☀ Comida ({reservasSeleccionadas.filter(r => r.Turno === 'COMIDA').length})</button>
          <button className="turn-button selected" type="button">🌙 Cena ({reservasSeleccionadas.filter(r => r.Turno === 'CENA').length})</button>
          <button className="filter-button" type="button" aria-label="Filtrar reservas">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v5l-4 2v-7L3 5z" /></svg>
          </button>
        </div>
      </header>

      <div className="calendar-scroll">
        <div className="calendar-month-header">
          <button type="button" onClick={() => changeMonth(-1)} aria-label="Mes anterior"><ChevronLeft size={24} /></button>
          <strong>{monthDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</strong>
          <button type="button" onClick={() => changeMonth(1)} aria-label="Mes siguiente"><ChevronRight size={24} /></button>
        </div>

        <div className="calendar-weekdays">
          {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map(day => <span key={day}>{day}</span>)}
        </div>

        <div className="calendar-grid">
          {Array.from({ length: firstWeekday }).map((_, index) => <span className="calendar-empty" key={'e' + index} />)}
          {Array.from({ length: daysInMonth }, (_, index) => {
            const day = index + 1;
            const key = dateKey(year, month, day);
            const isPast = key < todayKey();
            const isToday = key === todayKey();
            const isSelected = key === selectedDate;
            const count = counts[key] || 0;

            return (
              <button
                key={key}
                type="button"
                disabled={isPast}
                className={'calendar-day' +
                  (isPast ? ' past' : '') +
                  (isToday ? ' today' : '') +
                  (isSelected ? ' selected' : '')}
                onClick={() => setSelectedDate(key)}
              >
                <strong>{day}</strong>
                {count > 0 && !isPast && <span className="calendar-reservation-mark">R</span>}
              </button>
            );
          })}
        </div>

        <div className="calendar-reservations">
          {loading ? (
            <div className="calendar-empty-message">Cargando reservas...</div>
          ) : reservasSeleccionadas.length === 0 ? (
            <div className="calendar-empty-message">No hay reservas para esta fecha.</div>
          ) : (
            reservasSeleccionadas.map(reserva => (
              <ReservationCard key={reserva.ReservaID} reserva={reserva} />
            ))
          )}
        </div>
      </div>
    </section>
  );
}
