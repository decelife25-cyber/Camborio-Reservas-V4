import { useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';
import FechaPicker from './FechaPicker';

export type SearchReservation={ReservaID:string;CodigoReserva:string|null;FechaReserva:string;HoraReserva:string;Nombre:string|null;Telefono:string|null;Personas:number|null;Estado:string;Mesa:string|null;MesasAdicionales?:string|null;Turno?:string|null;Observaciones?:string|null;FechaCreacion?:string|null};

const HORAS=['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
const MINUTOS=['00','15','30','45'];

function dateParts(v:string){const [y,m,d]=String(v||'').split('-').map(Number);if(!y||!m||!d)return{fecha:'--/--',anio:'',dia:'--'};const dt=new Date(y,m-1,d);const dias=['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];return{fecha:String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0'),anio:String(y),dia:dias[dt.getDay()]}}
function stateLabel(s:string){return s.replaceAll('_',' ')}
function isPast(r:SearchReservation){return new Date(r.FechaReserva+'T'+String(r.HoraReserva).slice(0,5)+':00').getTime()<Date.now()}
function isToday(v:string){return v===new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'})}

function Wheel({values,value,onChange,kind}:{values:string[];value:string;onChange:(v:string)=>void;kind:'hora'|'minutos'}){
 const controlRef=useRef<HTMLDivElement|null>(null);
 const [indiceVisual,setIndiceVisual]=useState(Math.max(1,values.indexOf(value)+1));
 const [timer,setTimer]=useState<number|null>(null);
 const itemHeight=32;
 const limitar=(i:number)=>Math.min(Math.max(Math.round(i),1),values.length);
 const centrar=(i:number,suave:boolean)=>{const c=controlRef.current;if(!c)return;c.scrollTo({top:(i*itemHeight)-(c.clientHeight/2)+(itemHeight/2),behavior:suave?'smooth':'auto'});};
 const indiceDesdeScroll=(c:HTMLDivElement)=>limitar(Math.round((c.scrollTop+(c.clientHeight/2)-(itemHeight/2))/itemHeight));
 const encajar=()=>{const c=controlRef.current;if(!c)return;if(timer!==null)window.clearTimeout(timer);setIndiceVisual(indiceDesdeScroll(c));const t=window.setTimeout(()=>{const cc=controlRef.current;if(!cc)return;const n=limitar(indiceDesdeScroll(cc));setIndiceVisual(n);centrar(n,false);onChange(values[n-1]);},90);setTimer(t);};
 return <div ref={controlRef} className="cr-nueva-reserva__rueda cr-ficha-edicion__rueda" data-wheel-kind={kind} role="listbox" tabIndex={0} onScroll={encajar} onKeyDown={e=>{if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;e.preventDefault();const c=controlRef.current;if(!c)return;const n=limitar(indiceDesdeScroll(c)+(e.key==='ArrowDown'?1:-1));centrar(n,true);window.setTimeout(()=>onChange(values[n-1]),90)}}>
   <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--vacio" aria-hidden="true"/>
   {values.map((item,i)=>{const n=i+1,d=Math.abs(n-indiceVisual);return <span key={item} className={'cr-nueva-reserva__rueda-item '+(d===0?'cr-nueva-reserva__rueda-item--actual':d===1?'cr-nueva-reserva__rueda-item--cerca':'cr-nueva-reserva__rueda-item--lejos')} role="option" aria-selected={d===0?'true':'false'}>{item}</span>})}
   <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--vacio" aria-hidden="true"/>
 </div>;
}

export default function SearchReservationCard({reserva:initial,index,total,onNavigate,onUpdated}:{reserva:SearchReservation;index:number;total:number;onNavigate:(d:number)=>void;onUpdated:(r:SearchReservation)=>void}){
 const[r,setR]=useState(initial),[editing,setEditing]=useState<null|'fecha'|'hora'|'personas'|'mesa'|'observaciones'>(null),[value,setValue]=useState(''),[hourDraft,setHourDraft]=useState('13'),[minuteDraft,setMinuteDraft]=useState('15'),[stateOpen,setStateOpen]=useState(false),[saving,setSaving]=useState(false),[dirty,setDirty]=useState(false),[error,setError]=useState('');
 const parts=dateParts(r.FechaReserva),readOnly=['FINALIZADA','CANCELADA_CLIENTE','CANCELADA_LOCAL','NO_PRESENTADO'].includes(r.Estado);

 const persist=async(changes:any)=>{
   const nd=changes.FechaReserva||r.FechaReserva,nt=changes.HoraReserva||String(r.HoraReserva).slice(0,5);
   if((changes.FechaReserva||changes.HoraReserva)&&new Date(nd+'T'+nt+':00').getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return false}
   if(changes.FechaReserva||changes.HoraReserva){changes.Turno=getTurnoFromHora(nt);if(changes.Turno!==r.Turno){changes.Mesa=null;changes.MesasAdicionales=null}}
   setSaving(true);const{data,error:e}=await supabase.from('Reservas').update(changes).eq('ReservaID',r.ReservaID).select('*').single();setSaving(false);
   if(e){setError(e.message);return false}
   const next={...r,...data,...changes} as SearchReservation;setR(next);onUpdated(next);setDirty(true);setEditing(null);return true;
 };

 const edit=(f:typeof editing)=>{
   if(readOnly)return;setError('');setEditing(f);
   if(f==='hora'){const [h,m]=String(r.HoraReserva||'13:15').slice(0,5).split(':');setHourDraft(HORAS.includes(h)?h:'13');setMinuteDraft(MINUTOS.includes(m)?m:'15')}
   if(f==='personas')setValue(String(r.Personas||1));
   if(f==='observaciones')setValue(r.Observaciones||'');
 };

 const changeState=async(nextState:string)=>{
  setError('');
  if(nextState==='SENTADA'){
   if(r.Estado!=='CONFIRMADA'){setError('La reserva debe estar CONFIRMADA para sentarla.');return}
   if(!isToday(r.FechaReserva)){setError('Solo se puede sentar una reserva de HOY.');return}
   if(r.Turno!==getTurnoFromHora(String(r.HoraReserva).slice(0,5))){setError('La reserva pertenece a otro turno.');return}
   if(!r.Mesa&&!r.MesasAdicionales){setError('Debes asignar una mesa antes de sentar la reserva.');return}
  }
  setSaving(true);const{data,error:e}=await supabase.from('Reservas').update({Estado:nextState}).eq('ReservaID',r.ReservaID).select('*').single();setSaving(false);if(e){setError(e.message);return}
  const next={...r,...data,Estado:nextState} as SearchReservation;setR(next);onUpdated(next);setStateOpen(false);setDirty(true);
 };
 const today=isToday(r.FechaReserva),past=isPast(r);
 const stateActions=r.Estado==='PENDIENTE'?[['CONFIRMADA','CONFIRMAR'],['CANCELADA_LOCAL','CANCELAR']]:
  r.Estado==='CONFIRMADA'?(today&&r.Mesa?[['SENTADA','SENTAR'],['CANCELADA_LOCAL','CANCELAR']]:[['CANCELADA_LOCAL','CANCELAR']]):
  r.Estado==='SENTADA'?(past?[['FINALIZADA','FINALIZAR'],['NO_PRESENTADO','NO ASISTIÓ']]:[['FINALIZADA','FINALIZAR']]):[];

 return <div className="cr-busqueda-ficha-wrap">
  <div className="cr-busqueda-ficha__nav">
   <button className="cr-busqueda-ficha__volver" type="button" onClick={()=>window.history.back()}>← VOLVER</button>
   <div className="cr-busqueda-ficha__contador"><button type="button" onClick={()=>onNavigate(-1)} disabled={index===0}>‹</button><span>RESERVA {index+1} DE {total}</span><button type="button" onClick={()=>onNavigate(1)} disabled={index===total-1}>›</button></div>
  </div>
  <article className={'cr-busqueda-ficha cr-busqueda-ficha--'+r.Estado.toLowerCase().replaceAll('_','-')}>
   <div className="cr-busqueda-ficha__cabecera">
    <div className="cr-busqueda-ficha__cliente"><strong><span className="cr-busqueda-ficha__cliente-icon">👤</span>{r.Nombre||'Sin nombre'}</strong><span><span className="cr-busqueda-ficha__telefono-icon">📞</span><span className="cr-busqueda-ficha__telefono">{r.Telefono||'Sin teléfono'}</span><span className="cr-busqueda-ficha__codigo">🏷️ {r.CodigoReserva||'—'}</span></span></div>
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

  {editing==='fecha'&&<FechaPicker value={r.FechaReserva} onChange={v=>{void persist({FechaReserva:v})}} onClose={()=>setEditing(null)}/>}

  {editing==='hora'&&<div className="v2-edit-overlay" onClick={()=>setEditing(null)}><div className="v2-edit-modal cr-ficha-edicion-hora" onClick={e=>e.stopPropagation()}>
    <h3>CAMBIAR HORA</h3>
    <div className="cr-ficha-edicion__ruedas"><label>HORA<Wheel values={HORAS} value={hourDraft} onChange={setHourDraft} kind="hora"/></label><label>MINUTOS<Wheel values={MINUTOS} value={minuteDraft} onChange={setMinuteDraft} kind="minutos"/></label></div>
    <div className="v2-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={()=>{void persist({HoraReserva:hourDraft+':'+minuteDraft})}}>ACEPTAR</button></div>
  </div></div>}

  {editing==='personas'&&<div className="v2-edit-overlay" onClick={()=>setEditing(null)}><div className="v2-edit-modal cr-ficha-edicion-pax" onClick={e=>e.stopPropagation()}>
    <h3>CAMBIAR PAX</h3>
    <div className="cr-nueva-reserva__contador cr-ficha-edicion__contador"><button type="button" onClick={()=>setValue(String(Math.max(1,Number(value||1)-1)))}>−</button><strong>{Number(value||1)} PAX</strong><button type="button" onClick={()=>setValue(String(Number(value||1)+1))}>+</button></div>
    <div className="v2-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={()=>{void persist({Personas:Math.max(1,Number(value)||1)})}}>ACEPTAR</button></div>
  </div></div>}

  {editing==='observaciones'&&<div className="v2-edit-overlay" onClick={()=>setEditing(null)}><div className="v2-edit-modal" onClick={e=>e.stopPropagation()}>
    <h3>OBSERVACIONES</h3><textarea rows={4} value={value} onChange={e=>setValue(e.target.value)}/>
    <div className="v2-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={()=>{void persist({Observaciones:value.trim()||null})}}>ACEPTAR</button></div>
  </div></div>}

  {editing==='mesa'&&<div className="v2-edit-overlay" onClick={()=>setEditing(null)}><div className="v2-edit-modal" onClick={e=>e.stopPropagation()}>
    <h3>MESA ASIGNADA</h3><div className="v2-state-current">{r.Mesa?'MESA '+r.Mesa:'SIN ASIGNAR'}</div>
    <div className="v2-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CERRAR</button><button type="button" onClick={()=>{setEditing(null);window.location.href='/mesas?asignar='+encodeURIComponent(r.ReservaID)}}>CAMBIAR MESAS</button></div>
  </div></div>}

  {stateOpen&&<div className="v2-edit-overlay" onClick={()=>setStateOpen(false)}><div className="v2-edit-modal v2-state-modal" onClick={e=>e.stopPropagation()}>
    <h3>CAMBIAR ESTADO</h3><div className={'v2-state-current status-modal-'+r.Estado.toLowerCase().replaceAll('_','-')}>{stateLabel(r.Estado)}</div>
    {error&&<div className="cr-nueva-reserva__mensaje" data-tipo="error">{error}</div>}
    <div className="v2-edit-actions">{stateActions.map(([s,label])=><button key={s} type="button" onClick={()=>changeState(s)}>{label}</button>)}</div>
    <button className="v2-edit-cancel-full" type="button" onClick={()=>setStateOpen(false)}>CERRAR SIN CAMBIOS</button>
  </div></div>}
 </div>;
}