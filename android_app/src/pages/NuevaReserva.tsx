import { useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

const MINUTES=['00','15','30','45'];
const HOURS=Array.from({length:15},(_,i)=>String(i+9).padStart(2,'0'));
const todayMadrid=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'});

function changeWheel(list:string[],value:string,delta:number){const i=list.indexOf(value);return list[(i+delta+list.length)%list.length];}

export default function NuevaReserva(){
 const [nombre,setNombre]=useState(''),[telefono,setTelefono]=useState(''),[personas,setPersonas]=useState(2);
 const [fecha,setFecha]=useState(todayMadrid()),[hora,setHora]=useState('13'),[minutos,setMinutos]=useState('15');
 const [mesa,setMesa]=useState(''),[observaciones,setObservaciones]=useState(''),[saving,setSaving]=useState(false);
 const [message,setMessage]=useState(''),[error,setError]=useState('');
 const horaReserva=useMemo(()=>hora+':'+minutos,[hora,minutos]);
 async function guardar(e:React.FormEvent){
  e.preventDefault();setError('');setMessage('');
  if(!nombre.trim()){setError('Introduce el nombre del cliente.');return;}
  const fechaHora=new Date(fecha+'T'+horaReserva+':00');
  if(Number.isNaN(fechaHora.getTime())||fechaHora.getTime()<Date.now()-60000){setError('No puedes crear una reserva con fecha u hora pasada.');return;}
  setSaving(true);
  try{
   if(telefono.trim()){
    const {data:dup,error:de}=await supabase.from('Reservas').select('ReservaID,Turno,Estado').eq('FechaReserva',fecha).eq('Telefono',telefono.trim());
    if(de)throw de;
    const turno=getTurnoFromHora(horaReserva);
    if((dup||[]).some((r:any)=>r.Turno===turno&&!['CANCELADA_CLIENTE','CANCELADA_LOCAL'].includes(r.Estado))){
      setError('Ya existe una reserva activa con este teléfono para ese día y turno.');setSaving(false);return;
    }
   }
   const {data,error:ie}=await supabase.from('Reservas').insert({
    Nombre:nombre.trim(),Telefono:telefono.trim()||null,Personas:personas,FechaReserva:fecha,HoraReserva:horaReserva,
    Turno:getTurnoFromHora(horaReserva),Mesa:mesa.trim()||null,MesasAdicionales:null,Observaciones:observaciones.trim()||null,Estado:'CONFIRMADA'
   }).select('CodigoReserva').single();
   if(ie)throw ie;
   setMessage('RESERVA REALIZADA · CÓDIGO '+(data?.CodigoReserva||'—'));
   setNombre('');setTelefono('');setPersonas(2);setMesa('');setObservaciones('');
  }catch(err:any){console.error(err);setError(err?.message||'No se pudo crear la reserva.');}
  finally{setSaving(false);}
 }
 return <section className="action-screen new-reservation-screen">
  <header className="action-screen-header"><button type="button" className="action-back" onClick={()=>window.history.back()}><ArrowLeft size={24}/></button><h1>HACER RESERVA</h1></header>
  <form className="new-reservation-form" onSubmit={guardar}>
   <label>Nombre<input value={nombre} onChange={e=>setNombre(e.target.value)} placeholder="Nombre del cliente" required/></label>
   <label>Teléfono <span className="optional">(opcional)</span><input value={telefono} onChange={e=>setTelefono(e.target.value)} inputMode="tel" placeholder="Número de teléfono"/></label>
   <div className="new-reservation-row">
    <div className="field-block"><span>Personas</span><div className="people-control"><button type="button" onClick={()=>setPersonas(p=>Math.max(1,p-1))}><Minus size={22}/></button><strong>{personas} PAX</strong><button type="button" onClick={()=>setPersonas(p=>p+1)}><Plus size={22}/></button></div></div>
    <label>Fecha<input type="date" min={todayMadrid()} value={fecha} onChange={e=>setFecha(e.target.value)} required/></label>
   </div>
   <div className="new-reservation-row">
    <div className="field-block"><span>Hora</span><div className="wheel-control"><button type="button" onClick={()=>setHora(changeWheel(HOURS,hora,-1))}>▲</button><strong>{hora}</strong><button type="button" onClick={()=>setHora(changeWheel(HOURS,hora,1))}>▼</button></div></div>
    <div className="field-block"><span>Minutos</span><div className="wheel-control"><button type="button" onClick={()=>setMinutos(changeWheel(MINUTES,minutos,-1))}>▲</button><strong>{minutos}</strong><button type="button" onClick={()=>setMinutos(changeWheel(MINUTES,minutos,1))}>▼</button></div></div>
   </div>
   <label>Mesa asignada<input value={mesa} onChange={e=>setMesa(e.target.value)} placeholder="SIN ASIGNAR"/></label>
   <label>Observaciones<textarea value={observaciones} onChange={e=>setObservaciones(e.target.value)} rows={3} placeholder="Observaciones sobre la reserva"/></label>
   {error&&<div className="form-message form-error">{error}</div>}{message&&<div className="form-message form-success">{message}</div>}
   <button className="create-reservation-button" disabled={saving}>{saving?'GUARDANDO...':'CREAR RESERVA'}</button>
  </form>
 </section>;
}