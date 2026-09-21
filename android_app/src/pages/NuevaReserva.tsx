import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';

const HOURS = Array.from({ length: 15 }, (_, i) => String(i + 9).padStart(2, '0'));
const MINUTES = ['00', '15', '30', '45'];

const todayMadrid = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });

function WheelPicker({ values, value, onChange }: { values: string[]; value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const itemHeight = 44;
  const index = Math.max(0, values.indexOf(value));

  const center = (nextIndex: number, smooth = true) => {
    const safe = Math.max(0, Math.min(values.length - 1, nextIndex));
    onChange(values[safe]);
    requestAnimationFrame(() => {
      ref.current?.scrollTo({ top: safe * itemHeight, behavior: smooth ? 'smooth' : 'auto' });
    });
  };

  useEffect(() => {
    ref.current?.scrollTo({ top: index * itemHeight, behavior: 'auto' });
  }, []);

  function onScroll() {
    const el = ref.current;
    if (!el) return;
    const next = Math.max(0, Math.min(values.length - 1, Math.round(el.scrollTop / itemHeight)));
    if (values[next] !== value) onChange(values[next]);
  }

  return (
    <div className="v2-wheel-wrap">
      <button type="button" className="v2-wheel-arrow v2-wheel-arrow-top" onClick={() => center(index - 1)} aria-label="Anterior"><ChevronUp size={18} /></button>
      <div className="v2-wheel" ref={ref} onScroll={onScroll}>
        <div className="v2-wheel-spacer" />
        {values.map((item) => <div key={item} className={'v2-wheel-item ' + (item === value ? 'is-current' : '')}>{item}</div>)}
        <div className="v2-wheel-spacer" />
      </div>
      <button type="button" className="v2-wheel-arrow v2-wheel-arrow-bottom" onClick={() => center(index + 1)} aria-label="Siguiente"><ChevronDown size={18} /></button>
    </div>
  );
}

export default function NuevaReserva() {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [personas, setPersonas] = useState(2);
  const [fecha, setFecha] = useState(todayMadrid());
  const [hora, setHora] = useState('13');
  const [minutos, setMinutos] = useState('15');
  const [mesa, setMesa] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const horaReserva = useMemo(() => hora + ':' + minutos, [hora, minutos]);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!nombre.trim()) { setError('Introduce el nombre del cliente.'); return; }

    const fechaHora = new Date(fecha + 'T' + horaReserva + ':00');
    if (Number.isNaN(fechaHora.getTime()) || fechaHora.getTime() < Date.now() - 60000) {
      setError('No puedes crear una reserva con fecha u hora pasada.');
      return;
    }

    setSaving(true);
    try {
      if (telefono.trim()) {
        const { data: dup, error: de } = await supabase
          .from('Reservas')
          .select('ReservaID,Turno,Estado')
          .eq('FechaReserva', fecha)
          .eq('Telefono', telefono.trim());
        if (de) throw de;
        const turno = getTurnoFromHora(horaReserva);
        if ((dup || []).some((r: any) => r.Turno === turno && !['CANCELADA_CLIENTE', 'CANCELADA_LOCAL'].includes(r.Estado))) {
          setError('Ya existe una reserva activa con este teléfono para ese día y turno.');
          setSaving(false);
          return;
        }
      }

      const { data, error: ie } = await supabase.from('Reservas').insert({
        Nombre: nombre.trim(),
        Telefono: telefono.trim() || null,
        Personas: personas,
        FechaReserva: fecha,
        HoraReserva: horaReserva,
        Turno: getTurnoFromHora(horaReserva),
        Mesa: mesa.trim() || null,
        MesasAdicionales: null,
        Observaciones: observaciones.trim() || null,
        Estado: 'CONFIRMADA'
      }).select('CodigoReserva').single();

      if (ie) throw ie;
      setMessage('RESERVA REALIZADA · CÓDIGO ' + (data?.CodigoReserva || '—'));
      setNombre(''); setTelefono(''); setPersonas(2); setMesa(''); setObservaciones('');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'No se pudo crear la reserva.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="v2-new-reservation-overlay" role="dialog" aria-modal="true" aria-labelledby="v2NuevaReservaTitulo">
      <button className="v2-new-reservation-backdrop" type="button" aria-label="Cerrar" onClick={() => window.history.back()} />
      <div className="v2-new-reservation-panel">
        <header className="v2-new-reservation-header">
          <h2 id="v2NuevaReservaTitulo">CREAR NUEVA RESERVA</h2>
          <button type="button" className="v2-new-reservation-close" onClick={() => window.history.back()}><X size={16} /> CERRAR</button>
        </header>

        <form className="v2-new-reservation-form" onSubmit={guardar}>
          <label className="v2-full">NOMBRE
            <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre del cliente" autoComplete="name" required />
          </label>

          <label className="v2-full">TELÉFONO
            <input value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel" placeholder="Número de teléfono" autoComplete="tel" />
          </label>

          <div className="v2-personas-field">
            <span>PERSONAS</span>
            <div className="v2-personas-control">
              <button type="button" onClick={() => setPersonas(p => Math.max(1, p - 1))}>−</button>
              <strong>{personas} PAX</strong>
              <button type="button" onClick={() => setPersonas(p => p + 1)}>+</button>
            </div>
          </div>

          <div className="v2-wheel-field">
            <span>HORA</span>
            <WheelPicker values={HOURS} value={hora} onChange={setHora} />
          </div>

          <div className="v2-wheel-field">
            <span>MINUTOS</span>
            <WheelPicker values={MINUTES} value={minutos} onChange={setMinutos} />
          </div>

          <label>FECHA
            <input type="date" min={todayMadrid()} value={fecha} onChange={e => setFecha(e.target.value)} required />
          </label>

          <label className="v2-mesa-field">MESA ASIGNADA
            <button type="button" className="v2-mesa-button" onClick={() => setMesa(mesa ? '' : '')}>
              <strong>{mesa.trim() ? 'MESA ' + mesa.trim() : 'SIN ASIGNAR'}</strong>
            </button>
          </label>

          <label className="v2-full">OBSERVACIONES
            <textarea value={observaciones} onChange={e => setObservaciones(e.target.value)} rows={2} placeholder="Observaciones sobre la reserva" />
          </label>

          {error && <div className="v2-form-message v2-form-error">{error}</div>}
          {message && <div className="v2-form-message v2-form-success">{message}</div>}

          <button className="v2-create-button" disabled={saving}>{saving ? 'GUARDANDO...' : 'CREAR RESERVA'}</button>
        </form>
      </div>
    </section>
  );
}
