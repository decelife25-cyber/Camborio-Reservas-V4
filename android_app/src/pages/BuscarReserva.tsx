import { useState } from 'react';
import { supabase } from '../lib/supabase';
import SearchReservationCard from '../components/SearchReservationCard';
import type { SearchReservation } from '../components/SearchReservationCard';

const selectFields='ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,MesasAdicionales,Turno,Observaciones,FechaCreacion';

export default function BuscarReserva(){
 const[term,setTerm]=useState(''),[results,setResults]=useState<SearchReservation[]>([]),[index,setIndex]=useState(0),[loading,setLoading]=useState(false),[searched,setSearched]=useState(false),[error,setError]=useState('');
 async function buscar(e:React.FormEvent){
  e.preventDefault();const value=term.trim();if(!value)return;
  setLoading(true);setSearched(true);setError('');setResults([]);setIndex(0);
  const byCode=await supabase.from('Reservas').select(selectFields).eq('CodigoReserva',value.toUpperCase()).order('FechaReserva',{ascending:false}).order('HoraReserva',{ascending:false});
  let data=byCode.data as SearchReservation[]|null,err=byCode.error;
  if(!err&&!data?.length){const byPhone=await supabase.from('Reservas').select(selectFields).eq('Telefono',value).order('FechaReserva',{ascending:false}).order('HoraReserva',{ascending:false});data=byPhone.data as SearchReservation[]|null;err=byPhone.error}
  if(err)setError(err.message);setResults(data||[]);setLoading(false);
 }
 function updateResult(updated:SearchReservation){setResults(prev=>prev.map(r=>r.ReservaID===updated.ReservaID?updated:r))}
 return <section className="cr-reservas-hoy" data-cr-vista-reservas="buscar" aria-labelledby="crBuscarReservaTitulo">
   <header className="cr-reservas-hoy__header">
     <div className="cr-reservas-hoy__titlewrap">
       <h1 id="crBuscarReservaTitulo">BUSCAR RESERVA</h1>
       <button className="cr-reservas-hoy__volver" type="button" onClick={()=>window.history.back()} aria-label="Volver">←</button>
     </div>
   </header>
   <div className="cr-reservas-lista-scroll">
     <form className="cr-buscar-reserva" onSubmit={buscar}>
       <label className="cr-buscar-reserva__label" htmlFor="crBuscarReservaInput">Teléfono o código de reserva</label>
       <div className="cr-buscar-reserva__controles">
         <input id="crBuscarReservaInput" className="cr-buscar-reserva__input" type="search" inputMode="search" autoComplete="off" value={term} onChange={e=>setTerm(e.target.value)} placeholder="TELÉFONO O CÓDIGO"/>
         <button className="cr-buscar-reserva__boton" type="submit" disabled={loading}>{loading?'BUSCANDO...':'BUSCAR'}</button>
       </div>
     </form>
     {error&&<div className="cr-reservas-hoy__mensaje" data-tipo="error">{error}</div>}
     {searched&&!loading&&!error&&!results.length&&<div className="cr-reservas-hoy__mensaje">No se encontró ninguna reserva.</div>}
     {results.length>0&&<div className="cr-busqueda-ficha-wrap">
       <SearchReservationCard reserva={results[index]} index={index} total={results.length} onNavigate={d=>setIndex(i=>Math.max(0,Math.min(results.length-1,i+d)))} onUpdated={updateResult}/>
     </div>}
   </div>
 </section>;
}
