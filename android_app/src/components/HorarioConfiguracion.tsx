import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Moon, Sun } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Servicio='COMIDA'|'CENA';
type Dia='Lunes'|'Martes'|'Miércoles'|'Jueves'|'Viernes'|'Sábado'|'Domingo';
const DIAS:Array<{nombre:Dia;corto:string}>= [
 {nombre:'Lunes',corto:'LUN'},{nombre:'Martes',corto:'MAR'},{nombre:'Miércoles',corto:'MIÉ'},
 {nombre:'Jueves',corto:'JUE'},{nombre:'Viernes',corto:'VIE'},{nombre:'Sábado',corto:'SÁB'},{nombre:'Domingo',corto:'DOM'}
];
type Horario={DiaSemana:Dia;Servicio:Servicio;Hora:string;MargenHoras:number|null;Activo:boolean};
type Props={onBack:()=>void;darkMode:boolean;onToggleTheme:()=>void};
const minutos=(v:string)=>{const p=String(v).split(':').map(Number);return (p[0]||0)*60+(p[1]||0)};
const dia=(v:unknown):Dia=>DIAS.find(d=>d.nombre.toLowerCase()===String(v??'').trim().toLowerCase())?.nombre||(String(v??'') as Dia);
const hora=(v:unknown)=>String(v??'').slice(0,5);

