import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Map as MapIcon, Users } from 'lucide-react';
import AsignarMesaModal from '../components/AsignarMesaModal';

export default function Mesas() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [turno, setTurno] = useState('COMIDA');

  const [mesas, setMesas] = useState<any[]>([]);
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [assigningTo, setAssigningTo] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [selectedDate, turno]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: mesasData, error: mesasError } = await supabase
        .from('mesas')
        .select('*')
        .order('zona')
        .order('mesa');
      if (mesasError) throw mesasError;

      const { data: reservasData, error: reservasError } = await supabase
        .from('reservas')
        .select(`*, clientes(nombre_ultimo)`)
        .eq('fecha_reserva', selectedDate)
        .eq('turno', turno)
        .not('estado', 'in', '("CANCELADA_CLIENTE","CANCELADA_LOCAL")')
        .order('hora_reserva', { ascending: true });
      if (reservasError) throw reservasError;

      setMesas(mesasData || []);
      setReservas(reservasData || []);
    } catch (error) {
      console.error('Error fetching', error);
    } finally {
      setLoading(false);
    }
  };

  const isTableOccupied = (mesaIdStr: string) => {
    return reservas.find(r =>
      r.mesa === mesaIdStr ||
      (r.mesas_adicionales && r.mesas_adicionales.includes(mesaIdStr))
    );
  };

  const groupedMesas = mesas.reduce((acc, mesa) => {
    if (!acc[mesa.zona]) acc[mesa.zona] = [];
    acc[mesa.zona].push(mesa);
    return acc;
  }, {});

  const renderReservasSinAsignar = () => {
    const sinAsignar = reservas.filter(r => !r.mesa);
    if (sinAsignar.length === 0) return null;

    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-yellow-200 dark:border-yellow-900 mb-6">
        <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white flex items-center gap-2">
          Reservas Sin Asignar ({turno})
        </h3>
        <div className="space-y-2">
          {sinAsignar.map(r => (
            <div key={r.reserva_id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <span className="font-bold dark:text-white mr-2">{String(r.hora_reserva).slice(0,5)}</span>
                <span className="dark:text-gray-300">{r.clientes?.nombre_ultimo} ({r.personas}p)</span>
              </div>
              <button
                onClick={() => setAssigningTo(r)}
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm font-bold"
              >
                ASIGNAR
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <MapIcon /> Estado de Mesas
        </h2>
        <div className="flex gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white font-bold"
          >
            <option value="COMIDA">☀️ COMIDA</option>
            <option value="CENA">🌙 CENA</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Cargando estado del salón...</div>
      ) : (
        <>
          {renderReservasSinAsignar()}

          <div className="space-y-6">
            {Object.entries(groupedMesas).map(([zona, mesasZona]: [string, any]) => (
              <div key={zona} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
                <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 capitalize">
                  Zona {zona}
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {mesasZona.map((m: any) => {
                    const reserva = isTableOccupied(m.mesa);
                    const isPrincipal = reserva?.mesa === m.mesa;
                    return (
                      <div
                        key={m.mesa}
                        onClick={() => {
                           if (reserva) setAssigningTo(reserva);
                        }}
                        className={`p-3 rounded-lg border-2 flex flex-col items-center text-center transition cursor-pointer ${
                          reserva
                            ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/40'
                            : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-900'
                        }`}
                      >
                        <div className="font-black text-xl mb-1 dark:text-white flex items-center gap-1">
                           {m.mesa} {!isPrincipal && reserva && <span className="text-[10px] bg-red-200 text-red-800 px-1 rounded">ADIC</span>}
                        </div>
                        <div className="text-xs flex items-center gap-1 text-gray-600 dark:text-gray-400">
                          <Users size={12}/> {m.capacidad} pax
                        </div>
                        {reserva && (
                          <div className="mt-2 text-xs font-bold text-red-800 dark:text-red-400 truncate w-full">
                            {reserva.clientes?.nombre_ultimo?.split(' ')[0]} ({reserva.personas}p)
                            <br />
                            {String(reserva.hora_reserva).slice(0,5)}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {assigningTo && (
        <AsignarMesaModal
          reserva={assigningTo}
          mesasDisponibles={mesas}
          onClose={() => setAssigningTo(null)}
          onUpdated={fetchData}
        />
      )}
    </div>
  );
}
