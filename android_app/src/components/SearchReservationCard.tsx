import { mostrarTelefono } from '../utils/phone';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { sendAuthorizedConfirmationEmail } from '../services/reservationEmail';
import { getTurnoFromHora } from '../utils/shifts';
import { getReservationStateActions } from '../utils/reservationStateActions';
import FechaPicker from './FechaPicker';
import { HoraMinutosPicker } from '../pages/NuevaReserva';
export type SearchReservation = {
  ReservaID:string; CodigoReserva:string|null; FechaReserva:string; HoraReserva:string;
  Nombre:string|null; Telefono:string|null; Email?:string|null; EmailReservaAutorizado?:boolean|null; Personas:number|null; Estado:string;
  Mesa:string|null; MesasAdicionales?:string|null; Turno?:string|null;
  Observaciones?:string|null; FechaCreacion?:string|null;
  ClienteSinReserva?:boolean|string|null; OrigenReserva?:string|null; ClienteID?:string|null;
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
function mesaValida(mesa:string|null){
  const v=String(mesa||'').trim().toUpperCase();
  return Boolean(v && !['SIN ASIGNAR','NULL','UNDEFINED'].includes(v));
}
function horaMadrid(){return new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date());}
function esFechaPasada(fecha:string,hora:string){const hoy=todayMadrid();const h=String(hora||'').slice(0,5);return fecha<hoy||(fecha===hoy&&h<horaMadrid());}