export default function HorarioConfiguracion({onBack,darkMode,onToggleTheme}:Props){
 const [rows,setRows]=useState<Horario[]>([]),[initial,setInitial]=useState<Horario[]>([]);
 const [deleted,setDeleted]=useState<Array<{Servicio:Servicio;Hora:string}>>([]);
 const [pending,setPending]=useState<{Servicio:Servicio;Hora:string}|null>(null);
 const [margin,setMargin]=useState<Record<Servicio,number|null>>({COMIDA:null,CENA:null});
 const [bad,setBad]=useState<Partial<Record<Servicio,number[]>>>({});
 const [loading,setLoading]=useState(true),[saving,setSaving]=useState(false);
 const [form,setForm]=useState<Servicio|null>(null),[newHour,setNewHour]=useState('');
 const [newDays,setNewDays]=useState<Record<Dia,boolean>>({Lunes:false,Martes:true,Miércoles:true,Jueves:true,Viernes:true,Sábado:true,Domingo:true});
 const [message,setMessage]=useState(''),[error,setError]=useState(false);

 const load=async(ok?:string)=>{
  setLoading(true);setMessage('');setError(false);
  const q=await supabase.from('Horarios').select('DiaSemana,Servicio,Hora,MargenHoras,Activo');
  if(q.error){console.error('[Horarios] load',q.error);setRows([]);setInitial([]);setBad({});setMargin({COMIDA:null,CENA:null});setMessage('No se pudieron cargar los horarios.');setError(true);setLoading(false);return}
  const data:(Horario[])=(q.data||[]).map((r:any)=>({DiaSemana:dia(r.DiaSemana),Servicio:String(r.Servicio).toUpperCase() as Servicio,Hora:hora(r.Hora),MargenHoras:r.MargenHoras==null?null:Number(r.MargenHoras),Activo:Boolean(r.Activo)})).filter(r=>r.Servicio==='COMIDA'||r.Servicio==='CENA');
  data.sort((a,b)=>(a.Servicio===b.Servicio?0:a.Servicio==='COMIDA'?-1:1)||minutos(a.Hora)-minutos(b.Hora));
  const badNext:Partial<Record<Servicio,number[]>>={},marginNext:Record<Servicio,number|null>={COMIDA:null,CENA:null};
  (['COMIDA','CENA'] as Servicio[]).forEach(s=>{const vals=Array.from(new Set(data.filter(r=>r.Servicio===s&&r.MargenHoras!=null).map(r=>Number(r.MargenHoras)))).sort((a,b)=>a-b);if(vals.length>1)badNext[s]=vals;marginNext[s]=vals.length===1?vals[0]:(vals.length?null:2)});
  setRows(data);setInitial(data.map(r=>({...r})));setDeleted([]);setBad(badNext);setMargin(marginNext);setLoading(false);if(ok)setMessage(ok);
 };
 useEffect(()=>{void load()},[]);

 const lines=(s:Servicio)=>{const m:Record<string,{Hora:string;days:Partial<Record<Dia,boolean>>}>={};rows.filter(r=>r.Servicio===s).forEach(r=>{const k=r.Hora;m[k]??={Hora:r.Hora,days:{}};m[k].days[r.DiaSemana]=r.Activo});return Object.values(m).sort((a,b)=>minutos(a.Hora)-minutos(b.Hora))};
 const change=(s:Servicio,h:string,d:Dia,v:boolean)=>setRows(a=>a.some(r=>r.Servicio===s&&r.Hora===h&&r.DiaSemana===d)?a.map(r=>r.Servicio===s&&r.Hora===h&&r.DiaSemana===d?{...r,Activo:v}:r):[...a,{DiaSemana:d,Servicio:s,Hora:h,MargenHoras:margin[s],Activo:v}]);
 const openForm=(s:Servicio)=>{setForm(s);setNewHour(s==='COMIDA'?'12:30':'20:30');setNewDays({Lunes:false,Martes:true,Miércoles:true,Jueves:true,Viernes:true,Sábado:true,Domingo:true});setMessage('');setError(false)};
 const add=()=>{if(!form)return;if(!/^\d{2}:\d{2}$/.test(newHour)||minutos(newHour)%15){setMessage('Selecciona una hora en intervalos de 15 minutos.');setError(true);return}if(rows.some(r=>r.Servicio===form&&r.Hora===newHour)){setMessage('Ya existe esa hora para este servicio.');setError(true);return}setRows(a=>[...a,...DIAS.map(d=>({DiaSemana:d.nombre,Servicio:form!,Hora:newHour,MargenHoras:margin[form!],Activo:newDays[d.nombre]}))]);setForm(null);setMessage('');setError(false)};
 const remove=()=>{if(!pending)return;const p=pending;setDeleted(a=>[...a,p]);setRows(a=>a.filter(r=>r.Servicio!==p.Servicio||r.Hora!==p.Hora));setPending(null)};
 const save=async()=>{if(Object.keys(bad).length){setMessage('No se sobrescribirán márgenes distintos sin una regla de migración confirmada.');setError(true);return}if((['COMIDA','CENA'] as Servicio[]).some(s=>margin[s]==null||margin[s]!<0||margin[s]!>999.99)){setMessage('Indica una antelación mínima válida para COMIDA y CENA.');setError(true);return}const now=rows.map(r=>({...r,MargenHoras:margin[r.Servicio]})),old=new Map(initial.map(r=>[r.DiaSemana+'|'+r.Servicio+'|'+r.Hora,r])),changes=now.filter(r=>{const o=old.get(r.DiaSemana+'|'+r.Servicio+'|'+r.Hora);return !o||!!o.Activo!==!!r.Activo||Number(o.MargenHoras)!==Number(r.MargenHoras)});setSaving(true);setMessage('');setError(false);try{for(const r of changes){const q=await supabase.from('Horarios').select('DiaSemana').eq('DiaSemana',r.DiaSemana).eq('Servicio',r.Servicio).eq('Hora',r.Hora+':00').limit(1);if(q.error)throw q.error;if(q.data?.length){const u=await supabase.from('Horarios').update({Activo:r.Activo,MargenHoras:r.MargenHoras}).eq('DiaSemana',r.DiaSemana).eq('Servicio',r.Servicio).eq('Hora',r.Hora+':00');if(u.error)throw u.error}else{const i=await supabase.from('Horarios').insert({DiaSemana:r.DiaSemana,Servicio:r.Servicio,Hora:r.Hora+':00',MargenHoras:r.MargenHoras,Activo:r.Activo});if(i.error)throw i.error}}for(const r of deleted){const d=await supabase.from('Horarios').delete().eq('Servicio',r.Servicio).eq('Hora',r.Hora+':00');if(d.error)throw d.error}await load('Horarios guardados correctamente.')}catch(e){console.error('[Horarios] save',e);setMessage('No se pudieron guardar los horarios.');setError(true)}finally{setSaving(false)}};

 if(form)return <section className="cr-horario-form"><h3>AÑADIR HORA</h3><div className="cr-horario-fijos"><span>SERVICIO: <strong>{form}</strong></span></div><label><span>HORA</span><input type="time" step="900" value={newHour} onChange={e=>setNewHour(e.target.value)}/></label><fieldset className="cr-horario-dias-form"><legend>DÍAS ACTIVOS</legend>{DIAS.map(d=><label key={d.nombre}><input type="checkbox" checked={newDays[d.nombre]} onChange={e=>setNewDays(a=>({...a,[d.nombre]:e.target.checked}))}/><span>{d.corto}</span></label>)}</fieldset><button className="cr-button cr-button--success" type="button" onClick={add}>AÑADIR</button><button className="cr-button cr-button--dark" type="button" onClick={()=>setForm(null)}>← VOLVER</button></section>;

 const contenido=<section className="cr-horarios-fullscreen"><div className="cr-horarios-fullscreen__surface"><header className="cr-horarios-fullscreen__header"><h2>⚙ CONFIGURACIÓN</h2><div className="cr-config-modal__header-actions"><button className="cr-config-modal__theme" type="button" onClick={onToggleTheme} aria-label="Cambiar modo día/noche">{darkMode?<Sun size={22}/>:<Moon size={22}/>}</button><button className="cr-config-modal__close" type="button" onClick={onBack}>×</button></div></header><section className="cr-config-horarios"><h3>🕒 HORARIOS</h3>{loading?<div className="cr-horario-vacio">CARGANDO HORARIOS...</div>:<>
  <p className="cr-horarios-inconsistencia" hidden={!Object.keys(bad).length}>{Object.entries(bad).map(([s,v])=>s+': '+(v||[]).join(' h, ')+' h').join('; ')}</p>
  <div>{(['COMIDA','CENA'] as Servicio[]).map(s=>{const disabled=Boolean(bad[s]),items=lines(s);return <section className="cr-horario-bloque" data-servicio={s} key={s}><div className="cr-horario-bloque__cabecera"><h4>{s==='COMIDA'?'☀ COMIDA':'☾ CENA'}</h4><div className="cr-horario-bloque__acciones"><label className="cr-horario-margen-servicio"><span>Antelación mínima:</span><input type="number" min="0" max="999.99" step="0.01" value={margin[s]??''} disabled={disabled} onChange={e=>setMargin(a=>({...a,[s]:e.target.value===''?null:Number(e.target.value)}))}/><span>h</span></label><button className="cr-horario-anadir" type="button" disabled={disabled||saving} onClick={()=>openForm(s)}>+ AÑADIR HORA</button></div></div><div className="cr-horario-matriz-wrap">{items.length?<table className="cr-horario-matriz"><thead><tr>{['HORA',...DIAS.map(d=>d.corto),''].map((x,i)=><th key={i} className={i===0?'cr-horario-col-hora':i===1?'cr-horario-col-lunes':''}>{x}</th>)}</tr></thead><tbody>{items.map(f=><tr key={s+f.Hora}><td className="cr-horario-col-hora"><span className="cr-horario-hora">{f.Hora}</span></td>{DIAS.map((d,i)=><td key={d.nombre} className={i===0?'cr-horario-col-lunes':''}><input className="cr-horario-check" type="checkbox" checked={!!f.days[d.nombre]} disabled={disabled} onChange={e=>change(s,f.Hora,d.nombre,e.target.checked)}/></td>)}<td><button className="cr-horario-eliminar-fila" type="button" disabled={disabled||saving} onClick={()=>setPending({Servicio:s,Hora:f.Hora})}>×</button></td></tr>)}</tbody></table>:<p className="cr-horario-vacio">Sin horas</p>}</div></section>})}</div>
  <button className="cr-button cr-button--success" type="button" disabled={saving} onClick={()=>void save()}>{saving?'GUARDANDO...':'GUARDAR CAMBIOS'}</button>{message&&<div className="cr-config-mensaje" data-tipo={error?'error':'ok'}>{message}</div>}<button className="cr-button cr-button--dark" type="button" onClick={onBack}>← VOLVER</button>
 </>}{pending&&<section className="cr-horario-confirmar"><p>¿Eliminar esta hora de todos los días de este servicio?</p><div><button className="cr-button cr-button--dark" type="button" onClick={()=>setPending(null)}>CANCELAR</button><button className="cr-button cr-button--danger" type="button" onClick={remove}>ELIMINAR</button></div></section>}</section></div></section>;
 return createPortal(contenido, document.body);
}
