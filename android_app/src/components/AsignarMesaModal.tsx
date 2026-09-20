import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  reserva: any;
  mesasDisponibles: any[];
  onClose: () => void;
  onUpdated: () => void;
}

export default function AsignarMesaModal({ reserva, mesasDisponibles, onClose, onUpdated }: Props) {
  const [mesaPrincipal, setMesaPrincipal] = useState(reserva.mesa || '');
  const [mesasAdicionales, setMesasAdicionales] = useState<string[]>(
    reserva.mesas_adicionales ? JSON.parse(JSON.stringify(reserva.mesas_adicionales)) : []
  );
  const [loading, setLoading] = useState(false);

  const toggleAdicional = (mesaId: string) => {
    if (mesaId === mesaPrincipal) return; // Cant add main as additional
    if (mesasAdicionales.includes(mesaId)) {
      setMesasAdicionales(mesasAdicionales.filter(id => id !== mesaId));
    } else {
      setMesasAdicionales([...mesasAdicionales, mesaId]);
    }
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('reservas')
        .update({
          mesa: mesaPrincipal || null,
          mesas_adicionales: mesasAdicionales.length > 0 ? mesasAdicionales : null,
        })
        .eq('reserva_id', reserva.reserva_id);

      if (error) throw error;
      onUpdated();
      onClose();
    } catch (err: any) {
      console.error(err);
      alert('Error al asignar mesa: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
          Asignar Mesa - {reserva.clientes?.nombre_ultimo}
        </h3>

        <div className="mb-4 text-sm text-gray-600 dark:text-gray-300">
          <p>Personas: {reserva.personas}</p>
          <p>Turno: {reserva.turno}</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mesa Principal</label>
            <select
              value={mesaPrincipal}
              onChange={e => {
                setMesaPrincipal(e.target.value);
                setMesasAdicionales(mesasAdicionales.filter(id => id !== e.target.value));
              }}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">-- Sin Asignar --</option>
              {mesasDisponibles.map(m => (
                <option key={`main-${m.mesa}`} value={m.mesa}>
                  {m.mesa} (Zona {m.zona}, {m.capacidad} pax)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mesas Adicionales</label>
            <div className="grid grid-cols-3 gap-2">
              {mesasDisponibles.map(m => (
                <button
                  key={`add-${m.mesa}`}
                  type="button"
                  disabled={m.mesa === mesaPrincipal}
                  onClick={() => toggleAdicional(m.mesa)}
                  className={`p-2 rounded border text-sm transition ${
                    m.mesa === mesaPrincipal
                      ? 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed dark:bg-gray-800 dark:border-gray-700'
                      : mesasAdicionales.includes(m.mesa)
                        ? 'bg-yellow-100 border-yellow-500 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500'
                        : 'bg-white border-gray-300 dark:bg-gray-700 dark:border-gray-600 dark:text-white'
                  }`}
                >
                  {m.mesa}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <button type="button" onClick={onClose} className="flex-1 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
            Cancelar
          </button>
          <button type="button" onClick={handleUpdate} disabled={loading} className="flex-1 p-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold">
            {loading ? 'Guardando...' : 'Guardar Asignación'}
          </button>
        </div>
      </div>
    </div>
  );
}
