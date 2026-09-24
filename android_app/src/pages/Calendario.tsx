import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ReservationCard from '../components/ReservationCard';
import { useNavigate } from 'react-router-dom';

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
  PENDIENTE:true, CONFIRMADA:true, SENTADA:true, FINALIZADA:false, CANCELADA:false, NO_ASISTIO:false
};
function cargarFiltroGuardado(): Record<EstadoFiltro, boolean> {
  try {
    const raw=localStorage.getItem(FILTRO_STORAGE_KEY);
    if(!raw) return FILTRO_DEFAULT;
    const parsed=JSON.parse(raw) as Partial<Record<EstadoFiltro,boolean>>;
    return ESTADOS_FILTRO.reduce((acc,estado)=>{ acc[estado]=parsed[estado]===true; return acc; },{} as Record<EstadoFiltro,boolean>);
  } catch { return FILTRO_DEFAULT; }
}

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
  const navigate = useNavigate();
  const [monthDate, setMonthDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [reservasMes, setReservasMes] = useState<Reserva[]>([]);
  const [turnos, setTurnos] = useState({ COMIDA: true, CENA: true });
  const [loading, setLoading] = useState(true);
  const [filtroEstados, setFiltroEstados] = useState<Record<EstadoFiltro, boolean>>(cargarFiltroGuardado);
  const [filtroAbierto, setFiltroAbierto] = useState(false);
  const [filtroEdicion, setFiltroEdicion] = useState<Record<EstadoFiltro, boolean>>(filtroEstados);
  const [refreshToken, setRefreshToken] = useState(0);

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
        setReservasMes((data || []) as Reserva[]);
      }
      setLoading(false);
    }

    fetchMonth();
    const handleReservationChange = () => setRefreshToken(value => value + 1);
    window.addEventListener('camborio-reservation-changed', handleReservationChange);
    return () => window.removeEventListener('camborio-reservation-changed', handleReservationChange);
  }, [year, month, daysInMonth, refreshToken]);

  const handleUpdate = (updatedReserva: Reserva) => {
    setReservasMes(current => current.map(r => r.ReservaID === updatedReserva.ReservaID ? { ...r, ...updatedReserva } : r));
  };

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const reserva of reservasMes) {
      map[reserva.FechaReserva] = (map[reserva.FechaReserva] || 0) + 1;
    }
    return map;
  }, [reservasMes]);

  const reservasSeleccionadas = useMemo(
    () => reservasMes.filter(r => {
      if (r.FechaReserva !== selectedDate) return false;
      if (r.Turno === 'COMIDA' || r.Turno === 'CENA') { if (!turnos[r.Turno]) return false; }
      const estado=normalizarEstadoFiltro(r.Estado);
      return estado === null || filtroEstados[estado];
    }),
    [reservasMes, selectedDate, turnos, filtroEstados]
  );

  const comida = useMemo(() => reservasMes.filter(r => r.FechaReserva === selectedDate && r.Turno === 'COMIDA'), [reservasMes, selectedDate]);
  const cena = useMemo(() => reservasMes.filter(r => r.FechaReserva === selectedDate && r.Turno === 'CENA'), [reservasMes, selectedDate]);

  const toggleTurno = (turno: 'COMIDA' | 'CENA') => {
    setTurnos(current => {
      if (current[turno] && !current[turno === 'COMIDA' ? 'CENA' : 'COMIDA']) return current;
      return { ...current, [turno]: !current[turno] };
    });
  };

  useEffect(() => { localStorage.setItem(FILTRO_STORAGE_KEY, JSON.stringify(filtroEstados)); }, [filtroEstados]);
  const abrirFiltro=()=>{ setFiltroEdicion(filtroEstados); setFiltroAbierto(true); };
  const toggleFiltroEstado=(estado:EstadoFiltro)=>setFiltroEdicion(current=>({...current,[estado]:!current[estado]}));
  const aplicarFiltro=()=>{ if(!ESTADOS_FILTRO.some(estado=>filtroEdicion[estado])) return; setFiltroEstados(filtroEdicion); setFiltroAbierto(false); };
  const cerrarFiltroSinCambios=()=>{ setFiltroEdicion(filtroEstados); setFiltroAbierto(false); };
  const etiquetasFiltro:Record<EstadoFiltro,string>={PENDIENTE:'PENDIENTES',CONFIRMADA:'CONFIRMADAS',SENTADA:'SENTADAS',FINALIZADA:'FINALIZADAS',CANCELADA:'CANCELADAS',NO_ASISTIO:'NO ASISTIÓ'};

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
          <button className={'turn-button ' + (turnos.COMIDA ? 'selected' : '')} type="button" onClick={() => toggleTurno('COMIDA')}>☀ Comida ({comida.length})</button>
          <button className={'turn-button ' + (turnos.CENA ? 'selected' : '')} type="button" onClick={() => toggleTurno('CENA')}>🌙 Cena ({cena.length})</button>
          <button className={"filter-button " + (Object.values(filtroEstados).some(Boolean) ? "has-filter" : "")} type="button" aria-label="Filtrar reservas" title="Filtrar reservas" onClick={abrirFiltro}>
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
              <ReservationCard key={reserva.ReservaID} reserva={reserva} onAssignTable={r => navigate('/mesas?asignar=' + encodeURIComponent(r.ReservaID))} onUpdate={handleUpdate} />
            ))
          )}
        </div>
      </div>
      {filtroAbierto && (
        <div className="filter-overlay" role="dialog" aria-modal="true" aria-labelledby="filtroReservasTitulo">
          <div className="filter-modal">
            <div className="filter-modal__header">
              <h2 id="filtroReservasTitulo">FILTRO RESERVAS</h2>
              <button type="button" className="filter-modal__close" onClick={cerrarFiltroSinCambios} aria-label="Cerrar">×</button>
            </div>
            <div className="filter-modal__options">
              {ESTADOS_FILTRO.map(estado => (
                <label key={estado} className={'filter-option filter-option--' + estado.toLowerCase()}>
                  <input type="checkbox" checked={filtroEdicion[estado]} onChange={() => toggleFiltroEstado(estado)} />
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
