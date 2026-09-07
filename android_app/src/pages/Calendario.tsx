import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Calendario() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchReservas = async (date: Date) => {
    setLoading(true);
    try {
      const dateString = date.toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('reservas')
        .select(`*, clientes(nombre_ultimo, telefono)`)
        .eq('fecha_reserva', dateString)
        .not('estado', 'in', '("CANCELADA_CLIENTE","CANCELADA_LOCAL")')
        .order('hora_reserva', { ascending: true });

      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error('Error fetching calendar data', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas(selectedDate);
  }, [selectedDate]);

  const changeDate = (days: number) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(selectedDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const reservasComida = reservas.filter(r => r.turno === 'COMIDA');
  const reservasCena = reservas.filter(r => r.turno === 'CENA');

  const renderTurno = (title: string, data: any[]) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="font-bold text-lg mb-4 text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2 flex justify-between">
        <span>{title}</span>
        <span className="text-sm font-normal text-gray-500">
          {data.reduce((sum, r) => sum + (r.personas || 0), 0)} pax ({data.length} res.)
        </span>
      </h3>
      {data.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay reservas en este turno.</p>
      ) : (
        <ul className="space-y-3">
          {data.map(r => (
            <li key={r.reserva_id} className="flex justify-between items-center text-sm p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg">
              <div>
                <span className="font-bold text-gray-900 dark:text-white mr-2">{String(r.hora_reserva).slice(0,5)}</span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">{r.clientes?.nombre_ultimo}</span>
              </div>
              <div className="flex items-center gap-3">
                {r.mesa && <span className="bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded text-xs font-mono">{r.mesa}</span>}
                <span className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-500 px-2 py-0.5 rounded text-xs font-bold">
                  {r.personas} p.
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <button onClick={() => changeDate(-1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronLeft />
        </button>
        <div className="text-center">
          <div className="font-bold text-xl text-gray-900 dark:text-white capitalize">
            {selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
          </div>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="text-sm text-yellow-600 dark:text-yellow-500 hover:underline mt-1"
          >
            Ir a hoy
          </button>
        </div>
        <button onClick={() => changeDate(1)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
          <ChevronRight />
        </button>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Cargando calendario...</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {renderTurno('☀️ COMIDA', reservasComida)}
          {renderTurno('🌙 CENA', reservasCena)}
        </div>
      )}
    </div>
  );
}
