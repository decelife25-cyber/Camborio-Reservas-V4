import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, User, Phone, Users, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

export type SearchReservation = {
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
  FechaCreacion?: string | null;
};

function formatDate(value: string) {
  const [y, m, d] = String(value || '').split('-').map(Number);
  if (!y || !m || !d) return { day: '--', year: '', weekday: '' };
  const date = new Date(y, m - 1, d);
  const days = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  return { day: String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0'), year: String(y), weekday: days[date.getDay()] };
}

function statusLabel(s: string) { return s === 'CANCELADA_CLIENTE' ? 'CANCELA CLIENTE' : s === 'CANCELADA_LOCAL' ? 'CANCELA LOCAL' : s.replaceAll('_', ' '); }

export default function SearchReservationCard({ reserva: initial, index, total, onNavigate, onUpdated }: {
  reserva: SearchReservation; index: number; total: number; onNavigate: (delta: number) => void; onUpdated: (r: SearchReservation) => void;
}) {
  const [reserva, setReserva] = useState(initial);
  const [edit, setEdit] = useState<null | 'fecha' | 'hora' | 'personas' | 'observaciones' | 'mesa'>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [stateModal, setStateModal] = useState(false);
  const [error, setError] = useState('');

  const date = useMemo(() => formatDate(reserva.FechaReserva), [reserva.FechaReserva]);
  const past = new Date(reserva.FechaReserva + 'T' + String(reserva.HoraReserva).slice(0,5) + ':00').getTime() < Date.now();
  const readOnly = ['FINALIZADA','CANCELADA_CLIENTE','CANCELADA_LOCAL','NO_PRESENTADO'].includes(reserva.Estado) || past;

  function openEdit(field: typeof edit) {
    if (readOnly && field !== null) return;
    setError('');
    setEdit(field);
    if (field === 'fecha') setValue(reserva.FechaReserva);
    if (field === 'hora') setValue(String(reserva.HoraReserva || '').slice(0,5));
    if (field === 'personas') setValue(String(reserva.Personas || 1));
    if (field === 'observaciones') setValue(reserva.Observaciones || '');
    if (field === 'mesa') setValue(reserva.Mesa || '');
  }

  async function saveField() {
    if (!edit) return;
    setError('');
    let changes: Record<string, any> = {};
    if (edit === 'fecha') changes.FechaReserva = value;
    if (edit === 'hora') changes.HoraReserva = value;
    if (edit === 'personas') changes.Personas = Math.max(1, Number(value) || 1);
    if (edit === 'observaciones') changes.Observaciones = value.trim() || null;
    if (edit === 'mesa') changes.Mesa = value.trim() || null;

    const nextDate = changes.FechaReserva || reserva.FechaReserva;
    const nextTime = changes.HoraReserva || String(reserva.HoraReserva).slice(0,5);
    const dt = new Date(nextDate + 'T' + nextTime + ':00');
    if (Number.isNaN(dt.getTime()) || dt.getTime() < Date.now() - 60000) { setError('No puedes usar una fecha u hora pasada.'); return; }

    if (changes.FechaReserva || changes.HoraReserva) {
      changes.Turno = getTurnoFromHora(nextTime);
      if (changes.Turno !== reserva.Turno) { changes.Mesa = null; changes.MesasAdicionales = null; }
    }

    setSaving(true);
    const { data, error: updateError } = await supabase.from('Reservas').update(changes).eq('ReservaID', reserva.ReservaID).select('*').single();
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    const next = { ...reserva, ...data, ...changes } as SearchReservation;
    setReserva(next); onUpdated(next); setEdit(null);
  }

  async function changeState(action: string) {
    const map: Record<string,string> = { confirmar:'CONFIRMADA', cancelar:'CANCELADA_LOCAL', sentar:'SENTADA', finalizar:'FINALIZADA', 'no-presentado':'NO_PRESENTADO' };
    const nextState = map[action];
    if (!nextState) return;
    setSaving(true); setError('');
    const { data, error: updateError } = await supabase.from('Reservas').update({ Estado: nextState }).eq('ReservaID', reserva.ReservaID).select('*').single();
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    const next = { ...reserva, ...data, Estado: nextState } as SearchReservation;
    setReserva(next); onUpdated(next); setStateModal(false);
  }

  const stateActions = reserva.Estado === 'PENDIENTE'
    ? ['confirmar','cancelar']
    : reserva.Estado === 'CONFIRMADA'
      ? ['sentar','cancelar']
      : reserva.Estado === 'SENTADA'
        ? ['finalizar']
        : [];

  const mesaText = reserva.Mesa ? 'MESA ' + reserva.Mesa : 'SIN ASIGNAR';

  return (
    <div className="v2-search-card-wrap">
      <div className="v2-search-card-nav">
        <button type="button" onClick={() => onNavigate(-1)} disabled={index === 0}><ChevronLeft size={20}/> ANTERIOR</button>
        <strong>RESERVA {index + 1} DE {total}</strong>
        <button type="button" onClick={() => onNavigate(1)} disabled={index === total - 1}>SIGUIENTE <ChevronRight size={20}/></button>
      </div>

      <article className={'v2-search-card v2-search-card--' + reserva.Estado.toLowerCase().replaceAll('_','-')}>
        <div className="v2-search-card-head">
          <div className="v2-search-client">
            <strong><User size={25}/> {reserva.Nombre || 'SIN NOMBRE'}</strong>
            <span><Phone size={17}/> {reserva.Telefono || 'Sin teléfono'} <b>-</b> <em>{reserva.CodigoReserva || '—'}</em></span>
          </div>
          <button type="button" className="v2-search-state" onClick={() => !readOnly && setStateModal(true)} disabled={readOnly}>{statusLabel(reserva.Estado)}{!readOnly && ' ▼'}</button>
        </div>

        <div className="v2-search-blocks">
          <button type="button" onClick={() => openEdit('fecha')} disabled={readOnly}><strong>{date.day}</strong><em>{date.year}</em></button>
          <button type="button" onClick={() => openEdit('hora')} disabled={readOnly}><strong>{date.weekday}</strong><em>{String(reserva.HoraReserva || '').slice(0,5)}</em></button>
          <button type="button" onClick={() => openEdit('personas')} disabled={readOnly}><strong>{reserva.Personas || 0} PAX</strong></button>
          <button type="button" onClick={() => openEdit('mesa')} disabled={readOnly}><span>MESA</span><strong className={!reserva.Mesa ? 'v2-mesa-empty' : ''}>{mesaText}</strong></button>
        </div>

        <button type="button" className="v2-search-observations" onClick={() => openEdit('observaciones')} disabled={readOnly}>
          <span>OBSERVACIONES</span><p>{reserva.Observaciones || 'Sin observaciones.'}</p>
        </button>

        {error && <div className="v2-search-error">{error}</div>}
        <button type="button" className="v2-search-save" onClick={() => {
          if (edit) saveField();
        }} disabled={saving || !edit}>{saving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}</button>

        {stateActions.length > 0 && <div className="v2-search-actions">
          {stateActions.map(a => <button key={a} type="button" onClick={() => changeState(a)} disabled={saving}>{a === 'confirmar' ? 'CONFIRMAR' : a === 'cancelar' ? 'CANCELAR' : a === 'sentar' ? 'SENTAR' : a === 'finalizar' ? 'FINALIZAR' : 'NO ASISTIÓ'}</button>)}
        </div>}
      </article>

      {edit && (
        <div className="v2-edit-overlay">
          <div className="v2-edit-modal">
            <button className="v2-edit-close" type="button" onClick={() => setEdit(null)}><X size={20}/></button>
            <h3>{edit === 'fecha' ? 'CAMBIAR FECHA' : edit === 'hora' ? 'CAMBIAR HORA' : edit === 'personas' ? 'CAMBIAR PAX' : edit === 'mesa' ? 'MESA ASIGNADA' : 'OBSERVACIONES'}</h3>
            {edit === 'observaciones' ? <textarea rows={4} value={value} onChange={e => setValue(e.target.value)} autoFocus /> : edit === 'personas' ? <div className="v2-edit-pax"><button type="button" onClick={() => setValue(String(Math.max(1, Number(value || 1) - 1)))}>−</button><input type="number" min="1" value={value} onChange={e => setValue(e.target.value)} /><button type="button" onClick={() => setValue(String(Number(value || 1) + 1))}>+</button></div> : <input type={edit === 'fecha' ? 'date' : edit === 'hora' ? 'time' : 'text'} value={value} onChange={e => setValue(e.target.value)} autoFocus />}
            <div className="v2-edit-actions"><button type="button" onClick={() => setEdit(null)}>CANCELAR</button><button type="button" onClick={saveField}>ACEPTAR</button></div>
          </div>
        </div>
      )}

      {stateModal && (
        <div className="v2-edit-overlay" onClick={() => setStateModal(false)}>
          <div className="v2-edit-modal" onClick={e => e.stopPropagation()}>
            <h3>CAMBIAR ESTADO</h3>
            <div className="v2-state-current">{statusLabel(reserva.Estado)}</div>
            <div className="v2-edit-actions v2-state-actions">{stateActions.map(a => <button key={a} type="button" onClick={() => changeState(a)}>{a === 'confirmar' ? 'CONFIRMAR' : a === 'cancelar' ? 'CANCELAR' : a === 'sentar' ? 'SENTAR' : a === 'finalizar' ? 'FINALIZAR' : 'NO ASISTIÓ'}</button>)}</div>
            <button type="button" className="v2-edit-cancel-full" onClick={() => setStateModal(false)}>CERRAR SIN CAMBIOS</button>
          </div>
        </div>
      )}
    </div>
  );
}
