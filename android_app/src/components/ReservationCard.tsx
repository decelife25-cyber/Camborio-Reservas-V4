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
  MesasAdicionales?: string | null;
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

function madridNowTime() {
  return new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date());
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
  onModify,
  onUpdate,
}: {
  reserva: ReservationCardData;
  onAssignTable?: (reserva: ReservationCardData) => void;
  onModify?: (reserva: ReservationCardData) => void;
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
    if (!mesaValida(reserva.Mesa)) { if (onAssignTable) { onAssignTable(reserva); } else { goAssignTable(false); } return; }
    setTableChangeOpen(true);
  };
  const hoyMadrid = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
  const horaMadrid = madridNowTime();
  const esReservaPasada = reserva.FechaReserva < hoyMadrid || (reserva.FechaReserva === hoyMadrid && formatTime(reserva.HoraReserva) < horaMadrid);
  const changeState = async (nextState: string) => {
    if (saving || readOnly) return;
    setSaving(true);
    setError('');

    if (nextState === 'CONFIRMADA' && reserva.Estado !== 'PENDIENTE') {
      setError('Solo se pueden confirmar reservas pendientes.');
      setSaving(false);
      return;
    }

    if (nextState === 'SENTADA') {
      if (reserva.Estado !== 'CONFIRMADA') {
        setError('Solo se pueden sentar reservas confirmadas.');
        setSaving(false);
        return;
      }
      if (!mesaValida(reserva.Mesa)) {
        setSaving(false);
        goAssignTable(true);
        return;
      }
    }

    if (nextState === 'CANCELADA_LOCAL' && !['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado)) {
      setError('No se puede cancelar la reserva en este estado.');
      setSaving(false);
      return;
    }

    if (nextState === 'FINALIZADA') {
      if (reserva.Estado === 'SENTADA') {
        // Permitido: una reserva sentada puede finalizarse en el turno actual.
      } else if (['PENDIENTE', 'CONFIRMADA'].includes(reserva.Estado) && esReservaPasada) {
        // V2 permite cerrar una reserva activa que ya quedó atrás.
      } else {
        setError('Solo se pueden finalizar reservas sentadas o reservas activas ya pasadas.');
        setSaving(false);
        return;
      }
    }

    if (nextState === 'NO_PRESENTADO') {
      const permitido = ['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado) && esReservaPasada;
      if (!permitido) {
        setError('Solo se puede marcar NO ASISTIÓ en una reserva activa ya pasada.');
        setSaving(false);
        return;
      }
    }

    const ahora = new Date().toISOString();
    const resultado = await supabase
      .from('Reservas')
      .update({ Estado: nextState, FechaEstado: ahora, FechaModificacion: ahora })
      .eq('ReservaID', reserva.ReservaID)
      .select('*')
      .single();

    if (resultado.error) {
      setError(resultado.error.message);
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
    if (logError) console.warn('No se pudo registrar el log de estado', logError);

    setSaving(false);
    const next = { ...reserva, ...resultado.data, Estado: nextState } as ReservationCardData;
    onUpdate?.(next);
    setStateOpen(false);
  };

  const stateActions = (() => {
    if (reserva.Estado === 'PENDIENTE') {
      return esReservaPasada
        ? [['FINALIZADA', 'FINALIZAR', 'finalizada'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']]
        : [['CONFIRMADA', 'CONFIRMAR', 'confirmar'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar']];
    }
    if (reserva.Estado === 'CONFIRMADA') {
      return esReservaPasada
        ? [['SENTADA', 'SENTAR', 'sentar'], ['FINALIZADA', 'FINALIZAR', 'finalizada'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']]
        : [['SENTADA', 'SENTAR', 'sentar'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar']];
    }
    if (reserva.Estado === 'SENTADA') {
      return esReservaPasada
        ? [['FINALIZADA', 'FINALIZAR', 'finalizada'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']]
        : [['FINALIZADA', 'FINALIZAR', 'finalizada']];
    }
    return [];
  })();

  const assignedTables = [reserva.Mesa, ...(String(reserva.MesasAdicionales || '').split(',').map(v => v.trim()).filter(Boolean))].filter(Boolean) as string[];
  const mesaLabel = assignedTables.length ? 'MESA ' + assignedTables[0] + (assignedTables.length > 1 ? ' (+' + (assignedTables.length - 1) + ')' : '') : 'SIN ASIGNAR';

  return (
    <>
      <article className="reservation-card">
        <div className={'reservation-time' + (esReservaPasada ? ' reservation-time--pasada' : '')} onClick={() => !readOnly && setStateOpen(true)}>
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
            <div className="cr-confirmacion-mesa__contenido cr-mesas-asignadas-modal__numeros">{assignedTables.join(' · ')}</div>
            <div className="v2-edit-actions ficha-edit-actions ficha-result-actions">
              <button className="cr-confirmacion-mesa__boton cr-confirmacion-mesa__boton--cancelar" type="button" onClick={() => setTableChangeOpen(false)}>CERRAR</button>
              <button className="cr-confirmacion-mesa__boton cr-confirmacion-mesa__boton--aceptar" type="button" onClick={() => { setTableChangeOpen(false); goAssignTable(false); }}>CAMBIAR MESAS</button>
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
            <div className="v2-edit-actions ficha-state-actions">
              {stateActions.map(([s, label, kind]) => (
                <button
                  key={s}
                  type="button"
                  className={'ficha-state-button ficha-state-button--' + kind}
                  onClick={() => {
                    if (s === 'MODIFICAR') {
                      if (onModify) onModify(reserva);
                      else navigate('/buscar?codigo=' + encodeURIComponent(reserva.CodigoReserva || ''));
                      setStateOpen(false);
                      return;
                    }
                    if (s === 'ASIGNAR_MESA' || s === 'CAMBIAR_MESA') {
                      setStateOpen(false);
                      goAssignTable(false);
                      return;
                    }
                    void changeState(s);
                  }}
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
