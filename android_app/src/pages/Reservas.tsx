import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Check, UserCheck, X, Edit } from 'lucide-react';
import ModificarReservaModal from '../components/ModificarReservaModal';

export default function Reservas() {
  const [reservas, setReservas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modifyingReserva, setModifyingReserva] = useState<any>(null);

  useEffect(() => {
    fetchReservas();
  }, []);

  async function fetchReservas() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('reservas')
        .select(`
          *,
          clientes (
            nombre_ultimo,
            telefono
          )
        `)
        .eq('fecha_reserva', today)
        .order('hora_reserva', { ascending: true });

      if (error) throw error;
      setReservas(data || []);
    } catch (error) {
      console.error('Error fetching reservas', error);
    } finally {
      setLoading(false);
    }
  }

  const updateEstado = async (id: string, nuevoEstado: string) => {
    try {
      const { error } = await supabase
        .from('reservas')
        .update({ estado: nuevoEstado })
        .eq('reserva_id', id);

      if (error) throw error;
      fetchReservas(); // Refresh
    } catch (error) {
      console.error('Error updating estado', error);
      alert('Error al actualizar estado');
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'PENDIENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'CONFIRMADA': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'SENTADA': return 'bg-green-100 text-green-800 border-green-200';
      case 'CANCELADA_CLIENTE':
      case 'CANCELADA_LOCAL': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Cargando reservas...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reservas de Hoy</h2>

      {reservas.length === 0 ? (
        <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          No hay reservas para hoy.
        </div>
      ) : (
        <div className="space-y-4">
          {reservas.map((reserva) => (
            <div key={reserva.reserva_id} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">
                    {String(reserva.hora_reserva).slice(0, 5)}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(reserva.estado)}`}>
                    {reserva.estado}
                  </span>
                  <span className="text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded">
                    {reserva.personas} pax
                  </span>
                </div>
                <div className="text-gray-800 dark:text-gray-200 font-medium">
                  {reserva.clientes?.nombre_ultimo || 'Sin Nombre'}
                </div>
                <div className="text-gray-500 dark:text-gray-400 text-sm flex gap-4 mt-1">
                  <span>{reserva.clientes?.telefono}</span>
                  {reserva.mesa && <span>Mesa: <strong className="text-gray-900 dark:text-white">{reserva.mesa}</strong></span>}
                </div>
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <button
                  onClick={() => setModifyingReserva(reserva)}
                  className="flex-1 md:flex-none flex items-center justify-center p-2 text-gray-600 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-lg transition"
                  title="Modificar"
                >
                  <Edit size={18} />
                </button>

                {reserva.estado === 'PENDIENTE' && (
                  <button
                    onClick={() => updateEstado(reserva.reserva_id, 'CONFIRMADA')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <Check size={18} /> Confirmar
                  </button>
                )}

                {(reserva.estado === 'CONFIRMADA' || reserva.estado === 'PENDIENTE') && (
                  <button
                    onClick={() => updateEstado(reserva.reserva_id, 'SENTADA')}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    <UserCheck size={18} /> Sentar
                  </button>
                )}

                {['PENDIENTE', 'CONFIRMADA'].includes(reserva.estado) && (
                  <button
                    onClick={() => {
                      if(window.confirm('¿Cancelar esta reserva?')) {
                        updateEstado(reserva.reserva_id, 'CANCELADA_LOCAL');
                      }
                    }}
                    className="flex-1 md:flex-none flex items-center justify-center p-2 text-red-600 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 rounded-lg transition"
                    title="Cancelar"
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {modifyingReserva && (
        <ModificarReservaModal
          reserva={modifyingReserva}
          onClose={() => setModifyingReserva(null)}
          onUpdated={fetchReservas}
        />
      )}
    </div>
  );
}
