import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Vista = 'menu' | 'parametros' | 'horarios' | 'mesas';
type Servicio = 'COMIDA' | 'CENA';
type Dia = 'Lunes'|'Martes'|'Miércoles'|'Jueves'|'Viernes'|'Sábado'|'Domingo';
const DIAS:{nombre:Dia;corto:string}[]=[
 {nombre:'Lunes',corto:'LUN'},{nombre:'Martes',corto:'MAR'},{nombre:'Miércoles',corto:'MIÉ'},
 {nombre:'Jueves',corto:'JUE'},{nombre:'Viernes',corto:'VIE'},{nombre:'Sábado',corto:'SÁB'},{nombre:'Domingo',corto:'DOM'}
];
type Fila={Servicio:Servicio;Hora:string;dias:Record<Dia,boolean>};
type Row={DiaSemana:string;Servicio:Servicio;Hora:string;MargenHoras:number|string|null;Activo:boolean};
const DEFAULT={TelefonoReservas:'956254532',TelefonoPrincipal:'956254532',HORA_CORTE_COMIDA_CENA:'18:00'};
const emptyDays=()=>Object.fromEntries(DIAS.map(d=>[d.nombre,false])) as Record<Dia,boolean>;
const mins=(h:string)=>{const [a,b]=h.slice(0,5).split(':').map(Number);return (a||0)*60+(b||0)};
const group=(rows:Row[])=>{
 const m:Record<string,Fila>={};
 rows.forEach(r=>{const h=String(r.Hora).slice(0,5),k=r.Servicio+'|'+h;
  if(!m[k])m[k]={Servicio:r.Servicio,Hora:h,dias:emptyDays()};
  if(DIAS.some(d=>d.nombre===r.DiaSemana))m[k].dias[r.DiaSemana as Dia]=!!r.Activo;
 });
 return Object.values(m).sort((a,b)=>a.Servicio===b.Servicio?mins(a.Hora)-mins(b.Hora):a.Servicio==='COMIDA'?-1:1);
};

