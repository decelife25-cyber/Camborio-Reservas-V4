import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

const HORAS = ['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
const MINUTOS = ['00','15','30','45'];

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const parseISODate = (iso:string) => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const formatDateES = (iso:string) => { const [y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; };
const isoDate = (d:Date) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

export function Wheel({ values, value, onChange, kind }: { values:string[]; value:string; onChange:(v:string)=>void; kind:'hora'|'minutos' }) {
  const controlRef=useRef<HTMLSpanElement|null>(null);
  const encajeRef=useRef<number|null>(null);
  const ITEM_HEIGHT=32;
  const [indiceVisual,setIndiceVisual]=useState(Math.max(1,values.indexOf(value)+1));

  const limitarIndice=(indice:number)=>{
    return Math.min(Math.max(Math.round(indice),1),values.length);
  };

  const centrarIndice=(indice:number,suave:boolean)=>{
    const control=controlRef.current;
    if(!control)return;
    const scrollTop=(indice*ITEM_HEIGHT)-(control.clientHeight/2)+(ITEM_HEIGHT/2);
    control.scrollTo({top:Math.max(0,scrollTop),behavior:suave?'smooth':'auto'});
  };

  const indiceDesdeScroll=(control:HTMLSpanElement)=>{
    return limitarIndice(
      Math.round((control.scrollTop+(control.clientHeight/2)-(ITEM_HEIGHT/2))/ITEM_HEIGHT)
    );
  };

  const aplicarVisual=(indice:number)=>{
    const limitado=limitarIndice(indice);
    setIndiceVisual(limitado);
    return limitado;
  };

  useEffect(()=>{
    const indice=limitarIndice(values.indexOf(value)+1);
    setIndiceVisual(indice);
    const frame=window.requestAnimationFrame(()=>centrarIndice(indice,false));
    return ()=>window.cancelAnimationFrame(frame);
  },[value,values]);

  useEffect(()=>{
    return ()=>{if(encajeRef.current!==null)window.clearTimeout(encajeRef.current);};
  },[]);

  const programarEncaje=()=>{
    const control=controlRef.current;
    if(!control)return;
    if(encajeRef.current!==null)window.clearTimeout(encajeRef.current);
    aplicarVisual(indiceDesdeScroll(control));
    encajeRef.current=window.setTimeout(()=>{
      const controlActual=controlRef.current;
      if(!controlActual)return;
      const indiceCentral=aplicarVisual(indiceDesdeScroll(controlActual));
      centrarIndice(indiceCentral,false);
      onChange(values[indiceCentral-1]);
      encajeRef.current=null;
    },90);
  };

  const manejarScroll=()=>{
    const control=controlRef.current;
    if(!control)return;
    aplicarVisual(indiceDesdeScroll(control));
    programarEncaje();
  };

  const manejarTecla=(e:React.KeyboardEvent<HTMLSpanElement>)=>{
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
    e.preventDefault();
    const control=controlRef.current;
    if(!control)return;
    const actual=indiceDesdeScroll(control);
    const siguiente=limitarIndice(actual+(e.key==='ArrowDown'?1:-1));
    centrarIndice(siguiente,true);
    window.setTimeout(()=>onChange(values[siguiente-1]),90);
  };

  return <span
    ref={controlRef}
    className="cr-nueva-reserva__rueda"
    data-wheel-kind={kind}
    role="listbox"
    aria-label={kind==='hora'?'Hora':'Minutos'}
    tabIndex={0}
    onScroll={manejarScroll}
    onKeyDown={manejarTecla}
  >
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--vacio" aria-hidden="true"/>
    {values.map((item,index)=>{
      const indice=index+1;
      const distancia=Math.abs(indice-indiceVisual);
      const clase=distancia===0
        ? 'cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--actual'
        : distancia===1
          ? 'cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--cerca'
          : 'cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--lejos';
      return <span key={item} className={clase} role="option" aria-selected={distancia===0?'true':'false'}>{item}</span>;
    })}
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--vacio" aria-hidden="true"/>
  </span>;
}

export default function NuevaReserva(){
  const navigate=useNavigate();
  const borradorInicial=useMemo(()=>{try{const raw=sessionStorage.getItem('camborio_nueva_reserva_borrador');return raw?JSON.parse(raw):null}catch{return null}},[]);
  const[nombre,setNombre]=useState(borradorInicial?.nombre||''),[telefono,setTelefono]=useState(borradorInicial?.telefono||''),[personas,setPersonas]=useState<number>(Number(borradorInicial?.personas||2));
  const[fecha,setFecha]=useState(borradorInicial?.fecha||todayMadrid()),[hora,setHora]=useState(String(borradorInicial?.horaReserva||'13:15').slice(0,2)),[minutos,setMinutos]=useState(String(borradorInicial?.horaReserva||'13:15').slice(3,5));
  const[mesa,setMesa]=useState(borradorInicial?.mesa||''),[mesasAdicionales,setMesasAdicionales]=useState<string[]>(Array.isArray(borradorInicial?.mesasAdicionales)?(borradorInicial.mesasAdicionales as string[]):[]),[observaciones,setObservaciones]=useState(borradorInicial?.observaciones||'');
  const[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [lastCodigo,setLastCodigo]=useState('');
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [calendarMonth,setCalendarMonth]=useState(()=>{const d=parseISODate(todayMadrid());return new Date(d.getFullYear(),d.getMonth(),1)});
  const [calendarDraft,setCalendarDraft]=useState(fecha);
  const horaReserva=useMemo(()=>hora+':'+minutos,[hora,minutos]);

  async function crearReservaBase(){
    setError('');setMessage('');
    if(!nombre.trim()){setError('Introduce el nombre del cliente.');return null;}
    const fechaHora=new Date(fecha+'T'+horaReserva+':00');
    if(Number.isNaN(fechaHora.getTime())||fechaHora.getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return null;}
    if(telefono.trim()){
      const{data:dup,error:de}=await supabase.from('Reservas').select('ReservaID,Turno,Estado').eq('FechaReserva',fecha).eq('Telefono',telefono.trim());
      if(de)throw de;
      const turno=getTurnoFromHora(horaReserva);
      if((dup||[]).some((r:any)=>r.Turno===turno&&!['CANCELADA_CLIENTE','CANCELADA_LOCAL'].includes(r.Estado))){setError('Ya existe una reserva activa con este teléfono para ese día y turno.');return null;}
    }
    const{data,error:ie}=await supabase.from('Reservas').insert({Nombre:nombre.trim(),Telefono:telefono.trim()||null,Personas:personas,FechaReserva:fecha,HoraReserva:horaReserva,Turno:getTurnoFromHora(horaReserva),Mesa:mesa.trim()||null,MesasAdicionales:mesasAdicionales.length?mesasAdicionales.join(', '):null,Observaciones:observaciones.trim()||null,Estado:'CONFIRMADA'}).select('ReservaID,CodigoReserva').single();
    if(ie)throw ie;
    if(!data?.ReservaID)throw new Error('La reserva se creó pero no devolvió su identificador.');
    const codigo=data.CodigoReserva||'—';
    setLastCodigo(codigo);
    setMessage('RESERVA REALIZADA');
    setNombre('');setTelefono('');setPersonas(2);setMesa('');setMesasAdicionales([]);setObservaciones('');try{sessionStorage.removeItem('camborio_nueva_reserva_borrador')}catch{}
    return {ReservaID:data.ReservaID,CodigoReserva:codigo};
  }

  async function guardar(e:React.FormEvent){
    e.preventDefault();
    setSaving(true);
    try{ await crearReservaBase(); }
    catch(err:any){console.error(err);setError(err?.message||'No se pudo crear la reserva.')}
    finally{setSaving(false)}
  }

  async function asignarMesaDesdeNuevaReserva(){
    if(saving)return;
    setError('');setMessage('');
    if(!nombre.trim()){setError('Introduce el nombre del cliente.');return;}
    const fechaHora=new Date(fecha+'T'+horaReserva+':00');
    if(Number.isNaN(fechaHora.getTime())||fechaHora.getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return;}
    try{
      sessionStorage.setItem('camborio_nueva_reserva_borrador',JSON.stringify({nombre:nombre.trim(),telefono:telefono.trim(),personas,fecha,horaReserva,observaciones:observaciones.trim(),mesa:mesa.trim(),mesasAdicionales}));
      navigate('/mesas?nueva=1');
    }catch(err:any){console.error(err);setError(err?.message||'No se pudo abrir la asignación de mesas.')}
  }

  return <section className="cr-nueva-reserva" aria-labelledby="crNuevaReservaTitulo">
    <button className="cr-nueva-reserva__backdrop" type="button" aria-label="Cerrar" onClick={()=>window.history.back()} />
    <div className="cr-nueva-reserva__panel">
      <header className="cr-nueva-reserva__header">
        <div><h2 id="crNuevaReservaTitulo">CREAR NUEVA RESERVA</h2></div>
        <button className="cr-nueva-reserva__cerrar" type="button" onClick={()=>window.history.back()}>X CERRAR</button>
      </header>
      <form className="cr-nueva-reserva__form" onSubmit={guardar}>
        <label className="cr-nueva-reserva__campo-completo">Nombre<input type="text" value={nombre} onChange={e=>setNombre(e.target.value)} autoComplete="name" placeholder="Nombre del cliente" required /></label>
        <label className="cr-nueva-reserva__campo-completo">Teléfono<input type="tel" value={telefono} onChange={e=>setTelefono(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="Número de teléfono" /></label>
        <label className="cr-nueva-reserva__personas">Personas
          <span className="cr-nueva-reserva__contador">
            <button type="button" onClick={()=>setPersonas(p=>Math.max(1,p-1))}>−</button><strong>{personas} PAX</strong><button type="button" onClick={()=>setPersonas(p=>p+1)}>+</button>
          </span>
        </label>
        <label className="cr-nueva-reserva__hora-bloque">Hora<Wheel values={HORAS} value={hora} onChange={setHora} kind="hora"/></label>
        <label className="cr-nueva-reserva__minutos-bloque">Minutos<Wheel values={MINUTOS} value={minutos} onChange={setMinutos} kind="minutos"/></label>
        <label className="cr-nueva-reserva__fecha">Fecha
          <input className="cr-nueva-reserva__fecha-input-oculto" type="date" min={todayMadrid()} value={fecha} onChange={e=>setFecha(e.target.value)} required aria-hidden="true" tabIndex={-1} />
          <button className="cr-nueva-reserva__fecha-boton" type="button" onClick={()=>{setCalendarDraft(fecha);const d=parseISODate(fecha);setCalendarMonth(new Date(d.getFullYear(),d.getMonth(),1));setCalendarOpen(true)}}>{formatDateES(fecha)}<span aria-hidden="true">▾</span></button>
        </label>
        <button className={'cr-nueva-reserva__mesa'+(mesa.trim()?' cr-nueva-reserva__mesa--asignada':'')} type="button" onClick={()=>void asignarMesaDesdeNuevaReserva()} disabled={saving}><span>Mesa asignada</span><strong>{mesa.trim()?('MESA '+mesa.trim()+(mesasAdicionales.length?' (+'+mesasAdicionales.length+')':'')):'SIN ASIGNAR'}</strong></button>
        <label className="cr-nueva-reserva__campo-completo">Observaciones<textarea rows={2} value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Observaciones sobre la reserva"/></label>
        {(error||message)&&<div className="cr-nueva-reserva__mensaje" data-tipo={error?'error':'info'}>{error ? error : <><span>RESERVA REALIZADA · CÓDIGO</span> <strong className="cr-nueva-reserva__codigo-destacado">{lastCodigo||'—'}</strong></>}</div>}
        <div className="cr-nueva-reserva__acciones"><button className="cr-button cr-button--primary" type="submit" disabled={saving}>{saving?'GUARDANDO...':'CREAR RESERVA'}</button></div>
      </form>
      {calendarOpen && <div className="cr-fecha-picker" role="dialog" aria-modal="true" aria-label="Seleccionar fecha">
        <button className="cr-fecha-picker__backdrop" type="button" aria-label="Cerrar calendario" onClick={()=>setCalendarOpen(false)}/>
        <section className="cr-fecha-picker__panel">
          <header className="cr-fecha-picker__header"><div><span>SELECCIONA UNA FECHA</span><strong>{formatDateES(calendarDraft)}</strong></div><button type="button" onClick={()=>setCalendarOpen(false)}>X</button></header>
          <div className="cr-fecha-picker__nav"><button type="button" onClick={()=>setCalendarMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}>‹</button><strong>{calendarMonth.toLocaleDateString('es-ES',{month:'long',year:'numeric'}).toUpperCase()}</strong><button type="button" onClick={()=>setCalendarMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}>›</button></div>
          <div className="cr-fecha-picker__week">{['L','M','X','J','V','S','D'].map(x=><span key={x}>{x}</span>)}</div>
          <div className="cr-fecha-picker__grid">
            {Array.from({length:(calendarMonth.getDay()+6)%7}).map((_,i)=><span key={'e'+i}/>)}
            {Array.from({length:new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+1,0).getDate()}).map((_,i)=>{const d=i+1;const iso=isoDate(new Date(calendarMonth.getFullYear(),calendarMonth.getMonth(),d));const today=iso===todayMadrid();const selected=iso===calendarDraft;const past=iso<todayMadrid();return <button key={iso} type="button" disabled={past} className={(today?'today ':'')+(selected?'selected ':'')+(past?'past':'')} onClick={()=>setCalendarDraft(iso)}>{d}</button>})}
          </div>
          <div className="cr-fecha-picker__actions"><button type="button" onClick={()=>setCalendarOpen(false)}>CANCELAR</button><button type="button" onClick={()=>{setFecha(calendarDraft);setCalendarOpen(false)}}>ACEPTAR</button></div>
        </section>
      </div>}
    </div>
  </section>;
}
