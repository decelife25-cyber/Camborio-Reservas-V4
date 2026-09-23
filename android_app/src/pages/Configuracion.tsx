import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Vista='menu'|'parametros'|'horarios'|'formulario'|'confirmar'|'mesas';
type Servicio='COMIDA'|'CENA';
type Dia='Lunes'|'Martes'|'Miércoles'|'Jueves'|'Viernes'|'Sábado'|'Domingo';
const DIAS:Array<{nombre:Dia;corto:string}>=[
 {nombre:'Lunes',corto:'LUN'},{nombre:'Martes',corto:'MAR'},{nombre:'Miércoles',corto:'MIÉ'},
 {nombre:'Jueves',corto:'JUE'},{nombre:'Viernes',corto:'VIE'},{nombre:'Sábado',corto:'SÁB'},{nombre:'Domingo',corto:'DOM'}
];
type Horario={DiaSemana:string;Servicio:Servicio;Hora:string;MargenHoras:number|null;Activo:boolean};
const defaultParametros={TelefonoReservas:'956254532',TelefonoPrincipal:'956254532',HORA_CORTE_COMIDA_CENA:'18:00'};
const mins=(h:string)=>{const p=h.slice(0,5).split(':').map(Number);return (p[0]||0)*60+(p[1]||0)};
const normalDia=(v:string):Dia=>{const s=String(v||'').trim().toLowerCase();const d=DIAS.find(x=>x.nombre.toLowerCase()===s);return d?.nombre||(String(v||'') as Dia)};
const hora=(v:string)=>String(v||'').slice(0,5);