export default function Configuracion(){
 const navigate=useNavigate();
 const [vista,setVista]=useState<Vista>('menu');
 const [param,setParam]=useState(DEFAULT);
 const [filas,setFilas]=useState<Fila[]>([]);
 const [inicial,setInicial]=useState<Fila[]>([]);
 const [margen,setMargen]=useState<Record<Servicio,number|null>>({COMIDA:null,CENA:null});
 const [incons,setIncons]=useState<Record<Servicio,number[]>>({COMIDA:[],CENA:[]});
 const [eliminadas,setEliminadas]=useState<{Servicio:Servicio;Hora:string}[]>([]);
 const [nuevo,setNuevo]=useState<Servicio|null>(null);
 const [nuevaHora,setNuevaHora]=useState('12:30');
 const [diasNuevos,setDiasNuevos]=useState<Record<Dia,boolean>>({...emptyDays(),Martes:true,Miércoles:true,Jueves:true,Viernes:true,Sábado:true,Domingo:true});
 const [eliminar,setEliminar]=useState<{Servicio:Servicio;Hora:string}|null>(null);
 const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[msg,setMsg]=useState(''),[err,setErr]=useState(false);

 const message=(s:string,e=false)=>{setMsg(s);setErr(e)};
 const loadParams=async()=>{
  setLoading(true);message('');
  const {data,error}=await supabase.from('Configuracion').select('Parametro,Valor');
  if(error)message('No se pudieron cargar los parámetros.',true);
  else{const p={...DEFAULT};(data||[]).forEach((r:any)=>{if(r.Parametro in p&&r.Valor!=null)(p as any)[r.Parametro]=String(r.Valor)});setParam(p);}
  setLoading(false);
 };
 const openParams=()=>{setVista('parametros');void loadParams()};
 const saveParams=async()=>{
  setSaving(true);message('');
  try{for(const [Parametro,Valor] of Object.entries(param)){
   const {data,error}=await supabase.from('Configuracion').select('Parametro').eq('Parametro',Parametro).limit(1);if(error)throw error;
   if(data?.length){const {error:e}=await supabase.from('Configuracion').update({Valor}).eq('Parametro',Parametro);if(e)throw e}
   else{const {error:e}=await supabase.from('Configuracion').insert({Parametro,Valor});if(e)throw e}
  }message('Parámetros guardados correctamente.')}catch(e){console.error(e);message('No se pudieron guardar los parámetros.',true)}finally{setSaving(false)}
 };
 const loadHours=async(text='')=>{
  setLoading(true);message('');
  const {data,error}=await supabase.from('Horarios').select('DiaSemana,Servicio,Hora,MargenHoras,Activo').order('Hora',{ascending:true});
  if(error){message('No se pudieron cargar los horarios.',true);setLoading(false);return}
  const rows=(data||[]) as Row[], fs=group(rows);setFilas(fs);setInicial(fs.map(f=>({...f,dias:{...f.dias}})));
  const mm={COMIDA:[] as number[],CENA:[] as number[]};
  rows.forEach(r=>{const n=Number(r.MargenHoras);if(!mm[r.Servicio].includes(n))mm[r.Servicio].push(n)});
  (['COMIDA','CENA'] as Servicio[]).forEach(s=>mm[s].sort((a,b)=>a-b));
  setIncons(mm);setMargen({COMIDA:mm.COMIDA.length===1?mm.COMIDA[0]:mm.COMIDA.length?null:2,CENA:mm.CENA.length===1?mm.CENA[0]:mm.CENA.length?null:2});
  setLoading(false);if(text)message(text);
 };
 const openHours=()=>{setVista('horarios');void loadHours()};
 const toggleDay=(s:Servicio,h:string,d:Dia,v:boolean)=>setFilas(fs=>fs.map(f=>f.Servicio===s&&f.Hora===h?{...f,dias:{...f.dias,[d]:v}}:f));
 const addHour=()=>{
  if(!nuevo)return;
  if(!/^\d{2}:\d{2}$/.test(nuevaHora)||mins(nuevaHora)%15!==0){message('Selecciona una hora en intervalos de 15 minutos.',true);return}
  if(filas.some(f=>f.Servicio===nuevo&&f.Hora===nuevaHora)){message('Ya existe esa hora para este servicio.',true);return}
  setFilas(fs=>[...fs,{Servicio:nuevo,Hora:nuevaHora,dias:{...diasNuevos}}].sort((a,b)=>a.Servicio===b.Servicio?mins(a.Hora)-mins(b.Hora):a.Servicio==='COMIDA'?-1:1));setNuevo(null);
 };
 const saveHours=async()=>{
  if(incons.COMIDA.length>1||incons.CENA.length>1){message('No se sobrescribirán márgenes distintos sin una regla de migración confirmada.',true);return}
  if(margen.COMIDA==null||margen.CENA==null||margen.COMIDA<0||margen.CENA<0){message('Indica una antelación mínima válida para COMIDA y CENA.',true);return}
  setSaving(true);message('');
  try{
   for(const x of eliminadas){const {error}=await supabase.from('Horarios').delete().eq('Servicio',x.Servicio).eq('Hora',x.Hora+':00');if(error)throw error}
   const old=new Map(inicial.map(f=>[f.Servicio+'|'+f.Hora,f]));
   for(const f of filas)for(const d of DIAS){
    const before=old.get(f.Servicio+'|'+f.Hora)?.dias[d.nombre],active=f.dias[d.nombre];
    if(before===active&&old.has(f.Servicio+'|'+f.Hora))continue;
    const q=await supabase.from('Horarios').select('DiaSemana').eq('Servicio',f.Servicio).eq('Hora',f.Hora+':00').eq('DiaSemana',d.nombre).limit(1);if(q.error)throw q.error;
    if(q.data?.length){const {error}=await supabase.from('Horarios').update({Activo:active,MargenHoras:margen[f.Servicio]}).eq('Servicio',f.Servicio).eq('Hora',f.Hora+':00').eq('DiaSemana',d.nombre);if(error)throw error}
    else{const {error}=await supabase.from('Horarios').insert({DiaSemana:d.nombre,Servicio:f.Servicio,Hora:f.Hora+':00',MargenHoras:margen[f.Servicio],Activo:active});if(error)throw error}
   }
   setEliminadas([]);await loadHours('Horarios guardados correctamente.');
  }catch(e){console.error(e);message('No se pudieron guardar los horarios.',true)}finally{setSaving(false)}
 };
 const inconsText=useMemo(()=> (['COMIDA','CENA'] as Servicio[]).filter(s=>incons[s].length>1).map(s=>s+': '+incons[s].join(' h, ')+' h').join('; '),[incons]);
 useEffect(()=>{if(vista==='menu')message('')},[vista]);

 return <section className="cr-config-v4" aria-label="Configuración">
  <button className="cr-config-v4__backdrop" type="button" aria-label="Cerrar configuración" onClick={()=>navigate('/')}/>
  <div className="cr-config-v4__box">
   <header className="cr-config-v4__header"><h2>⚙ CONFIGURACIÓN</h2><button type="button" className="cr-config-v4__close" onClick={()=>navigate('/')}>×</button></header>
   {vista==='menu'&&<section className="cr-config-v4__menu">
    <button className="cr-config-v4__button cr-config-v4__button--green" onClick={openParams}>⚙ PARÁMETROS</button>
    <button className="cr-config-v4__button cr-config-v4__button--blue" onClick={openHours}>🕒 HORARIOS</button>
    <button className="cr-config-v4__button cr-config-v4__button--gold" onClick={()=>setVista('mesas')}>🍽 MESAS</button>
   </section>}
   {vista==='parametros'&&<section className="cr-config-v4__view"><h3>PARÁMETROS</h3>{loading?<div className="cr-config-v4__loading">CARGANDO PARÁMETROS...</div>:<>
    <label><span>TELÉFONO DE RESERVAS</span><input type="tel" value={param.TelefonoReservas} onChange={e=>setParam(p=>({...p,TelefonoReservas:e.target.value}))}/></label>
    <label><span>TELÉFONO PRINCIPAL</span><input type="tel" value={param.TelefonoPrincipal} onChange={e=>setParam(p=>({...p,TelefonoPrincipal:e.target.value}))}/></label>
    <label><span>HORA DE CORTE COMIDA/CENA</span><input type="time" value={param.HORA_CORTE_COMIDA_CENA} onChange={e=>setParam(p=>({...p,HORA_CORTE_COMIDA_CENA:e.target.value}))}/><small>Define desde qué hora una reserva pertenece al turno de cena.</small></label>
    <button className="cr-config-v4__action cr-config-v4__action--green" disabled={saving} onClick={()=>void saveParams()}>{saving?'GUARDANDO...':'GUARDAR'}</button>
   </>}{msg&&<div className={'cr-config-v4__message '+(err?'is-error':'')}>{msg}</div>}<button className="cr-config-v4__action cr-config-v4__action--dark" onClick={()=>setVista('menu')}>← VOLVER</button></section>}
   {vista==='horarios'&&<section className="cr-config-v4__view cr-config-v4__horarios"><h3>🕒 HORARIOS</h3>{loading?<div className="cr-config-v4__loading">CARGANDO HORARIOS...</div>:<>
    {inconsText&&<p className="cr-config-v4__warning">No se guardará ningún cambio: existen márgenes distintos en {inconsText}. Confirma primero una regla de migración.</p>}
    {(['COMIDA','CENA'] as Servicio[]).map(s=><section className="cr-config-v4__bloque" key={s}><div className="cr-config-v4__bloque-head"><h4>{s==='COMIDA'?'☀ COMIDA':'☾ CENA'}</h4><div className="cr-config-v4__bloque-actions"><label>Antelación mínima: <input type="number" min="0" max="999.99" step="0.01" value={margen[s]??''} disabled={!!incons[s].length} onChange={e=>setMargen(m=>({...m,[s]:e.target.value===''?null:Number(e.target.value)}))}/> h</label><button type="button" onClick={()=>{setNuevo(s);setNuevaHora(s==='COMIDA'?'12:30':'20:30');setDiasNuevos({...emptyDays(),Martes:true,Miércoles:true,Jueves:true,Viernes:true,Sábado:true,Domingo:true})}} disabled={!!incons[s].length}>+ AÑADIR HORA</button></div></div>
    <div className="cr-config-v4__matrix-wrap"><table className="cr-config-v4__matrix"><thead><tr><th className="hora-col">HORA</th>{DIAS.map(d=><th key={d.nombre} className={d.nombre==='Lunes'?'lunes-col':''}>{d.corto}</th>)}<th/></tr></thead><tbody>
    {filas.filter(f=>f.Servicio===s).map(f=><tr key={s+f.Hora}><td className="hora-col"><strong>{f.Hora}</strong></td>{DIAS.map(d=><td key={d.nombre} className={d.nombre==='Lunes'?'lunes-col':''}><input type="checkbox" checked={f.dias[d.nombre]} disabled={!!incons[s].length} onChange={e=>toggleDay(s,f.Hora,d.nombre,e.target.checked)}/></td>)}<td><button type="button" className="cr-config-v4__delete" disabled={!!incons[s].length} onClick={()=>setEliminar({Servicio:s,Hora:f.Hora})}>×</button></td></tr>)}</tbody></table></div>
    {!filas.some(f=>f.Servicio===s)&&<p className="cr-config-v4__empty">Sin horas</p>}</section>)}
    <button className="cr-config-v4__action cr-config-v4__action--green" disabled={saving} onClick={()=>void saveHours()}>{saving?'GUARDANDO...':'GUARDAR CAMBIOS'}</button>
   </>}{msg&&<div className={'cr-config-v4__message '+(err?'is-error':'')}>{msg}</div>}<button className="cr-config-v4__action cr-config-v4__action--dark" onClick={()=>setVista('menu')}>← VOLVER</button></section>}
   {vista==='mesas'&&<section className="cr-config-v4__view cr-config-v4__proximamente"><h3>🍽 MESAS</h3><p>PRÓXIMAMENTE</p><button className="cr-config-v4__action cr-config-v4__action--dark" onClick={()=>setVista('menu')}>← VOLVER</button></section>}
   {nuevo&&<div className="cr-config-v4__submodal"><div className="cr-config-v4__submodal-box"><h3>AÑADIR HORA</h3><div className="cr-config-v4__fixed">SERVICIO: <strong>{nuevo}</strong></div><label>HORA<input type="time" step="900" value={nuevaHora} onChange={e=>setNuevaHora(e.target.value)}/></label><fieldset><legend>DÍAS ACTIVOS</legend>{DIAS.map(d=><label key={d.nombre}><input type="checkbox" checked={diasNuevos[d.nombre]} onChange={e=>setDiasNuevos(n=>({...n,[d.nombre]:e.target.checked}))}/><span>{d.corto}</span></label>)}</fieldset><button className="cr-config-v4__action cr-config-v4__action--green" onClick={addHour}>AÑADIR</button><button className="cr-config-v4__action cr-config-v4__action--dark" onClick={()=>setNuevo(null)}>← VOLVER</button></div></div>}
   {eliminar&&<div className="cr-config-v4__submodal cr-config-v4__submodal--confirm"><div className="cr-config-v4__confirm-box"><p>¿Eliminar esta hora de todos los días de este servicio?</p><div><button className="cr-config-v4__action cr-config-v4__action--dark" onClick={()=>setEliminar(null)}>CANCELAR</button><button className="cr-config-v4__action cr-config-v4__action--danger" onClick={()=>{setFilas(fs=>fs.filter(f=>!(f.Servicio===eliminar.Servicio&&f.Hora===eliminar.Hora)));setEliminadas(es=>[...es,eliminar]);setEliminar(null)}}>ELIMINAR</button></div></div></div>}
  </div>
 </section>;
}
