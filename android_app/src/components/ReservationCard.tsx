import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import StateChangeModal from './StateChangeModal';

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
          <button className={'table-button'+(assignedTables.length ? ' table-button--asignada' : '')} type="button" onClick={requestTable}>
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

      <StateChangeModal
        reserva={reserva}
        open={stateOpen}
        onClose={() => setStateOpen(false)}
        onUpdated={(next) => onUpdate?.(next as ReservationCardData)}
      />
    </>
  );
}
