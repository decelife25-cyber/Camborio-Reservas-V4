import { useEffect, useMemo, useState } from 'react';
import { Filter, Users, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
};

const CANCELADAS = new Set(['CANCELADA_CLIENTE', 'CANCELADA_LOCAL']);

function formatTime(value: string) {
  return String(value || '').slice(0, 5);
}

function formatDate(value: Date) {
  return value.toLocaleDateString('es-ES', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/Madrid',
  }).toUpperCase();
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
  const [turno, setTurno] = useState<'COMIDA' | 'CENA'>('CENA');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function fetchReservas() {
    setLoading(true);
    setError('');
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
    const { data, error: queryError } = await supabase
      .from('Reservas')
      .select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Turno')
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
  const visibles = turno === 'COMIDA' ? comida : cena;

  useEffect(() => {
    if (cena.length === 0 && comida.length > 0) setTurno('COMIDA');
    else if (cena.length > 0) setTurno('CENA');
  }, [comida.length, cena.length]);

  const today = new Date();

  return (
    <section className="today-screen" aria-label="Reservas de hoy">
      <div className="date-turn-header">
        <div className="today-title"><span>📅</span> {formatDate(today)}</div>
        <div className="turn-actions">
          <button className={'turn-button ' + (turno === 'COMIDA' ? 'selected' : '')} onClick={() => setTurno('COMIDA')}>
            ☀ COMIDA ({comida.length})
          </button>
          <button className={'turn-button ' + (turno === 'CENA' ? 'selected' : '')} onClick={() => setTurno('CENA')}>
            🌙 CENA ({cena.length})
          </button>
          <button className="filter-button" aria-label="Filtros" title="Filtros"><Filter size={22} /></button>
        </div>
      </div>

      <div className="reservation-scroll">
        {loading ? (
          <div className="empty-message">Cargando reservas...</div>
        ) : error ? (
          <div className="empty-message error-message">{error}</div>
        ) : visibles.length === 0 ? (
          <div className="empty-message">No hay reservas para esta fecha.</div>
        ) : (
          visibles.map(reserva => (
            <article className="reservation-card" key={reserva.ReservaID}>
              <div className="reservation-time">
                <span className={'status-pill status-' + reserva.Estado.toLowerCase().replaceAll('_', '-')}>
                  {statusLabel(reserva.Estado)}
                </span>
                <strong>{formatTime(reserva.HoraReserva)}</strong>
              </div>
              <div className="reservation-main">
                <div className="customer-name"><span>👤</span>{reserva.Nombre || 'SIN NOMBRE'}</div>
                <div className="customer-meta">
                  <Phone size={18} />
                  <span>{reserva.Telefono || '—'}</span>
                  <span>•</span>
                  <span className="reservation-code">{reserva.CodigoReserva || '—'}</span>
                </div>
              </div>
              <div className="reservation-party">
                <div className="pax"><Users size={22} /> {reserva.Personas || 0} PAX</div>
                <button className="table-button">
                  {reserva.Mesa ? 'MESA ' + reserva.Mesa : 'SIN ASIGNAR'}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
