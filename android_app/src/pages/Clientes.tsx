import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Search, User } from 'lucide-react';

export default function Clientes() {
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchClientes = async (searchTerm = '') => {
    setLoading(true);
    try {
      let query = supabase
        .from('clientes')
        .select('*')
        .order('ultima_visita', { ascending: false })
        .limit(50);

      if (searchTerm) {
        query = query.or(`telefono.ilike.%${searchTerm}%,nombre_ultimo.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clients', error);
    } finally {
      setLoading(false);
    }
  };

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClientes(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <User /> Directorio de Clientes
        </h2>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Buscar por teléfono o nombre..."
            className="w-full pl-10 p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-yellow-500 outline-none transition"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading && clientes.length === 0 ? (
        <div className="text-center p-8 text-gray-500">Buscando clientes...</div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {clientes.length === 0 ? (
              <li className="p-4 text-center text-gray-500">No se encontraron clientes.</li>
            ) : (
              clientes.map((cliente) => (
                <li key={cliente.cliente_id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-750 transition flex flex-col md:flex-row justify-between md:items-center gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900 dark:text-white">
                      {cliente.nombre_ultimo || 'Sin Nombre'}
                    </h3>
                    <div className="text-gray-500 dark:text-gray-400 text-sm font-mono mt-1">
                      {cliente.telefono}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
                    <div className="text-gray-500 dark:text-gray-400">Total:</div>
                    <div className="font-semibold text-gray-900 dark:text-white text-right">{cliente.reservas_totales}</div>

                    <div className="text-green-600 dark:text-green-400">Sentadas:</div>
                    <div className="font-semibold text-green-700 dark:text-green-300 text-right">{cliente.sentadas}</div>

                    <div className="text-red-500 dark:text-red-400">No pres.:</div>
                    <div className="font-semibold text-red-700 dark:text-red-300 text-right">{cliente.no_presentados}</div>
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
