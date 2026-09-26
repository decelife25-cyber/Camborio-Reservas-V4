import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';
import FechaPicker from './FechaPicker';
import { Wheel } from '../pages/NuevaReserva';

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
  const[confirmAction,setConfirmAction]=useState<null|'guardar'|'salir'|'resultado'|'mesas'>(null);
  const[resultado,setResultado]=useState('');

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
    setR(next);onUpdated(next);setDirty(false);setResultado('CAMBIOS GUARDADOS CORRECTAMENTE');setConfirmAction('resultado');setError('');
  };

  const changeState=async(nextState:string)=>{
    if(saving||readOnly)return;
    if(nextState==='SENTADA'&&!r.Mesa){setStateOpen(false);navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||'')+'&accion=sentar');return;}
    setSaving(true);
    let data:any=null;
    if(nextState==='SENTADA' && r.Estado==='PENDIENTE'){
      const confirmacion=await supabase.from('Reservas').update({Estado:'CONFIRMADA',FechaModificacion:new Date().toISOString()}).eq('ReservaID',r.ReservaID).select('*').single();
      if(confirmacion.error){setSaving(false);setError(confirmacion.error.message);return;}
      data=confirmacion.data;
    }
    const resultado=await supabase.from('Reservas').update({Estado:nextState,FechaEstado:new Date().toISOString(),FechaModificacion:new Date().toISOString()}).eq('ReservaID',r.ReservaID).select('*').single();
    setSaving(false);
    if(resultado.error){setError(resultado.error.message);return;}
    data=resultado.data;
    const next={...r,...data,Estado:nextState} as SearchReservation;
    setR(next);onUpdated(next);setStateOpen(false);setDirty(false);setResultado('ESTADO CAMBIADO CORRECTAMENTE');setConfirmAction('resultado');setError('');
  };

  const stateActions= r.Estado==='PENDIENTE'
    ? [['CONFIRMADA','CONFIRMAR'],['CANCELADA_LOCAL','CANCELAR']]
    : r.Estado==='CONFIRMADA'
      ? (r.FechaReserva===todayMadrid()&&r.Mesa?[['SENTADA','SENTAR'],['CANCELADA_LOCAL','CANCELAR']]:[['CANCELADA_LOCAL','CANCELAR']])
      : r.Estado==='SENTADA'
        ? [['FINALIZADA','FINALIZAR']]
        : [];

  const solicitarGuardar=()=>{
    if(!dirty||saving||readOnly)return;
    setConfirmAction('guardar');
  };

  const volver=()=>{
    if(dirty){setConfirmAction('salir');return;}
    window.history.back();
  };

  const openMesa=()=>{
    if(readOnly)return;
    const mesas=[r.Mesa,...String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean)].filter(Boolean);
    if(!mesas.length){navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||''));return;}
    setConfirmAction('mesas');
  };

  return <div className="cr-busqueda-ficha-wrap">
    <div className="cr-busqueda-ficha__nav">
      <button className="cr-busqueda-ficha__volver" type="button" onClick={volver}>← VOLVER</button>
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
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--mesa" type="button" disabled={readOnly} onClick={openMesa}><span>MESA</span><strong className={!r.Mesa?'cr-busqueda-ficha__mesa-sin-asignar':''}>{r.Mesa ? String(r.Mesa)+(String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean).length ? ' (+'+String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean).length+')' : '') : 'SIN ASIGNAR'}</strong></button>
      </div>

      <button className="cr-busqueda-ficha__observaciones" type="button" disabled={readOnly||sentada} onClick={()=>edit('observaciones')}><span>OBSERVACIONES</span><p>{r.Observaciones||'Sin observaciones.'}</p></button>
      {r.FechaCreacion&&<span className="cr-busqueda-ficha__creada">📅 Creada: {String(r.FechaCreacion).replace('T',' · ').slice(0,19)}</span>}
      {error&&<div className="cr-nueva-reserva__mensaje" data-tipo="error">{error}</div>}
      <button className="cr-busqueda-ficha__guardar" type="button" disabled={!dirty||saving||readOnly} onClick={solicitarGuardar}>{saving?'GUARDANDO...':'GUARDAR CAMBIOS'}</button>
    </article>

    {editing==='fecha'&&<FechaPicker value={value} onChange={v=>{setValue(v);setR(prev=>({...prev,FechaReserva:v}));setDirty(true);setEditing(null)}} onClose={()=>setEditing(null)}/>}
    {editing && editing!=='fecha'&&<div className="v2-edit-overlay" onClick={()=>setEditing(null)}>
      <div className="v2-edit-modal ficha-edit-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">{editing==='hora'?'CAMBIAR HORA':editing==='personas'?'CAMBIAR PAX':'OBSERVACIONES'}</p>
        {editing==='hora'
          ? <div className="ficha-time-picker"><label>HORA<Wheel values={['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23']} value={(value.split(':')[0]||'13')} onChange={v=>setValue(v+':'+(value.split(':')[1]||'00'))} kind="hora"/></label><label>MINUTOS<Wheel values={['00','15','30','45']} value={(value.split(':')[1]||'00')} onChange={v=>setValue((value.split(':')[0]||'13')+':'+v)} kind="minutos"/></label></div>
          : editing==='personas'
            ? <div className="v2-personas-control ficha-pax-control"><button type="button" onClick={()=>setValue(String(Math.max(1,Number(value||1)-1)))}>−</button><strong>{Number(value||1)} PAX</strong><button type="button" onClick={()=>setValue(String(Number(value||1)+1))}>+</button></div>
            : <textarea className="ficha-observaciones-input" rows={4} value={value} onChange={e=>setValue(e.target.value)}/>}
        <div className="v2-edit-actions ficha-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={acceptEdit}>ACEPTAR</button></div>
      </div>
    </div>}

    {confirmAction&&<div className="v2-edit-overlay" onClick={()=>!saving&&confirmAction!=='resultado'&&setConfirmAction(null)}>
      <div className="v2-edit-modal ficha-edit-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">{confirmAction==='guardar'?'CONFIRMAR CAMBIOS':confirmAction==='salir'?'CAMBIOS SIN GUARDAR':'OPERACIÓN REALIZADA'}</p>
        <div className="cr-confirmacion-mesa__contenido">{confirmAction==='guardar'?'¿CONFIRMAR LOS CAMBIOS REALIZADOS EN ESTA RESERVA?':confirmAction==='salir'?'SI SALES AHORA, SE PERDERÁN LOS CAMBIOS REALIZADOS.':resultado}</div>
        <div className="v2-edit-actions ficha-edit-actions ficha-result-actions">
          {confirmAction!=='resultado'&&<button type="button" onClick={()=>setConfirmAction(null)}>{confirmAction==='guardar'?'CANCELAR':'SEGUIR EDITANDO'}</button>}
          <button type="button" onClick={()=>{if(confirmAction==='guardar'){setConfirmAction(null);void save();}else if(confirmAction==='salir'){setConfirmAction(null);setDirty(false);window.history.back();}else{setConfirmAction(null);}}}>{confirmAction==='guardar'?'CONFIRMAR':confirmAction==='salir'?'SALIR SIN GUARDAR':'ACEPTAR'}</button>
        </div>
      </div>
    </div>}

    {confirmAction==='mesas'&&<div className="v2-edit-overlay" onClick={()=>setConfirmAction(null)}>
      <div className="v2-edit-modal ficha-edit-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">MESAS ASIGNADAS</p>
        <div className="v2-state-current">{String(r.Mesa)+(String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean).length ? ' (+'+String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean).length+')' : '')}</div>
        <div className="cr-confirmacion-mesa__contenido">¿QUIERES CAMBIAR LAS MESAS ASIGNADAS?</div>
        <div className="v2-edit-actions ficha-state-actions">
          <button type="button" onClick={()=>setConfirmAction(null)}>NO</button>
          <button type="button" onClick={()=>{setConfirmAction(null);navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||''));}}>CAMBIAR MESAS</button>
        </div>
      </div>
    </div>}
    {stateOpen&&<div className="v2-edit-overlay" onClick={()=>setStateOpen(false)}>
      <div className="v2-edit-modal ficha-edit-modal ficha-state-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">CAMBIAR ESTADO</p>
        <div className="cr-confirmacion-mesa__texto v2-state-current ficha-state-current">{stateLabel(r.Estado)}</div>
        <div className="v2-edit-actions ficha-state-actions">{stateActions.map(([s,label])=><button className={"ficha-state-button ficha-state-button--"+String(s).toLowerCase().replaceAll("_","-")} key={s} type="button" disabled={saving} onClick={()=>void changeState(s)}>{label}</button>)}</div>
        <button className="cr-confirmacion-mesa__boton v2-edit-cancel-full" type="button" onClick={()=>setStateOpen(false)}>CERRAR SIN CAMBIOS</button>
      </div>
    </div>}
  </div>;
}
