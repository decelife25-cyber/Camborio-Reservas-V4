import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { History } from 'lucide-react';

export default function Historial() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('log')
        .select('*')
        .order('fecha_hora', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <History /> Historial de Acciones
        </h2>
        <p className="text-gray-500 text-sm mt-1">Últimas 100 operaciones registradas en el sistema.</p>
      </div>

      {loading ? (
        <div className="text-center p-8 text-gray-500">Cargando historial...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {logs.length === 0 ? (
              <li className="p-4 text-center text-gray-500">No hay registros recientes.</li>
            ) : (
              logs.map((log) => (
                <li key={log.log_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition">
                  <div className="flex justify-between items-start mb-1">
                    <span className="font-bold text-gray-900 dark:text-white">{log.accion}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                      {new Date(log.fecha_hora).toLocaleString('es-ES')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300">
                    Reserva: <span className="font-mono">{log.reserva_id?.substring(0,8)}...</span>
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 bg-gray-50 dark:bg-gray-900 p-2 rounded">
                    {log.detalles}
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
