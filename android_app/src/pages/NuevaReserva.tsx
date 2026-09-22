import { useMemo, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import FechaPicker from '../components/FechaPicker';
import { getTurnoFromHora } from '../utils/shifts';

const HORAS = ['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
const MINUTOS = ['00','15','30','45'];

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const isoDate = (d:Date) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

function Wheel({ values, value, onChange, kind }: { values:string[]; value:string; onChange:(v:string)=>void; kind:'hora'|'minutos' }) {
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
          <button className="cr-nueva-reserva__fecha-boton" type="button" onClick={()=>setCalendarOpen(true)}>{formatDateES(fecha)}<span aria-hidden="true">▾</span></button>
        </label>
        <button className="cr-nueva-reserva__mesa" type="button" onClick={()=>setMesa('')}><span>Mesa asignada</span><strong>{mesa.trim()?'MESA '+mesa.trim():'SIN ASIGNAR'}</strong></button>
        <label className="cr-nueva-reserva__campo-completo">Observaciones<textarea rows={2} value={observaciones} onChange={e=>setObservaciones(e.target.value)} placeholder="Observaciones sobre la reserva"/></label>
        {(error||message)&&<div className="cr-nueva-reserva__mensaje" data-tipo={error?'error':'info'}>{error||message}</div>}
        <div className="cr-nueva-reserva__acciones"><button className="cr-button cr-button--primary" type="submit" disabled={saving}>{saving?'GUARDANDO...':'CREAR RESERVA'}</button></div>
      </form>
      {calendarOpen && <FechaPicker value={fecha} onChange={setFecha} onClose={() => setCalendarOpen(false)} />}\n    </div>\n  </section>;ef, useState } from 'react';
import { supabase } from '../lib/supabase';
import FechaPicker from '../components/FechaPicker';
import { getTurnoFromHora } from '../utils/shifts';

const HORAS = ['09','10','11','12','13','14','15','16','17','18','19','20','21','22','23'];
const MINUTOS = ['00','15','30','45'];

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const parseISODate = (iso:string) => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const formatDateES = (iso:string) => { const [y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; };
const isoDate = (d:Date) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');

function Wheel({ values, value, onChange, kind }: { values:string[]; value:string; onChange:(v:string)=>void; kind:'hora'|'minutos' }) {
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
