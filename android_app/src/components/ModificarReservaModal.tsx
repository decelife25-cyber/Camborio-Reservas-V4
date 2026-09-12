import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

interface Props {
  reserva: any;
  onClose: () => void;
  onUpdated: () => void;
}

export default function ModificarReservaModal({ reserva, onClose, onUpdated }: Props) {
  const [fecha, setFecha] = useState(reserva.fecha_reserva || '');
  const [hora, setHora] = useState(String(reserva.hora_reserva || '').slice(0, 5));
  const [personas, setPersonas] = useState(reserva.personas || 2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const nuevoTurno = getTurnoFromHora(hora);
      let updatePayload: any = {
        fecha_reserva: fecha,
        hora_reserva: hora,
        personas: Number(personas),
        turno: nuevoTurno,
      };

      // REGLA CRUCIAL: Cambio de turno o fecha = se limpia mesa
      const isCambioFecha = fecha !== reserva.fecha_reserva;
      const isCambioTurno = nuevoTurno !== reserva.turno;

      if (isCambioFecha || isCambioTurno) {
        updatePayload.mesa = null;
        updatePayload.mesas_adicionales = null;
      }

      const { error: updateError } = await supabase
        .from('reservas')
        .update(updatePayload)
        .eq('reserva_id', reserva.reserva_id);

      if (updateError) throw updateError;

      // Log action
      await supabase.from('log').insert({
        reserva_id: reserva.reserva_id,
        accion: 'MODIFICACION',
        usuario: 'PERSONAL',
        detalles: `Modificada a ${fecha} ${hora} (${personas}p). ${
          (isCambioFecha || isCambioTurno) ? 'Mesas liberadas por cambio de fecha/turno.' : ''
        }`
      });

      onUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error al actualizar reserva');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl w-full max-w-md">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Modificar Reserva</h3>

        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}

        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Fecha</label>
            <input
              type="date"
              value={fecha}
              onChange={e => setFecha(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Hora</label>
            <input
              type="time"
              value={hora}
              onChange={e => setHora(e.target.value)}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Personas</label>
            <input
              type="number"
              min="1"
              value={personas}
              onChange={e => setPersonas(parseInt(e.target.value))}
              className="w-full p-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              required
            />
          </div>

          <div className="flex gap-4 mt-6">
            <button type="button" onClick={onClose} className="flex-1 p-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 p-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-bold">
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
