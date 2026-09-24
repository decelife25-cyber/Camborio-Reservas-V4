import { useState } from 'react';
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
  const [showObservations, setShowObservations] = useState(false);
  const [stateOpen, setStateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const hasObservations = Boolean(reserva.Observaciones?.trim());

  const readOnly = ['FINALIZADA', 'CANCELADA_CLIENTE', 'CANCELADA_LOCAL', 'NO_PRESENTADO'].includes(reserva.Estado);

  const changeState = async (nextState: string) => {
    if (nextState === 'SENTADA' && !reserva.Mesa) {
      setError('Debes asignar una mesa antes de sentar la reserva.');
      return;
    }

    setSaving(true);
    setError('');
    const { data, error: e } = await supabase.from('Reservas').update({ Estado: nextState }).eq('ReservaID', reserva.ReservaID).select('*').single();
    setSaving(false);

    if (e) {
      setError(e.message);
      return;
    }

    const next = { ...reserva, ...data, Estado: nextState } as ReservationCardData;
    if (onUpdate) onUpdate(next);
    setStateOpen(false);
  };

  const stateActions = reserva.Estado === 'PENDIENTE'
    ? [['CONFIRMADA', 'CONFIRMAR'], ['CANCELADA_LOCAL', 'CANCELAR'], ['NO_PRESENTADO', 'NO ASISTIÓ']]
    : reserva.Estado === 'CONFIRMADA'
      ? [['SENTADA', 'SENTAR'], ['CANCELADA_LOCAL', 'CANCELAR'], ['NO_PRESENTADO', 'NO ASISTIÓ']]
      : reserva.Estado === 'SENTADA'
        ? [['FINALIZADA', 'FINALIZAR']]
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
            <span className="reservation-code">{reserva.CodigoReserva || '—'}</span>
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
            <div className="v2-state-current">{statusLabel(reserva.Estado)}</div>
            {error && <div className="cr-nueva-reserva__mensaje" data-tipo="error" style={{ marginBottom: '14px' }}>{error}</div>}
            <div className="v2-edit-actions">
              {stateActions.map(([s, label]) => (
                <button key={s} type="button" onClick={() => changeState(s)} disabled={saving}>
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
