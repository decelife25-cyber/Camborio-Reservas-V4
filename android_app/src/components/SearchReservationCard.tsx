import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

export type SearchReservation = {
  ReservaID:string; CodigoReserva:string|null; FechaReserva:string; HoraReserva:string;
  Nombre:string|null; Telefono:string|null; Personas:number|null; Estado:string;
  Mesa:string|null; MesasAdicionales?:string|null; Turno?:string|null;
  Observaciones?:string|null; FechaCreacion?:string|null;
};

function dateParts(v:string){
  const [y,m,d]=String(v||'').split('-').map(Number);
  if(!y||!m||!d)return{fecha:'--/--',anio:'',dia:'--'};
  const dt=new Date(y,m-1,d);
  const dias=['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  return{fecha:String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0'),anio:String(y),dia:dias[dt.getDay()]};
}
function stateLabel(s:string){return s.replaceAll('_',' ');}
function todayMadrid(){
  return new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'});
}

export default function SearchReservationCard({reserva:initial,index,total,onNavigate,onUpdated}:{reserva:SearchReservation;index:number;total:number;onNavigate:(d:number)=>void;onUpdated:(r:SearchReservation)=>void}){
  const navigate=useNavigate();
  const[r,setR]=useState(initial);
  const[editing,setEditing]=useState<null|'fecha'|'hora'|'personas'|'observaciones'>(null);
  const[value,setValue]=useState('');
  const[stateOpen,setStateOpen]=useState(false);
  const[saving,setSaving]=useState(false);
  const[dirty,setDirty]=useState(false);
  const[error,setError]=useState('');

  const parts=dateParts(r.FechaReserva);
  const readOnly=['FINALIZADA','CANCELADA_CLIENTE','CANCELADA_LOCAL','NO_PRESENTADO'].includes(r.Estado);
  const sentada=r.Estado==='SENTADA';
  const edit=(field:typeof editing)=>{
    if(readOnly||sentada)return;
    setError('');
    setEditing(field);
    setValue(field==='fecha'?r.FechaReserva:field==='hora'?String(r.HoraReserva).slice(0,5):field==='personas'?String(r.Personas||1):r.Observaciones||'');
  };

  const acceptEdit=()=>{
    if(!editing)return;
    if(editing==='fecha'&&!/^\d{4}-\d{2}-\d{2}$/.test(value)){setError('Fecha no válida.');return;}
    if(editing==='hora'&&!/^\d{2}:\d{2}$/.test(value)){setError('Hora no válida.');return;}
    if(editing==='personas'&&(!Number.isFinite(Number(value))||Number(value)<1)){setError('Número de comensales no válido.');return;}
    const next={...r} as SearchReservation;
    if(editing==='fecha')next.FechaReserva=value;
    if(editing==='hora')next.HoraReserva=value;
    if(editing==='personas')next.Personas=Math.max(1,Number(value));
    if(editing==='observaciones')next.Observaciones=value.trim()||null;
    setR(next);
    setDirty(true);
    setEditing(null);
    setError('');
  };

  const save=async()=>{
    if(!dirty||saving||readOnly)return;
    const fecha=r.FechaReserva;
    const hora=String(r.HoraReserva).slice(0,5);
    if(new Date(fecha+'T'+hora+':00').getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return;}
    const turnoNuevo=getTurnoFromHora(hora);
    const changes:any={FechaReserva:fecha,HoraReserva:hora,Personas:r.Personas||1,Observaciones:r.Observaciones||null,Turno:turnoNuevo};
    if(turnoNuevo!==r.Turno){changes.Mesa=null;changes.MesasAdicionales=null;}
    setSaving(true);
    const{data,error:e}=await supabase.from('Reservas').update(changes).eq('ReservaID',r.ReservaID).select('*').single();
    setSaving(false);
    if(e){setError(e.message);return;}
    const next={...r,...data,...changes} as SearchReservation;
    setR(next);onUpdated(next);setDirty(false);setError('');
  };

  const changeState=async(nextState:string)=>{
    if(saving||readOnly)return;
    if(nextState==='SENTADA'&&!r.Mesa){setError('No se puede sentar la reserva sin mesa asignada.');setStateOpen(false);return;}
    setSaving(true);
    const{data,error:e}=await supabase.from('Reservas').update({Estado:nextState}).eq('ReservaID',r.ReservaID).select('*').single();
    setSaving(false);
    if(e){setError(e.message);return;}
    const next={...r,...data,Estado:nextState} as SearchReservation;
    setR(next);onUpdated(next);setStateOpen(false);setDirty(false);setError('');
  };

  const stateActions= r.Estado==='PENDIENTE'
    ? [['CONFIRMADA','CONFIRMAR'],['CANCELADA_LOCAL','CANCELAR']]
    : r.Estado==='CONFIRMADA'
      ? (r.FechaReserva===todayMadrid()&&r.Mesa?[['SENTADA','SENTAR'],['CANCELADA_LOCAL','CANCELAR']]:[['CANCELADA_LOCAL','CANCELAR']])
      : r.Estado==='SENTADA'
        ? [['FINALIZADA','FINALIZAR']]
        : [];

  const openMesa=()=>{
    if(readOnly)return;
    navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||''));
  };

  return <div className="cr-busqueda-ficha-wrap">
    <div className="cr-busqueda-ficha__nav">
      <button className="cr-busqueda-ficha__volver" type="button" onClick={()=>window.history.back()}>← VOLVER</button>
      <div className="cr-busqueda-ficha__contador">
        <button type="button" onClick={()=>onNavigate(-1)} disabled={index===0}>‹</button>
        <span>RESERVA {index+1} DE {total}</span>
        <button type="button" onClick={()=>onNavigate(1)} disabled={index===total-1}>›</button>
      </div>
    </div>
    <article className={'cr-busqueda-ficha cr-busqueda-ficha--'+r.Estado.toLowerCase().replaceAll('_','-')}>
      <div className="cr-busqueda-ficha__cabecera">
        <div className="cr-busqueda-ficha__cliente">
          <strong><span className="cr-busqueda-ficha__cliente-icon">👤</span>{r.Nombre||'Sin nombre'}</strong>
          <span><span className="cr-busqueda-ficha__telefono-icon">📞</span><span className="cr-busqueda-ficha__telefono">{r.Telefono||'Sin teléfono'}</span><span className="cr-busqueda-ficha__codigo">🏷️ {r.CodigoReserva||'—'}</span></span>
        </div>
        <button className="cr-busqueda-ficha__estado" type="button" onClick={()=>!readOnly&&setStateOpen(true)} disabled={readOnly}>{stateLabel(r.Estado)}{!readOnly?' ▼':''}</button>
      </div>

      <div className="cr-busqueda-ficha__bloques">
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--fecha" type="button" disabled={readOnly||sentada} onClick={()=>edit('fecha')}><strong>{parts.fecha}</strong><em>{parts.anio}</em></button>
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--hora" type="button" disabled={readOnly||sentada} onClick={()=>edit('hora')}><strong>{parts.dia}</strong><em>{String(r.HoraReserva||'').slice(0,5)}</em></button>
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--pax" type="button" disabled={readOnly||sentada} onClick={()=>edit('personas')}><strong>{r.Personas||0} PAX</strong></button>
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--mesa" type="button" disabled={readOnly} onClick={openMesa}><span>MESA</span><strong className={!r.Mesa?'cr-busqueda-ficha__mesa-sin-asignar':''}>{r.Mesa?'MESA '+r.Mesa:'SIN ASIGNAR'}</strong></button>
      </div>

      <button className="cr-busqueda-ficha__observaciones" type="button" disabled={readOnly||sentada} onClick={()=>edit('observaciones')}><span>OBSERVACIONES</span><p>{r.Observaciones||'Sin observaciones.'}</p></button>
      {r.FechaCreacion&&<span className="cr-busqueda-ficha__creada">📅 Creada: {String(r.FechaCreacion).replace('T',' · ').slice(0,19)}</span>}
      {error&&<div className="cr-nueva-reserva__mensaje" data-tipo="error">{error}</div>}
      <button className="cr-busqueda-ficha__guardar" type="button" disabled={!dirty||saving||readOnly} onClick={()=>void save()}>{saving?'GUARDANDO...':'GUARDAR CAMBIOS'}</button>
    </article>

    {editing&&<div className="cr-confirmacion-mesa v2-edit-overlay" onClick={()=>setEditing(null)}>
      <div className="cr-confirmacion-mesa__panel v2-edit-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">{editing==='fecha'?'CAMBIAR FECHA':editing==='hora'?'CAMBIAR HORA':editing==='personas'?'CAMBIAR PAX':'OBSERVACIONES'}</p>
        {editing==='observaciones'
          ? <textarea rows={4} value={value} onChange={e=>setValue(e.target.value)}/>
          : editing==='personas'
            ? <div className="v2-edit-pax"><button type="button" onClick={()=>setValue(String(Math.max(1,Number(value||1)-1)))}>−</button><input type="number" min="1" value={value} onChange={e=>setValue(e.target.value)}/><button type="button" onClick={()=>setValue(String(Number(value||1)+1))}>+</button></div>
            : <input type={editing==='fecha'?'date':'time'} value={value} onChange={e=>setValue(e.target.value)}/>}
        <div className="cr-confirmacion-mesa__acciones v2-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={acceptEdit}>ACEPTAR</button></div>
      </div>
    </div>}

    {stateOpen&&<div className="v2-edit-overlay" onClick={()=>setStateOpen(false)}>
      <div className="v2-edit-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">CAMBIAR ESTADO</p>
        <div className="cr-confirmacion-mesa__texto v2-state-current">{stateLabel(r.Estado)}</div>
        <div className="v2-edit-actions">{stateActions.map(([s,label])=><button key={s} type="button" disabled={saving} onClick={()=>void changeState(s)}>{label}</button>)}</div>
        <button className="cr-confirmacion-mesa__boton v2-edit-cancel-full" type="button" onClick={()=>setStateOpen(false)}>CERRAR SIN CAMBIOS</button>
      </div>
    </div>}
  </div>;