export default function Configuracion(){
 const navigate=useNavigate();
 const [vista,setVista]=useState<Vista>('menu');
 const [param,setParam]=useState(defaultParametros);
 const [horarios,setHorarios]=useState<Horario[]>([]);
 const [inicial,setInicial]=useState<Horario[]>([]);
 const [margenes,setMargenes]=useState<Record<Servicio,number|null>>({COMIDA:null,CENA:null});
 const [incons,setIncons]=useState<Record<Servicio,number[]>>({COMIDA:[],CENA:[]});
 const [eliminaciones,setEliminaciones]=useState<Array<{Servicio:Servicio;Hora:string}>>([]);
 const [servicioNuevo,setServicioNuevo]=useState<Servicio|null>(null);
 const [horaNueva,setHoraNueva]=useState('');
 const [diasNuevos,setDiasNuevos]=useState<Record<Dia,boolean>>({Lunes:false,Martes:true,Miércoles:true,Jueves:true,Viernes:true,Sábado:true,Domingo:true});
 const [pendiente,setPendiente]=useState<{Servicio:Servicio;Hora:string}|null>(null);
 const [mensaje,setMensaje]=useState(''); const [error,setError]=useState(false);
 const [cargando,setCargando]=useState(false); const [guardando,setGuardando]=useState(false);

 const mostrar=(m:string,e=false)=>{setMensaje(m);setError(e)};
 const ocultar=()=>setMensaje('');

 const cargarParametros=async()=>{
  setCargando(true); ocultar();
  const {data,error}=await supabase.from('Configuracion').select('Parametro,Valor');
  if(error){setParam(defaultParametros);mostrar('No se pudieron cargar los parámetros.',true)}
  else{const p={...defaultParametros};(data||[]).forEach((r:any)=>{if(r.Parametro in p&&r.Valor!=null)(p as any)[r.Parametro]=String(r.Valor).slice(0,5)==='00:00'&&String(r.Valor).length>5?String(r.Valor).slice(0,5):String(r.Valor)});setParam(p)}
  setCargando(false);
 };
 const cargarHorarios=async()=>{
  setCargando(true);ocultar();
  const {data,error}=await supabase.from('Horarios').select('DiaSemana,Servicio,Hora,MargenHoras,Activo');
  if(error){setHorarios([]);setInicial([]);setMargenes({COMIDA:null,CENA:null});mostrar('No se pudieron cargar los horarios.',true);setCargando(false);return}
  const rows:(Horario[])=(data||[]).map((r:any)=>({DiaSemana:normalDia(r.DiaSemana),Servicio:String(r.Servicio).toUpperCase() as Servicio,Hora:hora(r.Hora),MargenHoras:r.MargenHoras==null?null:Number(r.MargenHoras),Activo:Boolean(r.Activo)}));
  rows.sort((a,b)=>{const s=['COMIDA','CENA'].indexOf(a.Servicio)-['COMIDA','CENA'].indexOf(b.Servicio);return s||mins(a.Hora)-mins(b.Hora)||a.DiaSemana.localeCompare(b.DiaSemana)});
  setHorarios(rows);setInicial(rows.map(r=>({...r})));
  const mm:{COMIDA:number[];CENA:number[]}={COMIDA:[],CENA:[]};
  rows.forEach(r=>{if(r.MargenHoras!=null&&!mm[r.Servicio].includes(r.MargenHoras))mm[r.Servicio].push(r.MargenHoras)});
  mm.COMIDA.sort((a,b)=>a-b);mm.CENA.sort((a,b)=>a-b);
  setIncons(mm);setMargenes({COMIDA:mm.COMIDA.length===1?mm.COMIDA[0]:mm.COMIDA.length?null:3,CENA:mm.CENA.length===1?mm.CENA[0]:mm.CENA.length?null:3});
  setCargando(false);
 };
 const guardarParametros=async()=>{
  setGuardando(true);ocultar();
  try{for(const [Parametro,Valor] of Object.entries(param)){
   const {data,error:e}=await supabase.from('Configuracion').select('Parametro').eq('Parametro',Parametro).limit(1);if(e)throw e;
   if(data?.length){const {error:e2}=await supabase.from('Configuracion').update({Valor}).eq('Parametro',Parametro);if(e2)throw e2}
   else{const {error:e2}=await supabase.from('Configuracion').insert({Parametro,Valor});if(e2)throw e2}
  }mostrar('Parámetros guardados correctamente.')}catch(e){console.error(e);mostrar('No se pudieron guardar los parámetros.',true)}finally{setGuardando(false)}
 };
 const cambiar=(s:Servicio,h:string,d:Dia,v:boolean)=>setHorarios(x=>x.map(r=>r.Servicio===s&&r.Hora===h&&r.DiaSemana===d?{...r,Activo:v}:r));
 const filas=(s:Servicio)=>Array.from(new Set(horarios.filter(r=>r.Servicio===s).map(r=>r.Hora))).sort((a,b)=>mins(a)-mins(b));
 const activo=(s:Servicio,h:string,d:Dia)=>horarios.find(r=>r.Servicio===s&&r.Hora===h&&r.DiaSemana===d)?.Activo??false;
 const eliminarHora=()=>{if(!pendiente)return;setEliminaciones(e=>[...e,pendiente]);setHorarios(h=>h.filter(r=>!(r.Servicio===pendiente.Servicio&&r.Hora===pendiente.Hora)));setPendiente(null)};
 const guardarHorarios=async()=>{
  if(incons.COMIDA.length>1||incons.CENA.length>1){mostrar('No se sobrescribirán márgenes distintos sin una regla de migración confirmada.',true);return}
  if(margenes.COMIDA==null||margenes.CENA==null||margenes.COMIDA<0||margenes.CENA<0||margenes.COMIDA>999.99||margenes.CENA>999.99){mostrar('Indica una antelación mínima válida para COMIDA y CENA.',true);return}
  setGuardando(true);ocultar();
  try{
   const cambios:Horario[]=[];const old=new Map(inicial.map(r=>[r.DiaSemana+'|'+r.Servicio+'|'+r.Hora,r]));
   horarios.forEach(r=>{const item={...r,MargenHoras:margenes[r.Servicio]};const prev=old.get(r.DiaSemana+'|'+r.Servicio+'|'+r.Hora);if(!prev||prev.Activo!==r.Activo||prev.MargenHoras!==item.MargenHoras)cambios.push(item)});
   for(const r of cambios){
    const {data,e}=await supabase.from('Horarios').select('DiaSemana').eq('DiaSemana',r.DiaSemana).eq('Servicio',r.Servicio).eq('Hora',r.Hora+':00').limit(1);if(e)throw e;
    if(data?.length){const {error:e2}=await supabase.from('Horarios').update({Activo:r.Activo,MargenHoras:r.MargenHoras}).eq('DiaSemana',r.DiaSemana).eq('Servicio',r.Servicio).eq('Hora',r.Hora+':00');if(e2)throw e2}
    else{const {error:e2}=await supabase.from('Horarios').insert({DiaSemana:r.DiaSemana,Servicio:r.Servicio,Hora:r.Hora+':00',MargenHoras:r.MargenHoras,Activo:r.Activo});if(e2)throw e2}
   }
   for(const e of eliminaciones){const {error:e2}=await supabase.from('Horarios').delete().eq('Servicio',e.Servicio).eq('Hora',e.Hora+':00');if(e2)throw e2}
   setEliminaciones([]);await cargarHorarios();mostrar('Horarios guardados correctamente.')
  }catch(e){console.error(e);mostrar('No se pudieron guardar los horarios.',true)}finally{setGuardando(false)}
 };
 const inconsistencia=useMemo(()=>{const a=(['COMIDA','CENA'] as Servicio[]).filter(s=>incons[s].length>1).map(s=>s+': '+incons[s].join(' h, ')+' h');return a.length?'No se guardará ningún cambio: existen márgenes distintos en '+a.join('; ')+'. Confirma primero una regla de migración.':''},[incons]);

 const abrirNuevo=(s:Servicio)=>{setServicioNuevo(s);setHoraNueva(s==='COMIDA'?'12:30':'20:30');setDiasNuevos({Lunes:false,Martes:true,Miércoles:true,Jueves:true,Viernes:true,Sábado:true,Domingo:true});setVista('formulario');ocultar()};
 const anadir=()=>{if(!servicioNuevo)return;if(!/^\d{2}:\d{2}$/.test(horaNueva)||mins(horaNueva)%15!==0){mostrar('Selecciona una hora en intervalos de 15 minutos.',true);return}if(filas(servicioNuevo).includes(horaNueva)){mostrar('Ya existe una hora igual para ese servicio.',true);return}const nuevos=DIAS.map(d=>({DiaSemana:d.nombre,Servicio:servicioNuevo,Hora:horaNueva,MargenHoras:margenes[servicioNuevo],Activo:diasNuevos[d.nombre]}));setHorarios(h=>[...h,...nuevos]);setServicioNuevo(null);setVista('horarios');ocultar()};
 useEffect(()=>{if(vista==='parametros')void cargarParametros();if(vista==='horarios')void cargarHorarios()},[vista]);

 return <div className="cr-config-modal" role="dialog" aria-modal="true" aria-labelledby="cr-configuracion-titulo">
  <div className="cr-config-modal__box">
   <div className="cr-config-modal__header"><h2 id="cr-configuracion-titulo">⚙ CONFIGURACIÓN</h2><button className="cr-config-modal__close" type="button" onClick={()=>navigate('/')}>×</button></div>
   {vista==='menu'&&<section className="cr-config-menu">
    <button className="cr-button cr-button--success" type="button" onClick={()=>setVista('parametros')}>⚙ PARÁMETROS</button>
    <button className="cr-button cr-config-button--horarios" type="button" onClick={()=>setVista('horarios')}>🕒 HORARIOS</button>
    <button className="cr-button cr-button--primary" type="button" onClick={()=>setVista('mesas')}>🍽 MESAS</button>
   </section>}
   {vista==='parametros'&&<section className="cr-config-parametros">
    <h3>PARÁMETROS</h3>{cargando?<div>CARGANDO PARÁMETROS...</div>:<>
    <label><span>TELÉFONO DE RESERVAS</span><input name="TelefonoReservas" type="tel" autoComplete="tel" value={param.TelefonoReservas} onChange={e=>setParam(p=>({...p,TelefonoReservas:e.target.value}))}/></label>
    <label><span>TELÉFONO PRINCIPAL</span><input name="TelefonoPrincipal" type="tel" autoComplete="tel" value={param.TelefonoPrincipal} onChange={e=>setParam(p=>({...p,TelefonoPrincipal:e.target.value}))}/></label>
    <label><span>HORA DE CORTE COMIDA/CENA</span><input name="HORA_CORTE_COMIDA_CENA" type="time" required value={param.HORA_CORTE_COMIDA_CENA} onChange={e=>setParam(p=>({...p,HORA_CORTE_COMIDA_CENA:e.target.value}))}/><small>Define desde qué hora una reserva pertenece al turno de cena.</small></label>
    <button className="cr-button cr-button--success" type="button" disabled={guardando} onClick={()=>void guardarParametros()}>{guardando?'GUARDANDO...':'GUARDAR'}</button></>}
    {mensaje&&<div className="cr-config-mensaje" data-tipo={error?'error':'ok'}>{mensaje}</div>}<button className="cr-button cr-button--dark" type="button" onClick={()=>setVista('menu')}>← VOLVER</button>
   </section>}
   {vista==='horarios'&&<section className="cr-config-horarios">
    <h3>🕒 HORARIOS</h3><p className="cr-horarios-inconsistencia" hidden={!inconsistencia}>{inconsistencia}</p>
    <div>
     {(['COMIDA','CENA'] as Servicio[]).map(s=><section className="cr-horario-bloque" data-servicio={s} key={s}>
      <div className="cr-horario-bloque__cabecera"><h4>{s==='COMIDA'?'☀ COMIDA':'☾ CENA'}</h4><div className="cr-horario-bloque__acciones">
       <label className="cr-horario-margen-servicio"><span>Antelación mínima:</span><input type="number" min="0" max="999.99" step="0.01" inputMode="decimal" aria-label={'Antelación mínima '+s} value={margenes[s]??''} disabled={!!incons[s].length} onChange={e=>setMargenes(m=>({...m,[s]:e.target.value===''?null:Number(e.target.value)}))}/><span>h</span></label>
       <button className="cr-horario-anadir" type="button" disabled={!!incons[s].length} onClick={()=>abrirNuevo(s)}>+ AÑADIR HORA</button>
      </div></div>
      <div className="cr-horario-matriz-wrap">{filas(s).length?<table className="cr-horario-matriz"><thead><tr>{['HORA',...DIAS.map(d=>d.corto),''].map((x,i)=><th key={i} className={i===0?'cr-horario-col-hora':i===1?'cr-horario-col-lunes':''}>{x}</th>)}</tr></thead><tbody>{filas(s).map(h=><tr key={s+h}><td className="cr-horario-col-hora"><span className="cr-horario-hora">{h}</span></td>{DIAS.map((d,i)=><td key={d.nombre} className={i===0?'cr-horario-col-lunes':''}><input className="cr-horario-check" type="checkbox" checked={activo(s,h,d.nombre)} disabled={!!incons[s].length} aria-label={h+' '+d.nombre} onChange={e=>cambiar(s,h,d.nombre,e.target.checked)}/></td>)}<td><button className="cr-horario-eliminar-fila" type="button" aria-label="Eliminar hora" disabled={!!incons[s].length} onClick={()=>{setPendiente({Servicio:s,Hora:h});setVista('confirmar')}}>×</button></td></tr>)}</tbody></table>:<p className="cr-horario-vacio">Sin horas</p>}</div>
     </section>)}
    </div>
    <button className="cr-button cr-button--success" type="button" disabled={guardando} onClick={()=>void guardarHorarios()}>{guardando?'GUARDANDO...':'GUARDAR CAMBIOS'}</button>
    {mensaje&&<div className="cr-config-mensaje" data-tipo={error?'error':'ok'}>{mensaje}</div>}<button className="cr-button cr-button--dark" type="button" onClick={()=>setVista('menu')}>← VOLVER</button>
   </section>}
   {vista==='formulario'&&<section className="cr-horario-form">
    <h3>AÑADIR HORA</h3><div className="cr-horario-fijos"><span>SERVICIO: <strong>{servicioNuevo}</strong></span></div>
    <label><span>HORA</span><input type="time" step="900" value={horaNueva} onChange={e=>setHoraNueva(e.target.value)}/></label>
    <fieldset className="cr-horario-dias-form"><legend>DÍAS ACTIVOS</legend>{DIAS.map(d=><label key={d.nombre}><input type="checkbox" checked={diasNuevos[d.nombre]} onChange={e=>setDiasNuevos(x=>({...x,[d.nombre]:e.target.checked}))}/><span>{d.corto}</span></label>)}</fieldset>
    <button className="cr-button cr-button--success" type="button" onClick={anadir}>AÑADIR</button><button className="cr-button cr-button--dark" type="button" onClick={()=>setVista('horarios')}>← VOLVER</button>
   </section>}
   {vista==='confirmar'&&pendiente&&<section className="cr-horario-confirmar"><p>¿Eliminar esta hora de todos los días de este servicio?</p><div><button className="cr-button cr-button--dark" type="button" onClick={()=>{setPendiente(null);setVista('horarios')}}>CANCELAR</button><button className="cr-button cr-button--danger" type="button" onClick={eliminarHora}>ELIMINAR</button></div></section>}
   {vista==='mesas'&&<section className="cr-config-proximamente"><h3>🍽 MESAS</h3><p>PRÓXIMAMENTE</p><button className="cr-button cr-button--dark" type="button" onClick={()=>setVista('menu')}>← VOLVER</button></section>}
  </div>
 </div>;
}
