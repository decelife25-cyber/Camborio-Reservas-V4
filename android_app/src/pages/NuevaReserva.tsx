import { useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

const HORAS = ['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
const MINUTOS = ['00','15','30','45'];

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const parseISODate = (iso:string) => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const formatDateES = (iso:string) => { const [y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; };
const isoDate = (d:Date) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

function Wheel({ values, value, onChange, kind }: { values:string[]; value:string; onChange:(v:string)=>void; kind:'hora'|'minutos' }) {
  const touchStart=useRef<number|null>(null);
  const index=Math.max(0,values.indexOf(value));
  const previous=index>0?values[index-1]:kind==='minutos'?values[values.length-1]:'';
  const next=index<values.length-1?values[index+1]:kind==='minutos'?values[0]:'';
  const change=(direction:1|-1)=>{
    let nextIndex=index+direction;
    if(kind==='minutos'){
      if(nextIndex<0)nextIndex=values.length-1;
      if(nextIndex>=values.length)nextIndex=0;
    }else{
      nextIndex=Math.max(0,Math.min(values.length-1,nextIndex));
    }
    const nextValue=values[nextIndex];
    if(nextValue&&nextValue!==value)onChange(nextValue);
  };
  const handleTouchStart=(e:React.TouchEvent<HTMLSpanElement>)=>{
    touchStart.current=e.touches[0]?.clientY??null;
  };
  const handleTouchEnd=(e:React.TouchEvent<HTMLSpanElement>)=>{
    if(touchStart.current===null)return;
    const end=e.changedTouches[0]?.clientY??touchStart.current;
    const delta=touchStart.current-end;
    touchStart.current=null;
    if(Math.abs(delta)<12)return;
    change(delta>0?1:-1);
  };
  const handleWheel=(e:React.WheelEvent<HTMLSpanElement>)=>{
    e.preventDefault();
    if(Math.abs(e.deltaY)<1)return;
    change(e.deltaY>0?1:-1);
  };
  return <span
    className="cr-nueva-reserva__rueda"
    data-wheel-kind={kind}
    role="slider"
    aria-label={kind==='hora'?'Hora':'Minutos'}
    aria-valuetext={value}
    tabIndex={0}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
    onWheel={handleWheel}
    onKeyDown={e=>{if(e.key==='ArrowUp')change(-1);if(e.key==='ArrowDown')change(1)}}
  >
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--cerca">{previous}</span>
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--actual">{value}</span>
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--cerca">{next}</span>
  </span>;
}

export default function NuevaReserva(){
  const[nombre,setNombre]=useState(''),[telefono,setTelefono]=useState(''),[personas,setPersonas]=useState(2);
  const[fecha,setFecha]=useState(todayMadrid()),[hora,setHora]=useState('13'),[minutos,setMinutos]=useState('15');
  const[mesa,setMesa]=useState(''),[observaciones,setObservaciones]=useState('');
  const[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
  const [calendarOpen,setCalendarOpen]=useState(false);
  const [calendarMonth,setCalendarMonth]=useState(()=>{const d=parseISODate(todayMadrid());return new Date(d.getFullYear(),d.getMonth(),1)});
  const [calendarDraft,setCalendarDraft]=useState(fecha);
  const horaReserva=useMemo(()=>hora+':'+minutos,[hora,minutos]);

  async function guardar(e:React.FormEvent){
    e.preventDefault();setError('');setMessage('');
    if(!nombre.trim()){setError('Introduce el nombre del cliente.');return;}
    const fechaHora=new Date(fecha+'T'+horaReserva+':00');
    if(Number.isNaN(fechaHora.getTime())||fechaHora.getTime()<Date.now()-60000){setError('No puedes usar una fecha u hora pasada.');return;}
    setSaving(true);
    try{
      if(telefono.trim()){
        const{data:dup,error:de}=await supabase.from('Reservas').select('ReservaID,Turno,Estado').eq('FechaReserva',fecha).eq('Telefono',telefono.trim());
        if(de)throw de;
        const turno=getTurnoFromHora(horaReserva);
        if((dup||[]).some((r:any)=>r.Turno===turno&&!['CANCELADA_CLIENTE','CANCELADA_LOCAL'].includes(r.Estado))){setError('Ya existe una reserva activa con este teléfono para ese día y turno.');setSaving(false);return;}
      }
      const{data,error:ie}=await supabase.from('Reservas').insert({Nombre:nombre.trim(),Telefono:telefono.trim()||null,Personas:personas,FechaReserva:fecha,HoraReserva:horaReserva,Turno:getTurnoFromHora(horaReserva),Mesa:mesa.trim()||null,MesasAdicionales:null,Observaciones:observaciones.trim()||null,Estado:'CONFIRMADA'}).select('CodigoReserva').single();
      if(ie)throw ie;
      setMessage('RESERVA REALIZADA · CÓDIGO '+(data?.CodigoReserva||'—'));
      setNombre('');setTelefono('');setPersonas(2);setMesa('');setObservaciones('');
    }catch(err:any){console.error(err);setError(err?.message||'No se pudo crear la reserva.')}finally{setSaving(false)}
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
        <button className="cr-nueva-reserva__mesa" type="button" onClick={()=>setMesa('')}><span>Mesa asignada</span><strong>{mesa.trim()?'MESA '+mesa.trim():'SIN ASIGNAR'}</strong></button>
        <label className="cr-nueva-reserva__campo-completo">Observaciones<textarea rows={2} value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Observaciones sobre la reserva"/></label>
        {(error||message)&&<div className="cr-nueva-reserva__mensaje" data-tipo={error?'error':'info'}>{error||message}</div>}
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
