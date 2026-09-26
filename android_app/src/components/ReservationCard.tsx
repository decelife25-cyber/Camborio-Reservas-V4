import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export type ReservationCardData = {
  ReservaID: string;
  CodigoReserva: string | null;
  FechaReserva: string;
  HoraReserva: string;
  Nombre: string | null;
  Telefono: string | null;
  Personas: number | null;
  Estado: string;
  Mesa: string | null;
  Turno?: string | null;
  Observaciones?: string | null;
};

function formatTime(value: string) {
  return String(value || '').slice(0, 5);
}

function statusLabel(status: string) {
  if (status === 'CONFIRMADA') return 'CONFIRMADA';
  if (status === 'PENDIENTE') return 'PENDIENTE';
  if (status === 'SENTADA') return 'SENTADA';
  if (status === 'FINALIZADA') return 'FINALIZADA';
  if (status === 'NO_PRESENTADO') return 'NO PRESENTADO';
  return status.replaceAll('_', ' ');
}

function isToday(fecha: string) {
  return fecha === new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function getActiveTurno(): 'COMIDA' | 'CENA' {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hour12: false,
  }).format(new Date()));
  return hour >= 18 ? 'CENA' : 'COMIDA';
}

function mesaValida(mesa: string | null) {
  const value = String(mesa || '').trim().toUpperCase();
  return Boolean(value && !['SIN ASIGNAR', 'NULL', 'UNDEFINED'].includes(value));
}

