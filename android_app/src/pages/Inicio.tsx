import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import ReservationCard from '../components/ReservationCard';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

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

const FILTRO_STORAGE_KEY = 'camborio_reservas_filtro_estados_v1';
const ESTADOS_FILTRO = ['PENDIENTE', 'CONFIRMADA', 'SENTADA', 'FINALIZADA', 'CANCELADA', 'NO_ASISTIO'] as const;
type EstadoFiltro = typeof ESTADOS_FILTRO[number];

function normalizarEstadoFiltro(value: string | null): EstadoFiltro | null {
  if (!value) return null;
  if (value === 'PENDIENTE' || value === 'PENDIENTE_CONFIRMACION') return 'PENDIENTE';
  if (value === 'CONFIRMADA') return 'CONFIRMADA';
  if (value === 'SENTADA') return 'SENTADA';
  if (value === 'FINALIZADA') return 'FINALIZADA';
  if (value === 'CANCELADA' || value === 'CANCELADA_CLIENTE' || value === 'CANCELADA_LOCAL') return 'CANCELADA';
  if (value === 'NO_ASISTIO' || value === 'NO ASISTIÓ') return 'NO_ASISTIO';
  return null;
}

const FILTRO_DEFAULT: Record<EstadoFiltro, boolean> = {
  PENDIENTE: true,
  CONFIRMADA: true,
  SENTADA: true,
  FINALIZADA: false,
  CANCELADA: false,
  NO_ASISTIO: false,
};

function cargarFiltroGuardado(): Record<EstadoFiltro, boolean> {
  try {
    const raw = localStorage.getItem(FILTRO_STORAGE_KEY);
    if (!raw) return FILTRO_DEFAULT;
    const parsed = JSON.parse(raw) as Partial<Record<EstadoFiltro, boolean>>;
    return ESTADOS_FILTRO.reduce((acc, estado) => {
      acc[estado] = parsed[estado] === true;
      return acc;
    }, {} as Record<EstadoFiltro, boolean>);
  } catch {
    return FILTRO_DEFAULT;
  }
}

function formatDateParts(value: Date) {
  const day = value.toLocaleDateString('es-ES', { weekday: 'long', timeZone: 'Europe/Madrid' });
  const dayNumber = value.toLocaleDateString('es-ES', { day: 'numeric', timeZone: 'Europe/Madrid' });
  const month = value.toLocaleDateString('es-ES', { month: 'long', timeZone: 'Europe/Madrid' });
  const year = value.toLocaleDateString('es-ES', { year: 'numeric', timeZone: 'Europe/Madrid' });
  return { day: day.toUpperCase(), date: dayNumber + ' ' + month.toUpperCase() + ' ' + year };
}

export default function Inicio() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [turnos, setTurnos] = useState({ COMIDA: true, CENA: true });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtroEstados, setFiltroEstados] = useState<Record<EstadoFiltro, boolean>>(cargarFiltroGuardado);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroEdicion, setFiltroEdicion] = useState<Record<EstadoFiltro, boolean>>(filtroEstados);

  async function fetchReservas() {
    if (!session?.access_token) return;
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
      setReservas((data || []) as Reserva[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (session?.access_token) {
      fetchReservas();
    }
    const handleReservationChange = () => {
      if (session?.access_token) fetchReservas();
    };
    window.addEventListener('camborio-reservation-changed', handleReservationChange);
    return () => window.removeEventListener('camborio-reservation-changed', handleReservationChange);
  }, [session?.access_token]);

  const handleUpdate = (updatedReserva: any) => {
    setReservas(prev => prev.map(r => r.ReservaID === updatedReserva.ReservaID ? { ...r, ...updatedReserva } as Reserva : r));
  };

  const comida = useMemo(() => reservas.filter(r => r.Turno === 'COMIDA'), [reservas]);
  const cena = useMemo(() => reservas.filter(r => r.Turno === 'CENA'), [reservas]);

  const visibles = useMemo(
    () => reservas.filter(r => {
      const turno = r.Turno === 'COMIDA' || r.Turno === 'CENA' ? r.Turno : null;
      if (turno && !turnos[turno]) return false;
      const estado = normalizarEstadoFiltro(r.Estado);
      return estado === null || filtroEstados[estado];
    }),
    [reservas, turnos, filtroEstados]
  );

  useEffect(() => {
    localStorage.setItem(FILTRO_STORAGE_KEY, JSON.stringify(filtroEstados));
  }, [filtroEstados]);

  const abrirFiltro = () => {
    setFiltroEdicion(filtroEstados);
    setFiltroAbierto(true);
  };

  const toggleFiltroEstado = (estado: EstadoFiltro) => {
    setFiltroEdicion(current => ({ ...current, [estado]: !current[estado] }));
  };

  const aplicarFiltro = () => {
    const algunoActivo = ESTADOS_FILTRO.some(estado => filtroEdicion[estado]);
    if (!algunoActivo) return;
    setFiltroEstados(filtroEdicion);
    setFiltroAbierto(false);
  };

  const cerrarFiltroSinCambios = () => {
    setFiltroEdicion(filtroEstados);
    setFiltroAbierto(false);
  };

  const etiquetasFiltro: Record<EstadoFiltro, string> = {
    PENDIENTE: 'PENDIENTES',
    CONFIRMADA: 'CONFIRMADAS',
    SENTADA: 'SENTADAS',
    FINALIZADA: 'FINALIZADAS',
    CANCELADA: 'CANCELADAS',
    NO_ASISTIO: 'NO ASISTIÓ',
  };

  const toggleTurno = (turno: 'COMIDA' | 'CENA') => {
    setTurnos(current => {
      if (current[turno] && !current[turno === 'COMIDA' ? 'CENA' : 'COMIDA']) return current;
      return { ...current, [turno]: !current[turno] };
    });
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
          <button className={'filter-button ' + (Object.values(filtroEstados).some(Boolean) ? 'has-filter' : '')} type="button" aria-label="Filtrar reservas" title="Filtrar reservas" onClick={abrirFiltro}>
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
          <div className="calendar-reservations">
            {visibles.map(reserva => (
              <ReservationCard key={reserva.ReservaID} reserva={reserva} onAssignTable={r => navigate('/mesas?asignar=' + encodeURIComponent(r.ReservaID))} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>
      {filtroAbierto && (
        <div className="filter-overlay" role="dialog" aria-modal="true" aria-labelledby="filtroReservasHoyTitulo">
          <div className="filter-modal">
            <div className="filter-modal__header">
              <h2 id="filtroReservasHoyTitulo">FILTRO RESERVAS</h2>
              <button type="button" className="filter-modal__close" onClick={cerrarFiltroSinCambios} aria-label="Cerrar">×</button>
            </div>
            <div className="filter-modal__options">
              {ESTADOS_FILTRO.map(estado => (
                <label key={estado} className={'filter-option filter-option--' + estado.toLowerCase()}>
                  <input
                    type="checkbox"
                    checked={filtroEdicion[estado]}
                    onChange={() => toggleFiltroEstado(estado)}
                  />
                  <span className="filter-option__box" aria-hidden="true">✓</span>
                  <span>{etiquetasFiltro[estado]}</span>
                </label>
              ))}
            </div>
            <div className="filter-modal__actions">
              <button type="button" className="filter-modal__apply" onClick={aplicarFiltro}>APLICAR FILTRO</button>
              <button type="button" className="filter-modal__cancel" onClick={cerrarFiltroSinCambios}>CERRAR SIN CAMBIOS</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
