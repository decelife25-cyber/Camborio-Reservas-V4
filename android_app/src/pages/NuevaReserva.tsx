import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

const HORAS = ['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
const MINUTOS = ['00','15','30','45'];

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

function Wheel({ values, value, onChange, kind }: { values:string[]; value:string; onChange:(v:string)=>void; kind:'hora'|'minutos' }) {
  const ref=useRef<HTMLSpanElement>(null);
  const [near,setNear]=useState<string[]>([]);
  const itemH=44;
  const sync=(smooth:boolean)=>{
    const el=ref.current;if(!el)return;
    const idx=Math.max(0,values.indexOf(value));
    el.scrollTo({top:(idx+1)*itemH,behavior:smooth?'smooth':'auto'});
  };
  useEffect(()=>sync(false),[value]);
  useEffect(()=>{
    const el=ref.current;if(!el)return;
    const onScroll=()=>{
      const idx=Math.max(0,Math.min(values.length-1,Math.round((el.scrollTop)/itemH)-1));
      const around=[values[idx-1],values[idx+1]].filter(Boolean);
      setNear(around);
      const snapped=values[idx];
      if(snapped&&snapped!==value)onChange(snapped);
    };
    el.addEventListener('scroll',onScroll,{passive:true});
    return()=>el.removeEventListener('scroll',onScroll);
  },[value,values]);
  return <span className="cr-nueva-reserva__rueda" data-wheel-kind={kind} ref={ref}>
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--vacio" />
    {values.map(v=><span key={v} className={'cr-nueva-reserva__rueda-item '+(v===value?'cr-nueva-reserva__rueda-item--actual':near.includes(v)?'cr-nueva-reserva__rueda-item--cerca':'cr-nueva-reserva__rueda-item--lejos')}>{v}</span>)}
    <span className="cr-nueva-reserva__rueda-item cr-nueva-reserva__rueda-item--vacio" />
  </span>;
}

export default function NuevaReserva(){
  const[nombre,setNombre]=useState(''),[telefono,setTelefono]=useState(''),[personas,setPersonas]=useState(2);
  const[fecha,setFecha]=useState(todayMadrid()),[hora,setHora]=useState('13'),[minutos,setMinutos]=useState('15');
  const[mesa,setMesa]=useState(''),[observaciones,setObservaciones]=useState('');
  const[saving,setSaving]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');
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
        <label className="cr-nueva-reserva__fecha">Fecha<input type="date" min={todayMadrid()} value={fecha} onChange={e=>setFecha(e.target.value)} required /></label>
        <button className="cr-nueva-reserva__mesa" type="button" onClick={()=>setMesa('')}><span>Mesa asignada</span><strong>{mesa.trim()?'MESA '+mesa.trim():'SIN ASIGNAR'}</strong></button>
        <label className="cr-nueva-reserva__campo-completo">Observaciones<textarea rows={2} value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Observaciones sobre la reserva"/></label>
        {(error||message)&&<div className="cr-nueva-reserva__mensaje" data-tipo={error?'error':'info'}>{error||message}</div>}
        <div className="cr-nueva-reserva__acciones"><button className="cr-button cr-button--primary" type="submit" disabled={saving}>{saving?'GUARDANDO...':'CREAR RESERVA'}</button></div>
      </form>
    </div>
  </section>;
}
