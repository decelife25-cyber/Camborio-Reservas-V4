import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Users, UserCheck, Calendar as CalendarIcon, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Inicio() {
  const [stats, setStats] = useState({
    hoy: 0,
    pendientes: 0,
    comensalesHoy: 0,
    porLlegar: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const today = new Date().toLocaleDateString('en-CA', {
          timeZone: 'Europe/Madrid',
        });

        // Supabase V4 uses the existing business schema: public."Reservas"
        // and its original column names.
        const { data, error } = await supabase
          .from('Reservas')
          .select('ReservaID, Estado, Personas, FechaReserva')
          .eq('FechaReserva', today)
          .not('Estado', 'in', '("CANCELADA_CLIENTE","CANCELADA_LOCAL")');

        if (error) throw error;

        let hoy = 0;
        let pendientes = 0;
        let comensalesHoy = 0;
        let porLlegar = 0;

        if (data) {
          hoy = data.length;
          pendientes = data.filter(r => r.Estado === 'PENDIENTE').length;
          comensalesHoy = data.reduce((acc, r) => acc + (r.Personas || 0), 0);
          porLlegar = data.filter(r => ['PENDIENTE', 'CONFIRMADA'].includes(r.Estado)).length;
        }

        setStats({ hoy, pendientes, comensalesHoy, porLlegar });
      } catch (error) {
        console.error('Error fetching stats', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Cargando resumen...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Resumen de Hoy</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-lg text-blue-600 dark:text-blue-400">
              <CalendarIcon size={20} />
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Reservas</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.hoy}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-lg text-green-600 dark:text-green-400">
              <Users size={20} />
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Comensales</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.comensalesHoy}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-yellow-100 dark:border-yellow-900/30">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-lg text-yellow-600 dark:text-yellow-500">
              <Clock size={20} />
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pendientes</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">{stats.pendientes}</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-lg text-purple-600 dark:text-purple-400">
              <UserCheck size={20} />
            </div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Por Llegar</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.porLlegar}</p>
        </div>
      </div>

      <div className="mt-8">
        <Link
          to="/reservas"
          className="w-full block text-center bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
        >
          VER RESERVAS DE HOY
        </Link>
      </div>
    </div>
  );
}