export default function SearchReservationCard({reserva:initial,index,total,onNavigate,onUpdated}:{reserva:SearchReservation;index:number;total:number;onNavigate:(d:number)=>void;onUpdated:(r:SearchReservation)=>void}){
  const navigate=useNavigate();
  const[r,setR]=useState(initial);
  const[editing,setEditing]=useState<null|'fecha'|'hora'|'personas'|'observaciones'>(null);
  const[value,setValue]=useState('');
  const[stateOpen,setStateOpen]=useState(false);
  const[lightTheme,setLightTheme]=useState(()=>document.documentElement.classList.contains('light'));
  useEffect(()=>{const sync=()=>setLightTheme(document.documentElement.classList.contains('light'));sync();window.addEventListener('camborio-theme-change',sync);return()=>window.removeEventListener('camborio-theme-change',sync)},[]);
  const[saving,setSaving]=useState(false);
  const[dirty,setDirty]=useState(false);
  const[error,setError]=useState('');
  const[confirmAction,setConfirmAction]=useState<null|'guardar'|'salir'|'resultado'|'mesas'>(null);
  const[resultado,setResultado]=useState('');
  const[contextChange,setContextChange]=useState<null|{available:boolean;conflictMesa:string|null;fecha:string;hora:string;turno:string}>(null);

  const parts=dateParts(r.FechaReserva);
  const nombreNormalizado=String(r.Nombre||'').trim().toUpperCase().replace(/\s+/g,' ');
  const telefonoNormalizado=String(r.Telefono||'').trim().toUpperCase().replace(/\s+/g,' ');
  const clienteSinReserva=r.ClienteSinReserva===true||String(r.ClienteSinReserva||'').trim().toLowerCase()==='true';
  const origenNormalizado=String(r.OrigenReserva||'').trim().toUpperCase().replace(/[\s-]+/g,'_');
  const esSinReserva=clienteSinReserva||((origenNormalizado==='SIN_RESERVA'||origenNormalizado==='PRIVADO_SIN_RESERVA')&&(nombreNormalizado==='SIN RESERVA'||nombreNormalizado==='CLIENTE SIN RESERVA'))||(origenNormalizado==='PRIVADO'&&(nombreNormalizado==='SIN RESERVA'||nombreNormalizado==='CLIENTE SIN RESERVA')&&(!telefonoNormalizado||telefonoNormalizado==='SIN TELÉFONO'||telefonoNormalizado==='SIN TELEFONO'));
  const readOnly=['FINALIZADA','CANCELADA_CLIENTE','CANCELADA_LOCAL','NO_PRESENTADO'].includes(r.Estado);
  const sentada=r.Estado==='SENTADA';
  const edit=(field:typeof editing)=>{
    if(readOnly||sentada||esSinReserva)return;
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

  const assignedTables=()=>[r.Mesa,...String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean)].filter(Boolean).map(String);

  const persistContextChange=async(mantenerMesas:boolean,after?:'mesas')=>{
    const fecha=r.FechaReserva;
    const hora=String(r.HoraReserva).slice(0,5);
    const turnoNuevo=getTurnoFromHora(hora);
    setSaving(true);
    const{data,error:e}=await supabase.rpc('cr_actualizar_contexto_reserva_atomico',{
      p_reserva_id:r.ReservaID,
      p_fecha:fecha,
      p_hora:hora,
      p_turno:turnoNuevo,
      p_personas:r.Personas||1,
      p_observaciones:r.Observaciones||null,
      p_mantener_mesas:mantenerMesas,
    });
    setSaving(false);
    if(e){
      if(String(e.message||'').includes('CR_COLISION_MESA')){
        const match=String(e.message).match(/CR_COLISION_MESA:\s*la mesa\s+(.+?)\s+ya está asignada a otra reserva/i);
        setContextChange({
          available:false,
          conflictMesa:match?.[1]||null,
          fecha,
          hora,
          turno:turnoNuevo,
        });
        setError('');
      }else{
        setError(e.message);
      }
      return;
    }
    const next={...r,...data} as SearchReservation;
    setR(next);
    onUpdated(next);
    setDirty(false);
    setContextChange(null);
    setError('');
    if(after==='mesas'){
      navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||''));
      return;
    }
    setResultado(mantenerMesas?'CAMBIOS GUARDADOS. SE HA MANTENIDO LA MISMA MESA.':'CAMBIOS GUARDADOS. LA RESERVA HA QUEDADO SIN ASIGNAR.');
    setConfirmAction('resultado');
  };

  const save=async()=>{
    if(!dirty||saving||readOnly||esSinReserva)return;
    const fecha=r.FechaReserva;
    const hora=String(r.HoraReserva).slice(0,5);
    if(new Date(fecha+'T'+hora+':00').getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return;}
    const turnoNuevo=getTurnoFromHora(hora);
    const cambiaContexto=fecha!==initial.FechaReserva||turnoNuevo!==initial.Turno;
    const mesas=assignedTables();

    if(cambiaContexto&&mesas.length){
      setSaving(true);
      const{data,error:e}=await supabase
        .from('Reservas')
        .select('ReservaID,Mesa,MesasAdicionales')
        .eq('FechaReserva',fecha)
        .eq('Turno',turnoNuevo)
        .in('Estado',['PENDIENTE','CONFIRMADA','SENTADA'])
        .neq('ReservaID',r.ReservaID);
      setSaving(false);
      if(e){setError(e.message);return;}

      const conflicto=(data||[]).flatMap(row=>[row.Mesa,...String(row.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean)])
        .map(v=>String(v||'').trim())
        .find(mesa=>mesas.includes(mesa));

      setContextChange({
        available:!conflicto,
        conflictMesa:conflicto||null,
        fecha,
        hora,
        turno:turnoNuevo,
      });
      setError('');
      return;
    }

    await persistContextChange(!cambiaContexto);
  };

  const changeState=async(nextState:string)=>{
    if(saving||readOnly)return;
    setError('');

    if(nextState==='CONFIRMADA' && r.Estado!=='PENDIENTE'){
      setError('Solo se pueden confirmar reservas pendientes.');
      return;
    }
    if(nextState==='SENTADA'){
      if(!['PENDIENTE','CONFIRMADA'].includes(r.Estado)){setError('Solo se pueden sentar reservas pendientes o confirmadas.');return;}
      if(!mesaValida(r.Mesa)){setStateOpen(false);navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||'')+'&accion=sentar');return;}
    }
    if(nextState==='CANCELADA_LOCAL' && !['PENDIENTE','CONFIRMADA'].includes(r.Estado)){
      setError('Esta reserva no se puede cancelar desde esta ficha.');return;
    }
    if(nextState==='FINALIZADA'){
      if(r.Estado==='SENTADA'){
        // Permitido según V2.
      }else if(['PENDIENTE','CONFIRMADA'].includes(r.Estado) && esFechaPasada(r.FechaReserva,String(r.HoraReserva).slice(0,5))){
        // V2 permite finalizar reservas activas que ya quedaron atrás.
      }else{
        setError('Solo se pueden finalizar reservas sentadas o reservas activas ya pasadas.');return;
      }
    }
    if(nextState==='NO_PRESENTADO'){
      if(!['PENDIENTE','CONFIRMADA','SENTADA'].includes(r.Estado) || !esFechaPasada(r.FechaReserva,String(r.HoraReserva).slice(0,5))){
        setError('Solo se puede marcar NO ASISTIÓ en una reserva activa ya pasada.');return;
      }
    }

    setSaving(true);
    const ahora=new Date().toISOString();
    const resultado=await supabase.from('Reservas').update({Estado:nextState,FechaEstado:ahora,FechaModificacion:ahora}).eq('ReservaID',r.ReservaID).select('*').single();
    setSaving(false);
    if(resultado.error){setError(resultado.error.message);return;}
    const next={...r,...resultado.data,Estado:nextState} as SearchReservation;
    setR(next);onUpdated(next);
    if(r.Estado==='PENDIENTE' && nextState==='CONFIRMADA' && resultado.data?.EmailReservaAutorizado===true && resultado.data?.Email){
      try {
        await sendAuthorizedConfirmationEmail(r.ReservaID);
      } catch (emailError) {
        console.warn('Reserva confirmada, pero no se pudo enviar el email de confirmación', emailError);
        setError('Reserva confirmada, pero no se pudo enviar el email de confirmación.');
      }
    }
    if(r.Estado==='PENDIENTE' && nextState!=='PENDIENTE'){
      window.dispatchEvent(new Event('camborio-pending-count-change'));
    }
    setStateOpen(false);setDirty(false);setError('');
  };

  const stateActions = getReservationStateActions({
    estado: r.Estado,
    fecha: r.FechaReserva,
    hora: r.HoraReserva,
    turno: r.Turno,
    esSinReserva,
  });

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
          <span><span className="cr-busqueda-ficha__telefono-icon">📞</span><span className="cr-busqueda-ficha__telefono">{mostrarTelefono(r.Telefono)}</span>{esSinReserva?<span className="cr-busqueda-ficha__codigo cr-busqueda-ficha__codigo--sin-reserva">{r.CodigoReserva||'—'}</span>:r.CodigoReserva&&<button type="button" className="cr-busqueda-ficha__codigo" onClick={e=>{e.stopPropagation();navigate('/buscar?codigo='+encodeURIComponent(r.CodigoReserva||''));}}>🏷️ {r.CodigoReserva}</button>}</span>
        </div>
        <button className="cr-busqueda-ficha__estado" type="button" onClick={()=>!readOnly&&setStateOpen(true)} disabled={readOnly}>{stateLabel(r.Estado)}{!readOnly?' ▼':''}</button>
      </div>

      <div className="cr-busqueda-ficha__bloques">
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--fecha" type="button" disabled={readOnly||sentada||esSinReserva} onClick={()=>edit('fecha')}><strong>{parts.fecha}</strong><em>{parts.anio}</em></button>
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--hora" type="button" disabled={readOnly||sentada||esSinReserva} onClick={()=>edit('hora')}><strong>{parts.dia}</strong><em>{String(r.HoraReserva||'').slice(0,5)}</em></button>
        <button className="cr-busqueda-ficha__bloque cr-busqueda-ficha__bloque--pax" type="button" disabled={readOnly||sentada||esSinReserva} onClick={()=>edit('personas')}><strong>{r.Personas||0} PAX</strong></button>
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
          ? <div className="ficha-time-picker"><HoraMinutosPicker
            hora={value.split(':')[0]||'13'}
            minutos={value.split(':')[1]||'00'}
            onHoraChange={v=>setValue(v+':'+(value.split(':')[1]||'00'))}
            onMinutosChange={v=>setValue((value.split(':')[0]||'13')+':'+v)}
          /></div>
          : editing==='personas'
            ? <div className="v2-personas-control ficha-pax-control"><button type="button" onClick={()=>setValue(String(Math.max(1,Number(value||1)-1)))}>−</button><strong>{Number(value||1)} PAX</strong><button type="button" onClick={()=>setValue(String(Number(value||1)+1))}>+</button></div>
            : <textarea className="ficha-observaciones-input" rows={4} value={value} onChange={e=>setValue(e.target.value)}/>}
        <div className="v2-edit-actions ficha-edit-actions"><button type="button" onClick={()=>setEditing(null)}>CANCELAR</button><button type="button" onClick={acceptEdit}>ACEPTAR</button></div>
      </div>
    </div>}

    {contextChange&&<div className="v2-edit-overlay" onClick={()=>!saving&&setContextChange(null)}>
      <div className="v2-edit-modal ficha-edit-modal" onClick={e=>e.stopPropagation()}>
        <p className="cr-confirmacion-mesa__eyebrow">{contextChange.available?'MESA DISPONIBLE':'MESA NO DISPONIBLE'}</p>
        <div className="cr-confirmacion-mesa__contenido">
          {contextChange.available
            ? <>La reserva cambia a <strong>{contextChange.fecha} · {contextChange.turno}</strong> y la {assignedTables().length>1?'asignación de mesas':'mesa'} {assignedTables().join(', ')} está disponible.<br/><br/>¿Quieres mantener la misma {assignedTables().length>1?'asignación de mesas':'mesa'}?</>
            : <>LA MESA {contextChange.conflictMesa} YA ESTÁ ASIGNADA A OTRA RESERVA.<br/><br/>DEBES CAMBIAR DE MESA O DEJARLA SIN ASIGNAR.</>}
        </div>
        <div className="v2-edit-actions ficha-edit-actions ficha-result-actions">
          <button type="button" onClick={()=>setContextChange(null)} disabled={saving}>CANCELAR</button>
          {contextChange.available
            ? <>
                <button type="button" onClick={()=>void persistContextChange(false)} disabled={saving}>DEJAR SIN ASIGNAR</button>
                <button type="button" onClick={()=>void persistContextChange(true)} disabled={saving}>{saving?'GUARDANDO...':'MANTENER MESA'}</button>
              </>
            : <>
                <button type="button" onClick={()=>void persistContextChange(false)} disabled={saving}>DEJAR SIN ASIGNAR</button>
                <button type="button" onClick={()=>void persistContextChange(false,'mesas')} disabled={saving}>CAMBIAR MESA</button>
              </>}
        </div>
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
        <div className="cr-confirmacion-mesa__contenido cr-mesas-asignadas-modal__numeros">{[r.Mesa,...String(r.MesasAdicionales||'').split(',').map(v=>v.trim()).filter(Boolean)].filter(Boolean).join(' · ')}</div>
        <div className="v2-edit-actions ficha-edit-actions ficha-result-actions">
          <button className="cr-confirmacion-mesa__boton cr-confirmacion-mesa__boton--cancelar" type="button" onClick={()=>setConfirmAction(null)}>CERRAR</button>
          <button className="cr-confirmacion-mesa__boton cr-confirmacion-mesa__boton--aceptar" type="button" onClick={()=>{setConfirmAction(null);navigate('/mesas?asignar='+encodeURIComponent(r.ReservaID)+'&volverCodigo='+encodeURIComponent(r.CodigoReserva||''));}}>CAMBIAR MESAS</button>
        </div>
      </div>
    </div>}
    {stateOpen&&<div className="v2-edit-overlay" onClick={()=>setStateOpen(false)}>
      <div className={"v2-edit-modal v2-state-modal"+(lightTheme?" light-theme":"")} onClick={e=>e.stopPropagation()}>
        <h3>CAMBIAR ESTADO</h3>
        <div className={"v2-state-current ficha-state-current status-modal-"+r.Estado.toLowerCase().replaceAll("_","-")}>{stateLabel(r.Estado)}</div>
        <div className="v2-edit-actions ficha-state-actions">{stateActions.map(([s,label,kind])=><button className={"ficha-state-button ficha-state-button--"+String(kind||s).toLowerCase().replaceAll("_","-")} key={s} type="button" disabled={saving} onClick={()=>void changeState(s)}>{label}</button>)}</div>
        <button className="v2-edit-cancel-full" type="button" onClick={()=>setStateOpen(false)}>CERRAR SIN CAMBIOS</button>
      </div>
    </div>}
  </div>;
}