export default function ReservationCard({
  reserva,
  onAssignTable,
  onUpdate,
}: {
  reserva: ReservationCardData;
  onAssignTable?: (reserva: ReservationCardData) => void;
  onUpdate?: (reserva: ReservationCardData) => void;
}) {
  const navigate = useNavigate();
  const [showObservations, setShowObservations] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [tableChangeOpen, setTableChangeOpen] = useState(false);
  const [lightTheme, setLightTheme] = useState(() => document.documentElement.classList.contains('light'));
  const hasObservations = Boolean(reserva.Observaciones?.trim());

  useEffect(() => {
    const syncTheme = () => setLightTheme(document.documentElement.classList.contains('light'));
    syncTheme();
    window.addEventListener('camborio-theme-change', syncTheme);
    return () => window.removeEventListener('camborio-theme-change', syncTheme);
  }, []);

  const readOnly = ['FINALIZADA', 'CANCELADA_CLIENTE', 'CANCELADA_LOCAL', 'NO_PRESENTADO'].includes(reserva.Estado);

  const goAssignTable = (autoSeat = false) => {
    navigate('/mesas?asignar=' + encodeURIComponent(reserva.ReservaID) + '&volverCodigo=' + encodeURIComponent(reserva.CodigoReserva || '') + (autoSeat ? '&accion=sentar' : ''));
  };
  const requestTable = () => {
    if (!mesaValida(reserva.Mesa)) { goAssignTable(false); return; }
    setTableChangeOpen(true);
  };
  const changeState = async (nextState: string) => {
    setSaving(true);
    setError('');

    if (nextState === 'CONFIRMADA' && reserva.Estado !== 'PENDIENTE') {
      setError('Solo se pueden confirmar reservas pendientes.');
      setSaving(false);
      return;
    }

    if (nextState === 'SENTADA') {
      if (!['PENDIENTE','CONFIRMADA'].includes(reserva.Estado)) {
        setError('La reserva debe estar CONFIRMADA para sentarla.');
        setSaving(false);
        return;
      }
      if (!isToday(reserva.FechaReserva)) {
        setError('Solo se puede sentar una reserva de HOY.');
        setSaving(false);
        return;
      }
      if (reserva.Turno !== getActiveTurno()) {
        setError('La reserva pertenece a otro turno. Cambia al turno activo para sentarla.');
        setSaving(false);
        return;
      }
      if (!mesaValida(reserva.Mesa)) {
        setSaving(false);
        goAssignTable(true);
        return;
      }
    }

    if (nextState === 'CANCELADA_LOCAL') {
      if (!['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado)) {
        setError('No se puede cancelar la reserva en este estado.');
        setSaving(false);
        return;
      }
    }

    if (nextState === 'NO_PRESENTADO') {
      if (!['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado)) {
        setError('No se puede marcar NO ASISTIÓ desde este estado.');
        setSaving(false);
        return;
      }
    }

    if (nextState === 'FINALIZADA' && !['SENTADA', 'PENDIENTE', 'CONFIRMADA'].includes(reserva.Estado)) {
      setError('No se puede finalizar la reserva en este estado.');
      setSaving(false);
      return;
    }

    if (nextState === 'FINALIZADA' && ['PENDIENTE', 'CONFIRMADA'].includes(reserva.Estado)) {
      const fechaHora = new Date(
        reserva.FechaReserva + 'T' + formatTime(reserva.HoraReserva) + ':00'
      ).getTime();
      if (!Number.isNaN(fechaHora) && fechaHora > Date.now()) {
        setError('Solo se puede finalizar una reserva pendiente o confirmada cuando ya ha pasado su hora.');
        setSaving(false);
        return;
      }
    }

    const { data, error: e } = await supabase
      .from('Reservas')
      .update({ Estado: nextState })
      .eq('ReservaID', reserva.ReservaID)
      .select('*')
      .single();

    if (e) {
      setError(e.message);
      setSaving(false);
      return;
    }

    const session = await supabase.auth.getSession();
    const userId = session.data.session?.user?.id;
    const { error: logError } = await supabase.from('Log').insert({
      ReservaID: reserva.ReservaID,
      Usuario: userId || null,
      Accion: 'ESTADO_MODIFICADO',
      Detalle: 'Cambio de estado: ' + reserva.Estado + ' → ' + nextState,
    });

    if (logError) {
      console.warn('No se pudo registrar el log de estado', logError);
    }

    setSaving(false);
    const next = { ...reserva, ...data, Estado: nextState } as ReservationCardData;
    onUpdate?.(next);
    setStateOpen(false);
  };

  const stateActions =
    reserva.Estado === 'PENDIENTE'
      ? [['SENTADA', 'SENTAR', 'sentar'], ['CONFIRMADA', 'CONFIRMAR', 'confirmar'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar']]
      : reserva.Estado === 'CONFIRMADA'
        ? [['SENTADA', 'SENTAR', 'sentar'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar']]
        : reserva.Estado === 'SENTADA'
          ? [['FINALIZADA', 'FINALIZAR', 'finalizar'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']]
          : [];

  const assignedTables = [reserva.Mesa, ...(String(reserva.MesasAdicionales || '').split(',').map(v => v.trim()).filter(Boolean))].filter(Boolean) as string[];
  const mesaLabel = assignedTables.length ? 'MESA ' + assignedTables[0] + (assignedTables.length > 1 ? ' (+' + (assignedTables.length - 1) + ')' : '') : 'SIN ASIGNAR';

  return (
    <>
      <article className="reservation-card">
        <div className="reservation-time" onClick={() => !readOnly && setStateOpen(true)}>
          <span className={'status-pill status-' + reserva.Estado.toLowerCase().replaceAll('_', '-').replaceAll(' ', '-')}>
            {statusLabel(reserva.Estado)}
          </span>
          <strong>{formatTime(reserva.HoraReserva)}</strong>
        </div>
        <div className="reservation-main">
          <div className="customer-name"><span>👤</span>{reserva.Nombre || 'SIN NOMBRE'}</div>
          <div className="customer-meta">
            <span className="phone-icon">☎</span>
            <span>{reserva.Telefono || '—'}</span>
            <span>•</span>
            <button
              type="button"
              className="reservation-code reservation-code-button"
              onClick={() => reserva.CodigoReserva && navigate('/buscar?codigo=' + encodeURIComponent(reserva.CodigoReserva))}
              disabled={!reserva.CodigoReserva}
            >
              {reserva.CodigoReserva || '—'}
            </button>
            {hasObservations && (
              <button
                type="button"
                className="observation-button"
                aria-label="Ver observaciones"
                title="Ver observaciones"
                onClick={() => setShowObservations(true)}
              >👁️</button>
            )}
          </div>
        </div>
        <div className="reservation-party">
          <div className="pax"><span>👥</span> {reserva.Personas || 0} PAX</div>
          <button className="table-button" type="button" onClick={requestTable}>
            {mesaLabel}
          </button>
        </div>
      </article>

      {showObservations && (
        <div className="observation-overlay" role="dialog" aria-modal="true" aria-label="Observaciones">
          <div className="observation-modal">
            <h2>OBSERVACIONES</h2>
            <div className="observation-text">{reserva.Observaciones}</div>
            <button type="button" className="observation-close" onClick={() => setShowObservations(false)}>
              CERRAR
            </button>
          </div>
        </div>
      )}

      {tableChangeOpen && (
        <div className="v2-edit-overlay" onClick={() => setTableChangeOpen(false)}>
          <div className={'v2-edit-modal v2-state-modal' + (lightTheme ? ' light-theme' : '')} onClick={e => e.stopPropagation()}>
            <h3>MESA ASIGNADA</h3>
            <div className="v2-state-current">{mesaLabel}</div>
            <div className="cr-confirmacion-mesa__contenido">¿QUIERES CAMBIAR LAS MESAS ASIGNADAS?</div>
            <div className="v2-edit-actions ficha-state-actions">
              <button type="button" onClick={() => setTableChangeOpen(false)}>NO</button>
              <button type="button" onClick={() => { setTableChangeOpen(false); goAssignTable(false); }}>CAMBIAR MESAS</button>
            </div>
          </div>
        </div>
      )}

      {stateOpen && (
        <div className="v2-edit-overlay" onClick={() => setStateOpen(false)}>
          <div className={'v2-edit-modal v2-state-modal' + (lightTheme ? ' light-theme' : '')} onClick={e => e.stopPropagation()}>
            <h3>CAMBIAR ESTADO</h3>
            <div className={'v2-state-current status-modal-' + reserva.Estado.toLowerCase().replaceAll('_', '-')}>
              {statusLabel(reserva.Estado)}
            </div>
            {error && <div className="cr-nueva-reserva__mensaje" data-tipo="error">{error}</div>}
            <div className="v2-edit-actions">
              {stateActions.map(([s, label, kind]) => (
                <button
                  key={s}
                  type="button"
                  className={'v2-state-action v2-state-action--' + kind}
                  onClick={() => changeState(s)}
                  disabled={saving}
                >
                  {saving ? '...' : label}
                </button>
              ))}
            </div>
            <button className="v2-edit-cancel-full" type="button" onClick={() => setStateOpen(false)}>
              CERRAR SIN CAMBIOS
            </button>
          </div>
        </div>
      )}
    </>
  );
}
