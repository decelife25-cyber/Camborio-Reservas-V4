import { supabase } from '../lib/supabase';
import { useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import ReservationCard from '../components/ReservationCard';
type Reserva={ReservaID:string;CodigoReserva:string|null;FechaReserva:string;HoraReserva:string;Nombre:string|null;Telefono:string|null;Personas:number|null;Estado:string;Mesa:string|null;Turno:string|null;Observaciones:string|null};
export default function BuscarReserva(){
 const [term,setTerm]=useState(''),[results,setResults]=useState<Reserva[]>([]),[loading,setLoading]=useState(false),[searched,setSearched]=useState(false),[error,setError]=useState('');
 async function buscar(e:React.FormEvent){
  e.preventDefault();const value=term.trim();if(!value)return;setLoading(true);setSearched(true);setError('');
  const base='ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Turno,Observaciones';
  const byCode=await supabase.from('Reservas').select(base).eq('CodigoReserva',value.toUpperCase()).order('FechaReserva',{ascending:false}).order('HoraReserva',{ascending:false});
  let data=byCode.data as Reserva[]|null;let err=byCode.error;
  if(err){setError(err.message);setResults([]);setLoading(false);return;}
  if(!data?.length){const byPhone=await supabase.from('Reservas').select(base).eq('Telefono',value).order('FechaReserva',{ascending:false}).order('HoraReserva',{ascending:false});data=byPhone.data as Reserva[]|null;err=byPhone.error;}
  if(err)setError(err.message);setResults(data||[]);setLoading(false);
 }
 return <section className="action-screen search-reservation-screen">
  <header className="action-screen-header"><button type="button" className="action-back" onClick={()=>window.history.back()}><ArrowLeft size={24}/></button><h1>BUSCAR RESERVA</h1></header>
  <form className="search-reservation-form" onSubmit={buscar}><div className="search-input-wrap"><Search size={25}/><input value={term} onChange={e=>setTerm(e.target.value)} placeholder="Teléfono o código de reserva" autoCapitalize="characters"/></div><button className="search-button" disabled={loading}>{loading?'BUSCANDO...':'BUSCAR'}</button></form>
  {error&&<div className="form-message form-error">{error}</div>}
  {searched&&!loading&&!error&&!results.length&&<div className="search-empty">No se encontró ninguna reserva.</div>}
  {results.length>0&&<div className="search-results"><div className="search-count">RESULTADOS: {results.length}</div>{results.map(r=><ReservationCard key={r.ReservaID} reserva={r}/>)}</div>}
 </section>;
}