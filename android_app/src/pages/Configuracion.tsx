import { useEffect, useState } from 'react';
import HorarioConfiguracion from '../components/HorarioConfiguracion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

type Vista='menu'|'parametros'|'horarios'|'mesas';
const defaultParametros={TelefonoReservas:'956254532',TelefonoPrincipal:'956254532',HORA_CORTE_COMIDA_CENA:'18:00'};
export default function Configuracion(){
 const navigate=useNavigate();
 const [vista,setVista]=useState<Vista>('menu');
 const [param,setParam]=useState(defaultParametros);
 const [mensaje,setMensaje]=useState(''); const [error,setError]=useState(false);
 const [cargando,setCargando]=useState(false); const [guardando,setGuardando]=useState(false);
 const mostrar=(m:string,e=false)=>{setMensaje(m);setError(e)}; const ocultar=()=>{setMensaje('');setError(false)};
 const cargarParametros=async()=>{
  setCargando(true);ocultar();
  const {data,error:e}=await supabase.from('Configuracion').select('Parametro,Valor');
  if(e){setParam(defaultParametros);mostrar('No se pudieron cargar los parámetros.',true)}
  else{const p={...defaultParametros};(data||[]).forEach((r:any)=>{if(r.Parametro in p&&r.Valor!=null)(p as any)[r.Parametro]=String(r.Valor).slice(0,5)==='00:00'&&String(r.Valor).length>5?String(r.Valor).slice(0,5):String(r.Valor)});setParam(p)}
  setCargando(false);
 };
 const guardarParametros=async()=>{
  setGuardando(true);ocultar();
  try{for(const [Parametro,Valor] of Object.entries(param)){const q=await supabase.from('Configuracion').select('Parametro').eq('Parametro',Parametro).limit(1);if(q.error)throw q.error;if(q.data?.length){const u=await supabase.from('Configuracion').update({Valor}).eq('Parametro',Parametro);if(u.error)throw u.error}else{const i=await supabase.from('Configuracion').insert({Parametro,Valor});if(i.error)throw i.error}}mostrar('Parámetros guardados correctamente.')}
  catch(e){console.error(e);mostrar('No se pudieron guardar los parámetros.',true)}
  finally{setGuardando(false)}
 };
 useEffect(()=>{if(vista==='parametros')void cargarParametros()},[vista]);

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
   {vista==='horarios'&&<HorarioConfiguracion onBack={()=>setVista('menu')}/>}
   {vista==='mesas'&&<section className="cr-config-proximamente"><h3>🍽 MESAS</h3><p>PRÓXIMAMENTE</p><button className="cr-button cr-button--dark" type="button" onClick={()=>setVista('menu')}>← VOLVER</button></section>}
  </div>
 </div>;
}
