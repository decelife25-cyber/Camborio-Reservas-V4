import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export type StateChangeReservation = {
  ReservaID: string;
  CodigoReserva?: string | null;
  FechaReserva: string;
  Estado: string;
  Mesa?: string | null;
  Turno?: string | null;
};

function todayMadrid() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function turnoActivo(): 'COMIDA' | 'CENA' {
  const hour = Number(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    hour12: false,
  }).format(new Date()));
  return hour >= 18 ? 'CENA' : 'COMIDA';
}

function mesaValida(mesa: string | null | undefined) {
  const value = String(mesa || '').trim().toUpperCase();
  return Boolean(value && !['SIN ASIGNAR', 'NULL', 'UNDEFINED'].includes(value));
}

function estadoLabel(status: string) {
  if (status === 'NO_PRESENTADO') return 'NO ASISTIÓ';
  return status.replaceAll('_', ' ');
}

export default function StateChangeModal({
  reserva,
  open,
  onClose,
  onUpdated,
}: {
  reserva: StateChangeReservation;
  open: boolean;
  onClose: () => void;
  onUpdated?: (reserva: StateChangeReservation) => void;
}) {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [lightTheme, setLightTheme] = useState(() => document.documentElement.classList.contains('light'));

  useEffect(() => {
    const syncTheme = () => setLightTheme(document.documentElement.classList.contains('light'));
    syncTheme();
    window.addEventListener('camborio-theme-change', syncTheme);
    return () => window.removeEventListener('camborio-theme-change', syncTheme);
  }, []);

  if (!open) return null;

  const pasada = reserva.FechaReserva < todayMadrid();
  const hoy = reserva.FechaReserva === todayMadrid();
  const turnoEsActivo = reserva.Turno === turnoActivo();
  const readOnly = ['FINALIZADA', 'CANCELADA_CLIENTE', 'CANCELADA_LOCAL', 'NO_PRESENTADO'].includes(reserva.Estado);

  const actions: Array<[string, string, string]> = (() => {
    if (reserva.Estado === 'PENDIENTE') {
      return pasada
        ? [['FINALIZADA', 'FINALIZAR', 'finalizada'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']]
        : [['CONFIRMADA', 'CONFIRMAR', 'confirmada'], ['CANCELADA_LOCAL', 'CANCELAR', 'cancelada-local']];
    }
    if (reserva.Estado === 'CONFIRMADA') {
      if (pasada) return [['FINALIZADA', 'FINALIZAR', 'finalizada'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']];
      const result: Array<[string, string, string]> = [];
      if (hoy && turnoEsActivo && mesaValida(reserva.Mesa)) result.push(['SENTADA', 'SENTAR', 'sentada']);
      result.push(['CANCELADA_LOCAL', 'CANCELAR', 'cancelada-local']);
      return result;
    }
    if (reserva.Estado === 'SENTADA') {
      return pasada
        ? [['FINALIZADA', 'FINALIZAR', 'finalizada'], ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']]
        : [['FINALIZADA', 'FINALIZAR', 'finalizada']];
    }
    return [];
  })();

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
      if (!hoy) {
        setError('Solo se puede sentar una reserva de HOY.');
        setSaving(false);
        return;
      }
      if (!turnoEsActivo) {
        setError('La reserva pertenece a otro turno. Cambia al turno correspondiente para sentarla.');
        setSaving(false);
        return;
      }
      if (!mesaValida(reserva.Mesa)) {
        setSaving(false);
        onClose();
        navigate('/mesas?asignar=' + encodeURIComponent(reserva.ReservaID) + '&volverCodigo=' + encodeURIComponent(reserva.CodigoReserva || '') + '&accion=sentar');
        return;
      }
    }

    if (nextState === 'CANCELADA_LOCAL' && !['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado)) {
      setError('No se puede cancelar la reserva en este estado.');
      setSaving(false);
      return;
    }

    if (nextState === 'FINALIZADA' && !(reserva.Estado === 'SENTADA' || (['PENDIENTE', 'CONFIRMADA'].includes(reserva.Estado) && pasada))) {
      setError('Solo se pueden finalizar reservas sentadas o reservas activas ya pasadas.');
      setSaving(false);
      return;
    }

    if (nextState === 'NO_PRESENTADO' && (!['PENDIENTE', 'CONFIRMADA', 'SENTADA'].includes(reserva.Estado) || !pasada)) {
      setError('Solo se puede marcar NO ASISTIÓ en una reserva activa ya pasada.');
      setSaving(false);
      return;
    }

    const ahora = new Date().toISOString();
    const { data, error: updateError } = await supabase
      .from('Reservas')
      .update({ Estado: nextState, FechaEstado: ahora, FechaModificacion: ahora })
      .eq('ReservaID', reserva.ReservaID)
      .select('*')
      .single();

    if (updateError) {
      setError(updateError.message);
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

    const next = { ...reserva, ...data, Estado: nextState } as StateChangeReservation;
    onUpdated?.(next);
    setSaving(false);
    onClose();
  };

  return (
    <div className="v2-edit-overlay" onClick={onClose}>
      <div className={'v2-edit-modal v2-state-modal state-change-modal' + (lightTheme ? ' light-theme' : '')} onClick={e => e.stopPropagation()}>
        <h3>CAMBIAR ESTADO</h3>
        <div className={'v2-state-current status-modal-' + reserva.Estado.toLowerCase().replaceAll('_', '-')}>
          {estadoLabel(reserva.Estado)}
        </div>
        {error && <div className="cr-nueva-reserva__mensaje" data-tipo="error">{error}</div>}
        <div className="v2-edit-actions ficha-state-actions">
          {actions.map(([state, label, kind]) => (
            <button
              key={state}
              type="button"
              className={'ficha-state-button ficha-state-button--' + kind}
              onClick={() => void changeState(state)}
              disabled={saving}
            >
              {saving ? '...' : label}
            </button>
          ))}
        </div>
        <button className="v2-edit-cancel-full" type="button" onClick={onClose}>
          CERRAR SIN CAMBIOS
        </button>
      </div>
    </div>
  );
}
