import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

export type SearchReservation={ReservaID:string;CodigoReserva:string|null;FechaReserva:string;HoraReserva:string;Nombre:string|null;Telefono:string|null;Personas:number|null;Estado:string;Mesa:string|null;MesasAdicionales?:string|null;Turno?:string|null;Observaciones?:string|null;FechaCreacion?:string|null};

function dateParts(v:string){const [y,m,d]=String(v||'').split('-').map(Number);if(!y||!m||!d)return{fecha:'--/--',anio:'',dia:'--'};const dt=new Date(y,m-1,d);const dias=['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];return{fecha:String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0'),anio:String(y),dia:dias[dt.getDay()]}}
function stateLabel(s:string){return s.replaceAll('_',' ')}

export default function SearchReservationCard({reserva:initial,index,total,onNavigate,onUpdated}:{reserva:SearchReservation;index:number;total:number;onNavigate:(d:number)=>void;onUpdated:(r:SearchReservation)=>void}){
 const[r,setR]=useState(initial),[editing,setEditing]=useState<null|'fecha'|'hora'|'personas'|'mesa'|'observaciones'>(null),[value,setValue]=useState(''),[stateOpen,setStateOpen]=useState(false),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
 const parts=dateParts(r.FechaReserva),readOnly=['FINALIZADA','CANCELADA_CLIENTE','CANCELADA_LOCAL','NO_PRESENTADO'].includes(r.Estado);
 const edit=(f:typeof editing)=>{if(readOnly)return;setError('');setEditing(f);setValue(f==='fecha'?r.FechaReserva:f==='hora'?String(r.HoraReserva).slice(0,5):f==='personas'?String(r.Personas||1):f==='mesa'?r.Mesa||'':r.Observaciones||'')};
 const save=async()=>{if(!editing)return;let changes:any={};if(editing==='fecha')changes.FechaReserva=value;if(editing==='hora')changes.HoraReserva=value;if(editing==='personas')changes.Personas=Math.max(1,Number(value)||1);if(editing==='mesa')changes.Mesa=value.trim()||null;if(editing==='observaciones')changes.Observaciones=value.trim()||null;const nd=changes.FechaReserva||r.FechaReserva,nt=changes.HoraReserva||String(r.HoraReserva).slice(0,5);if(new Date(nd+'T'+nt+':00').getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return}if(changes.FechaReserva||changes.HoraReserva){changes.Turno=getTurnoFromHora(nt);if(changes.Turno!==r.Turno){changes.Mesa=null;changes.MesasAdicionales=null}}setSaving(true);const{data,error:e}=await supabase.from('Reservas').update(changes).eq('ReservaID',r.ReservaID).select('*').single();setSaving(false);if(e){setError(e.message);return}const next={...r,...data,...changes} as SearchReservation;setR(next);onUpdated(next);setEditing(null);setDirty(true)};
 const changeState=async(nextState:string)=>{setSaving(true);const{data,error:e}=await supabase.from('Reservas').update({Estado:nextState}).eq('ReservaID',r.ReservaID).select('*').single();setSaving(false);if(e){setError(e.message);return}const next={...r,...data,Estado:nextState} as SearchReservation;setR(next);onUpdated(next);setStateOpen(false);setDirty(true)};
 const stateActions=r.Estado==='PENDIENTE'?[['CONFIRMADA','CONFIRMAR'],['CANCELADA_LOCAL','CANCELAR'],['NO_PRESENTADO','NO ASISTIÓ']]:r.Estado==='CONFIRMADA'?[['SENTADA','SENTAR'],['CANCELADA_LOCAL','CANCELAR'],['NO_PRESENTADO','NO ASISTIÓ']]:r.Estado==='SENTADA'?[['FINALIZADA','FINALIZAR']]:[];
 return <div className="cr-busqueda-ficha-wrap">
  <div className="cr-busqueda-ficha__nav">
   <button className="cr-busqueda-ficha__volver" type="button" onClick={()=>window.history.back()}>← VOLVER</button>
   <div className="cr-busqueda-ficha__contador"><button type="button" onClick={()=>onNavigate(-1)} disabled={index===0}>‹</button><span>RESERVA {index+1} DE {total}</span><button type="button" onClick={()=>onNavigate(1)} disabled={index===total-1}>›</button></div>
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
    <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--fecha" type="button" disabled={readOnly} onClick={()=>edit('fecha')}><strong>{parts.fecha}</strong><em>{parts.anio}</em></button>
    <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--hora" type="button" disabled={readOnly} onClick={()=>edit('hora')}><strong>{parts.dia}</strong><em>{String(r.HoraReserva||'').slice(0,5)}</em></button>
    <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--pax" type="button" disabled={readOnly} onClick={()=>edit('personas')}><strong>{r.Personas||0} PAX</strong></button>
    <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--mesa" type="button" disabled={readOnly} onClick={()=>edit('mesa')}><span>MESA</span><strong className={!r.Mesa?'cr-busqueda-ficha__mesa-sin-asignar':''}>{r.Mesa?'MESA '+r.Mesa:'SIN ASIGNAR'}</strong></button>
   </div>
   <button className="cr-busqueda-ficha__observaciones" type="button" disabled={readOnly} onClick={()=>edit('observaciones')}><span>OBSERVACIONES</span><p>{r.Observaciones||'Sin observaciones.'}</p></button>
   {r.FechaCreacion&&<span className="cr-busqueda-ficha__creada">📅 Creada: {String(r.FechaCreacion).replace('T',' · ').slice(0,19)}</span>}
   {error&&<div className="cr-nueva-reserva__mensaje" data-tipo="error">{error}</div>}
   <button className="cr-busqueda-ficha__guardar" type="button" disabled={!dirty||saving} onClick={()=>setDirty(false)}>{saving?'GUARDANDO...':'GUARDAR CAMBIOS'}</button>
  </article>
  {editing&&<div className="v2-edit-overlay" onClick={()=>setEditing(null)}><div className="v2-edit-modal" onClick={e=>e.stopPropagation()}><h3>{editing==='fecha'?'CAMBIAR FECHA':editing==='hora'?'CAMBIAR HORA':editing==='personas'?'CAMBIAR PAX':editing==='mesa'?'MESA ASIGNADA':'OBSERVACIONES'}</h3>{editing==='observaciones'?<textarea rows={4} value={value} onChange={e=>setValue(e.target.value)}/>:editing==='personas'?<div className="v2-edit-pax"><button type="button" onClick={()=>setValue(String(Math.max(1,Number(value||1)-1)))}>−</button><input type="number" min="1" value={value} onChange={e=>setValue(e.target.value)}/><button type="button" onClick={()=>setValue(String(Number(value||1)+1))}>+</button></div>:<input type={editing==='fecha'?'date':editing==='hora'?'time':'text'} value={value} onChange={e=>setValue(e.target.value)}/>}<div className="v2-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={save}>ACEPTAR</button></div></div></div>}
  {stateOpen&&<div className="v2-edit-overlay" onClick={()=>setStateOpen(false)}><div className="v2-edit-modal" onClick={e=>e.stopPropagation()}><h3>CAMBIAR ESTADO</h3><div className="v2-state-current">{stateLabel(r.Estado)}</div><div className="v2-edit-actions">{stateActions.map(([s,label])=><button key={s} type="button" onClick={()=>changeState(s)}>{label}</button>)}</div><button className="v2-edit-cancel-full" type="button" onClick={()=>setStateOpen(false)}>CERRAR SIN CAMBIOS</button></div></div>}
 </div>;
}
