import { useState } from 'react';

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
const parseISODate = (iso:string) => { const [y,m,d]=iso.split('-').map(Number); return new Date(y,m-1,d); };
const isoDate = (d:Date) => d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const formatDateES = (iso:string) => { const [y,m,d]=iso.split('-'); return d+'/'+m+'/'+y; };

export default function FechaPicker({ value, onChange, onClose }:{value:string;onChange:(iso:string)=>void;onClose:()=>void}) {
 const [draft,setDraft]=useState(value);
 const [month,setMonth]=useState(()=>{const d=parseISODate(value);return new Date(d.getFullYear(),d.getMonth(),1)});
 const today=todayMadrid();
 return <div className="cr-fecha-picker" role="dialog" aria-modal="true" aria-label="Seleccionar fecha">
  <button className="cr-fecha-picker__backdrop" type="button" aria-label="Cerrar calendario" onClick={onClose}/>
  <section className="cr-fecha-picker__panel">
   <header className="cr-fecha-picker__header"><div><span>SELECCIONA UNA FECHA</span><strong>{formatDateES(draft)}</strong></div><button type="button" onClick={onClose}>X</button></header>
   <div className="cr-fecha-picker__nav"><button type="button" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()-1,1))}>‹</button><strong>{month.toLocaleDateString('es-ES',{month:'long',year:'numeric'}).toUpperCase()}</strong><button type="button" onClick={()=>setMonth(d=>new Date(d.getFullYear(),d.getMonth()+1,1))}>›</button></div>
   <div className="cr-fecha-picker__week">{['L','M','X','J','V','S','D'].map(x=><span key={x}>{x}</span>)}</div>
   <div className="cr-fecha-picker__grid">
    {Array.from({length:(month.getDay()+6)%7}).map((_,i)=><span key={'e'+i}/>)}
    {Array.from({length:new Date(month.getFullYear(),month.getMonth()+1,0).getDate()}).map((_,i)=>{const d=i+1,iso=isoDate(new Date(month.getFullYear(),month.getMonth(),d)),isToday=iso===today,selected=iso===draft,past=iso<today;return <button key={iso} type="button" disabled={past} className={(isToday?'today ':'')+(selected?'selected ':'')+(past?'past':'')} onClick={()=>setDraft(iso)}>{d}</button>})}
   </div>
   <div className="cr-fecha-picker__actions"><button type="button" onClick={onClose}>CANCELAR</button><button type="button" onClick={()=>{onChange(draft);onClose()}}>ACEPTAR</button></div>
  </section>
 </div>;
}
