import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import SearchReservationCard from '../components/SearchReservationCard';
import type { SearchReservation } from '../components/SearchReservationCard';

const selectFields = 'ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,MesasAdicionales,Turno,Observaciones,FechaCreacion';

export default function BuscarReserva() {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<SearchReservation[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  async function buscar(e: React.FormEvent) {
    e.preventDefault();
    const value = term.trim();
    if (!value) return;
    setLoading(true); setSearched(true); setError(''); setResults([]); setIndex(0);

    const byCode = await supabase.from('Reservas').select(selectFields).eq('CodigoReserva', value.toUpperCase()).order('FechaReserva', { ascending: false }).order('HoraReserva', { ascending: false });
    let data = byCode.data as SearchReservation[] | null;
    let err = byCode.error;

    if (!err && !data?.length) {
      const byPhone = await supabase.from('Reservas').select(selectFields).eq('Telefono', value).order('FechaReserva', { ascending: false }).order('HoraReserva', { ascending: false });
      data = byPhone.data as SearchReservation[] | null;
      err = byPhone.error;
    }

    if (err) setError(err.message);
    setResults(data || []);
    setLoading(false);
  }

  function updateResult(updated: SearchReservation) {
    setResults(prev => prev.map(r => r.ReservaID === updated.ReservaID ? updated : r));
  }

  return (
    <section className="v2-search-screen">
      <header className="v2-search-screen-header">
        <button type="button" className="v2-search-back" onClick={() => window.history.back()}><ArrowLeft size={24}/></button>
        <h1>BUSCAR RESERVA</h1>
      </header>

      <form className="v2-search-form" onSubmit={buscar}>
        <label>TELÉFONO O CÓDIGO DE RESERVA</label>
        <div className="v2-search-controls">
          <input value={term} onChange={e => setTerm(e.target.value)} placeholder="TELÉFONO O CÓDIGO" autoComplete="off" inputMode="search" />
          <button type="submit" disabled={loading}>{loading ? 'BUSCANDO...' : 'BUSCAR'}</button>
        </div>
      </form>

      {error && <div className="v2-search-message v2-search-error">{error}</div>}
      {searched && !loading && !error && !results.length && <div className="v2-search-message">No se encontró ninguna reserva.</div>}

      {results.length > 0 && (
        <div className="v2-search-results">
          <div className="v2-search-count">RESULTADOS: {results.length}</div>
          <SearchReservationCard
            key={results[index].ReservaID}
            reserva={results[index]}
            index={index}
            total={results.length}
            onNavigate={delta => setIndex(i => Math.max(0, Math.min(results.length - 1, i + delta)))}
            onUpdated={updateResult}
          />
        </div>
      )}
    </section>
  );
}
