import { useState } from 'react';
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

export default function ReservationCard({ reserva, onAssignTable, onUpdate }: { reserva: ReservationCardData; onAssignTable?: (reserva: ReservationCardData) => void; onUpdate?: (reserva: ReservationCardData) => void }) {
  const navigate = useNavigate();
  const [showObservations, setShowObservations] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hasObservations = Boolean(reserva.Observaciones?.trim());

  const readOnly = ['FINALIZADA', 'CANCELADA_CLIENTE', 'CANCELADA_LOCAL', 'NO_PRESENTADO'].includes(reserva.Estado);

  const changeState = async (nextState: string) => {
    setSaving(true);
    setError('');

    // Validaciones de negocio estilo V2
    if (nextState === 'CONFIRMADA' && reserva.Estado !== 'PENDIENTE') {
      setError('Solo se pueden confirmar reservas pendientes.');
      setSaving(false);
      return;
    }

    if (nextState === 'SENTADA') {
      if (reserva.Estado !== 'CONFIRMADA') {
        setError('Solo se puede sentar una reserva CONFIRMADA.');
        setSaving(false);
        return;
      }
      if (!reserva.Mesa || reserva.Mesa.trim().toUpperCase() === 'SIN ASIGNAR') {
        setError('Debes asignar una mesa antes de sentar la reserva.');
        setSaving(false);
        return;
      }
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
      if (reserva.FechaReserva !== today) {
        setError('Solo se pueden sentar reservas de hoy.');
        setSaving(false);
        return;
      }
      const { data: ocupadas, error: checkError } = await supabase
        .from('Reservas')
        .select('ReservaID')
        .eq('FechaReserva', reserva.FechaReserva)
        .eq('Turno', reserva.Turno)
        .eq('Mesa', reserva.Mesa)
        .eq('Estado', 'SENTADA')
        .neq('ReservaID', reserva.ReservaID);

      if (checkError) {
        setError('Error al comprobar disponibilidad de mesa.');
        setSaving(false);
        return;
      }
      if (ocupadas && ocupadas.length > 0) {
        setError('La mesa asignada ya está OCUPADA en este turno.');
        setSaving(false);
        return;
      }
    }

    if (nextState === 'CANCELADA_LOCAL') {
      if (!['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado)) {
        setError('No se puede cancelar esta reserva desde su estado actual.');
        setSaving(false);
        return;
      }
    }

    if (nextState === 'NO_PRESENTADO') {
      if (!['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado)) {
        setError('No se puede marcar como NO ASISTIÓ desde su estado actual.');
        setSaving(false);
        return;
      }
    }

    if (nextState === 'FINALIZADA') {
      const past = new Date(reserva.FechaReserva + 'T' + String(reserva.HoraReserva).slice(0, 5) + ':00').getTime() < Date.now();
      if (reserva.Estado !== 'SENTADA' && !(['PENDIENTE', 'CONFIRMADA'].includes(reserva.Estado) && past)) {
        setError('Esta reserva todavía no se puede finalizar.');
        setSaving(false);
        return;
      }
    }

    const now = new Date().toISOString();
    const { data, error: e } = await supabase
      .from('Reservas')
      .update({ Estado: nextState, FechaEstado: now, FechaModificacion: now })
      .eq('ReservaID', reserva.ReservaID)
      .select('*')
      .single();

    if (e) {
      setError(e.message);
      setSaving(false);
      return;
    }

    // Registra en log de Supabase la acción efectuada como en V2 (CR_Reservas_registrarLog)
    const userSession = await supabase.auth.getSession();
    const userId = userSession.data.session?.user?.id;
    await supabase.from('Log').insert({
      FechaHora: now,
      Usuario: userId || null,
      Accion: 'ESTADO_MODIFICADO',
      ReservaID: reserva.ReservaID,
      Detalle: `Cambio de ${reserva.Estado} a ${nextState}`
    });

    setSaving(false);
    const next = { ...reserva, ...data, Estado: nextState } as ReservationCardData;
    if (onUpdate) onUpdate(next);
    setStateOpen(false);
  };

  const reservaPasada = new Date(reserva.FechaReserva + 'T' + String(reserva.HoraReserva).slice(0, 5) + ':00').getTime() < Date.now();
  const stateActions = reserva.Estado === 'PENDIENTE'
    ? (reservaPasada ? [['FINALIZADA', 'FINALIZAR'], ['NO_PRESENTADO', 'NO ASISTIÓ']] : [['CONFIRMADA', 'CONFIRMAR'], ['CANCELADA_LOCAL', 'CANCELAR']])
    : reserva.Estado === 'CONFIRMADA'
      ? (reservaPasada ? [['FINALIZADA', 'FINALIZAR'], ['NO_PRESENTADO', 'NO ASISTIÓ']] : [['SENTADA', 'SENTAR'], ['CANCELADA_LOCAL', 'CANCELAR']])
      : reserva.Estado === 'SENTADA'
        ? [['FINALIZADA', 'FINALIZAR'], ...(reservaPasada ? [['NO_PRESENTADO', 'NO ASISTIÓ']] : [])]
        : [];

  return (
    <>
      <article className="reservation-card">
        <div className="reservation-time" onClick={() => !readOnly && setStateOpen(true)}>
          <span className={'status-pill status-' + reserva.Estado.toLowerCase().replaceAll('_', '-')}>
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
            <span
              className="reservation-code"
              role="button"
              tabIndex={reserva.CodigoReserva ? 0 : -1}
              onClick={() => reserva.CodigoReserva && navigate('/buscar?codigo=' + encodeURIComponent(reserva.CodigoReserva))}
              onKeyDown={event => {
                if (event.key === 'Enter' && reserva.CodigoReserva) navigate('/buscar?codigo=' + encodeURIComponent(reserva.CodigoReserva));
              }}
              title={reserva.CodigoReserva ? 'Abrir reserva' : undefined}
            >{reserva.CodigoReserva || '—'}</span>
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
          <button className="table-button" type="button" onClick={() => { if (!reserva.Mesa && onAssignTable) onAssignTable(reserva); }}>
            {reserva.Mesa ? 'MESA ' + reserva.Mesa : 'SIN ASIGNAR'}
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

      {stateOpen && (
        <div className="v2-edit-overlay" onClick={() => setStateOpen(false)}>
          <div className="v2-edit-modal" onClick={e => e.stopPropagation()}>
            <h3>CAMBIAR ESTADO</h3>
            <div className={'v2-state-current v2-state-current--' + reserva.Estado.toLowerCase().replaceAll('_', '-')}>{statusLabel(reserva.Estado)}</div>
            {error && <div className="cr-nueva-reserva__mensaje" data-tipo="error" style={{ marginBottom: '14px' }}>{error}</div>}
            <div className="v2-edit-actions">
              {stateActions.map(([s, label]) => (
                <button
                  key={s}
                  className={'v2-state-action v2-state-action--' + s.toLowerCase().replaceAll('_', '-')}
                  type="button"
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
