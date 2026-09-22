import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FechaPicker from '../components/FechaPicker';
import MesaPlano from '../components/MesaPlano';

type Turno = 'COMIDA' | 'CENA';
type Zona = 'terraza' | 'salon' | 'chillout';

type MesaLayout = { numero: string; x: number; y: number; zona: Zona };
type MesaConfig = { Activa?: boolean; Unible?: boolean; GrupoUnion?: string | null };

type Reserva = {
  ReservaID: string;
  CodigoReserva: string | null;
  FechaReserva: string;
  HoraReserva: string;
  Nombre: string | null;
  Telefono: string | null;
  Personas: number | null;
  Estado: string;
  Mesa: string | null;
  Zona: string | null;
  MesasAdicionales: string | null;
  Turno: string | null;
  Email?: string | null;
};

const PLANOS: Record<Zona, { nombre: string; mesas: MesaLayout[] }> = {
  terraza: {
    nombre: 'TERRAZA',
    mesas: [
      { numero: '15', x: 20, y: 24, zona: 'terraza' }, { numero: '16', x: 38, y: 24, zona: 'terraza' },
      { numero: '17', x: 60, y: 24, zona: 'terraza' }, { numero: '18', x: 78, y: 24, zona: 'terraza' },
      { numero: '14', x: 6, y: 39, zona: 'terraza' }, { numero: '6', x: 19, y: 41, zona: 'terraza' },
      { numero: '5', x: 31, y: 41, zona: 'terraza' }, { numero: '4', x: 43, y: 41, zona: 'terraza' },
      { numero: '3', x: 55, y: 41, zona: 'terraza' }, { numero: '2', x: 67, y: 41, zona: 'terraza' },
      { numero: '1', x: 79, y: 41, zona: 'terraza' }, { numero: '20', x: 92, y: 43, zona: 'terraza' },
      { numero: '13', x: 6, y: 66, zona: 'terraza' }, { numero: '12', x: 19, y: 70, zona: 'terraza' },
      { numero: '11', x: 31, y: 70, zona: 'terraza' }, { numero: '10', x: 43, y: 70, zona: 'terraza' },
      { numero: '9', x: 55, y: 70, zona: 'terraza' }, { numero: '8', x: 67, y: 70, zona: 'terraza' },
      { numero: '7', x: 79, y: 70, zona: 'terraza' }, { numero: '21', x: 92, y: 67, zona: 'terraza' },
    ],
  },
  salon: {
    nombre: 'SALÓN',
    mesas: [
      { numero: '104', x: 20, y: 18, zona: 'salon' }, { numero: '107', x: 50, y: 18, zona: 'salon' },
      { numero: '110', x: 80, y: 18, zona: 'salon' }, { numero: '103', x: 20, y: 43, zona: 'salon' },
      { numero: '106', x: 50, y: 43, zona: 'salon' }, { numero: '109', x: 80, y: 43, zona: 'salon' },
      { numero: '102', x: 20, y: 68, zona: 'salon' }, { numero: '105', x: 50, y: 68, zona: 'salon' },
      { numero: '108', x: 80, y: 68, zona: 'salon' }, { numero: '101', x: 50, y: 88, zona: 'salon' },
    ],
  },
  chillout: {
    nombre: 'CHILL OUT',
    mesas: [
      { numero: '204', x: 33, y: 18, zona: 'chillout' }, { numero: '205', x: 49, y: 18, zona: 'chillout' },
      { numero: '208', x: 65, y: 18, zona: 'chillout' }, { numero: '203', x: 33, y: 39, zona: 'chillout' },
      { numero: '206', x: 49, y: 39, zona: 'chillout' }, { numero: '209', x: 65, y: 39, zona: 'chillout' },
      { numero: '202', x: 33, y: 60, zona: 'chillout' }, { numero: '207', x: 49, y: 60, zona: 'chillout' },
      { numero: '210', x: 65, y: 60, zona: 'chillout' }, { numero: '201', x: 33, y: 81, zona: 'chillout' },
    ],
  },
};

const ESTADOS_ACTIVOS = new Set(['PENDIENTE', 'CONFIRMADA', 'SENTADA']);

function todayMadrid() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function formatHeaderDate(iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const date = new Date(y, m - 1, d);
  const days = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  const months = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE'];
  return days[date.getDay()] + ' ' + d + ' ' + months[m - 1] + ' ' + y;
}

function parseAssignedTables(reserva: Reserva | null) {
  const result: string[] = [];
  const add = (value: unknown) => {
    if (Array.isArray(value)) value.forEach(add);
    else if (value !== null && value !== undefined) {
      String(value).split(',').forEach(part => {
        const n = part.replace(/[^0-9]/g, '').trim();
        if (n && !result.includes(n)) result.push(n);
      });
    }
  };
  add(reserva?.Mesa);
  add(reserva?.MesasAdicionales);
  return result;
}

function reservationForTable(reservas: Reserva[], numero: string) {
  const matches = reservas.filter(r => parseAssignedTables(r).includes(numero));
  if (!matches.length) return null;
  const occupied = matches.find(r => r.Estado === 'SENTADA');
  return occupied || matches[0];
}

function visualState(reserva: Reserva | null) {
  if (!reserva || !ESTADOS_ACTIVOS.has(reserva.Estado)) return 'disponible';
  if (reserva.Estado === 'SENTADA') return 'ocupada';
  return 'reservada';
}

function normalizarMesasConfig(data: any[]) {
  return data.reduce<Record<string, MesaConfig>>((acc, row) => {
    const numero = String(row.Mesa || '').trim();
    if (numero) acc[numero] = { Activa: row.Activa !== false, Unible: row.Unible !== false, GrupoUnion: row.GrupoUnion || null };
    return acc;
  }, {});
}

export default function Mesas() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [fecha, setFecha] = useState(todayMadrid());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [turno, setTurno] = useState<Turno>('COMIDA');
  const [zona, setZona] = useState<Zona>('salon');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [mesasConfig, setMesasConfig] = useState<Record<string, MesaConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const assignmentId = searchParams.get('asignar');
  const [assignmentReserva, setAssignmentReserva] = useState<Reserva | null>(null);
  const [assignmentTables, setAssignmentTables] = useState<string[]>([]);
  const assignmentMode = Boolean(assignmentId);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    const [mesasResult, reservasResult] = await Promise.all([
      supabase.from('Mesas').select('*'),
      supabase
        .from('Reservas')
        .select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Zona,MesasAdicionales,Turno')
        .eq('FechaReserva', fecha)
        .eq('Turno', turno)
        .in('Estado', ['PENDIENTE','CONFIRMADA','SENTADA'])
        .order('HoraReserva', { ascending: true }),
    ]);
    if (mesasResult.error) console.warn('Mesas config:', mesasResult.error.message);
    if (reservasResult.error) setError(reservasResult.error.message);
    setMesasConfig(normalizarMesasConfig(mesasResult.data || []));
    setReservas((reservasResult.data || []) as Reserva[]);
    setLoading(false);
  }, [fecha, turno]);

  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    if (!assignmentId) { setAssignmentReserva(null); setAssignmentTables([]); return; }
    let alive = true;
    (async () => {
      const { data, error } = await supabase.from('Reservas').select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Zona,MesasAdicionales,Turno,Email').eq('ReservaID', assignmentId).maybeSingle();
      if (!alive) return;
      if (error) { setError(error.message); return; }
      const reserva = (data || null) as Reserva | null;
      setAssignmentReserva(reserva);
      if (reserva) {
        const hora = Number(String(reserva.HoraReserva || '00').slice(0,2));
        setFecha(reserva.FechaReserva);
        setTurno(hora >= 18 ? 'CENA' : 'COMIDA');
        setAssignmentTables(parseAssignedTables(reserva));
        if (reserva.Zona === 'TERRAZA') setZona('terraza');
        else if (reserva.Zona === 'CHILL OUT' || reserva.Zona === 'CHILLOUT') setZona('chillout');
        else setZona('salon');
      }
    })();
    return () => { alive = false; };
  }, [assignmentId]);

  const layout = PLANOS[zona];
  const reservaSeleccionada = selectedTable ? reservationForTable(reservas, selectedTable) : null;
  const configSeleccionada = selectedTable ? mesasConfig[selectedTable] : undefined;

  const abrirReserva = () => {
    if (!reservaSeleccionada?.CodigoReserva) return;
    navigate('/buscar?codigo=' + encodeURIComponent(reservaSeleccionada.CodigoReserva));
    setSelectedTable(null);
  };

  const actualizarEstado = async (estado: 'SENTADA' | 'FINALIZADA') => {
    if (!reservaSeleccionada?.ReservaID || saving) return;
    setSaving(true);
    const { error: updateError } = await supabase
      .from('Reservas')
      .update({ Estado: estado, FechaEstado: new Date().toISOString(), FechaModificacion: new Date().toISOString() })
      .eq('ReservaID', reservaSeleccionada.ReservaID);
    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }
    setSelectedTable(null);
    await cargar();
    setSaving(false);
  };

  const ocuparMesa = async () => {
    if (!selectedTable || saving) return;
    const now = new Date();
    setSaving(true);
    const { data, error: insertError } = await supabase
      .from('Reservas')
      .insert({
        CodigoReserva: 'MESA-' + selectedTable + '-' + Date.now().toString(36).toUpperCase(),
        FechaCreacion: now.toISOString(),
        FechaReserva: fecha,
        HoraReserva: now.toTimeString().slice(0, 8),
        Nombre: 'SIN RESERVA',
        Telefono: null,
        Email: null,
        Personas: 1,
        Observaciones: null,
        Estado: 'SENTADA',
        FechaEstado: now.toISOString(),
        UsuarioEstado: user?.email || 'PRIVADO',
        Mesa: selectedTable,
        Zona: zona.toUpperCase(),
        ClienteID: null,
        FechaModificacion: now.toISOString(),
        OrigenReserva: 'PRIVADO',
        CreadaPor: user?.email || 'PRIVADO',
        MesasAdicionales: null,
        Turno: turno,
      })
      .select('ReservaID')
      .single();
    if (insertError) {
      setError(insertError.message);
      setSaving(false);
      return;
    }
    if (!data?.ReservaID) {
      setError('No se pudo crear la ocupación de la mesa.');
      setSaving(false);
      return;
    }
    setSelectedTable(null);
    await cargar();
    setSaving(false);
  };

  const toggleAssignmentTable = (numero: string) => {
    if (!assignmentMode || mesasConfig[numero]?.Activa === false) return;
    setAssignmentTables(current => current.includes(numero) ? current.filter(x => x !== numero) : [...current, numero]);
  };
  const guardarAsignacion = async () => {
    if (!assignmentReserva || saving) return;
    setSaving(true); setError('');
    const principal = assignmentTables[0] || null;
    const adicionales = assignmentTables.slice(1);
    const principalLayout = Object.values(PLANOS).flatMap(p => p.mesas).find(m => m.numero === principal);
    const zonaAsignada = principalLayout ? principalLayout.zona.toUpperCase().replace('CHILLOUT','CHILL OUT') : null;
    const { error: updateError } = await supabase.from('Reservas').update({ Mesa: principal, MesasAdicionales: adicionales.length ? adicionales.join(', ') : null, Zona: zonaAsignada, Turno: turno, FechaModificacion: new Date().toISOString() }).eq('ReservaID', assignmentReserva.ReservaID);
    setSaving(false);
    if (updateError) { setError(updateError.message); return; }
    navigate('/');
  };

  const estado: 'disponible' | 'reservada' | 'ocupada' | 'desactivada' = selectedTable && mesasConfig[selectedTable]?.Activa === false ? 'desactivada' : (selectedTable ? visualState(reservaSeleccionada) : 'disponible');

  const mesasVisibles = useMemo(() => layout.mesas.map(m => ({
    ...m,
    estado: mesasConfig[m.numero]?.Activa === false ? 'desactivada' : visualState(reservationForTable(reservas, m.numero)),
  })), [layout.mesas, mesasConfig, reservas]);

  return (
    <section className="cr-planos-mesas" aria-label="Planos de mesas">
      <button className="cr-planos-mesas__backdrop" type="button" aria-label="Cerrar" onClick={() => navigate('/')} />
      <div className={'cr-planos-mesas__panel' + (assignmentMode ? ' cr-planos-mesas__panel--asignacion' : '')}>
        <header className="cr-planos-mesas__header">
          <h2>{assignmentMode ? 'ASIGNAR MESA' : 'PLANOS DE MESAS'}</h2>
          <button type="button" className="cr-planos-mesas__cerrar" onClick={() => navigate('/')}>CERRAR</button>
        </header>

        {assignmentMode && assignmentReserva ? <div className="cr-planos-mesas__reserva-info"><div><span>NOMBRE</span><strong>{assignmentReserva.Nombre || 'SIN NOMBRE'}</strong></div><div className="cr-planos-mesas__reserva-fecha">📅 {formatHeaderDate(assignmentReserva.FechaReserva)}</div><div className="cr-planos-mesas__reserva-grid"><div><span>MESAS ASIGNADAS</span><strong>{assignmentTables.length ? assignmentTables.join(', ') : 'SIN ASIGNAR'}</strong></div><div><span>TELÉFONO</span><strong>{assignmentReserva.Telefono || '—'}</strong></div><div><span>HORA</span><strong>{String(assignmentReserva.HoraReserva).slice(0,5)}</strong></div><div><span>PERSONAS</span><strong>{assignmentReserva.Personas || 0} PAX</strong></div></div></div> : <button className="cr-planos-mesas__fecha" type="button" onClick={() => setCalendarOpen(true)} aria-label="Cambiar fecha">📅 {formatHeaderDate(fecha)}</button>}

        {!assignmentMode && <div className="cr-planos-mesas__turnos" role="tablist" aria-label="Turnos">
          <button type="button" className={turno === 'COMIDA' ? 'activo' : ''} onClick={() => setTurno('COMIDA')}>☀ COMIDA</button>
          <button type="button" className={turno === 'CENA' ? 'activo' : ''} onClick={() => setTurno('CENA')}>🌙 CENA</button>
        </div>}

        <div className="cr-planos-mesas__tabs" role="tablist" aria-label="Zonas">
          {(Object.keys(PLANOS) as Zona[]).map(key => (
            <button key={key} type="button" className={zona === key ? 'activo' : ''} onClick={() => setZona(key)}>
              {PLANOS[key].nombre}
            </button>
          ))}
        </div>

        {loading && <div className="cr-planos-mesas__loading">CARGANDO MESAS...</div>}
        <MesaPlano
          layout={layout}
          zona={zona}
          mesas={mesasVisibles}
          assignmentMode={assignmentMode}
          assignmentTables={assignmentTables}
          onTableClick={numero => assignmentMode ? toggleAssignmentTable(numero) : setSelectedTable(numero)}
        />

        {assignmentMode && <div className="cr-planos-mesas__assignment-actions"><div>SELECCIONA UNA O VARIAS MESAS Y PULSA GUARDAR ASIGNACIÓN PARA ACTUALIZAR LA RESERVA.</div><button type="button" className="primario" disabled={saving} onClick={() => void guardarAsignacion()}>{saving ? 'GUARDANDO...' : 'GUARDAR ASIGNACIÓN'}</button></div>}
        {error && <div className="cr-planos-mesas__error">{error}</div>}
      </div>

      {selectedTable && (
        <div className="cr-planos-mesas__dialog" role="dialog" aria-modal="true" aria-label={'Mesa ' + selectedTable}>
          <button className="cr-planos-mesas__dialog-backdrop" type="button" aria-label="Cerrar" onClick={() => setSelectedTable(null)} />
          <div className="cr-planos-mesas__dialog-panel">
            {estado === 'disponible' && (
              <>
                <div className="cr-planos-mesas__dialog-title">MESA {selectedTable}</div>
                <div className="cr-planos-mesas__dialog-text">¿MARCAR COMO OCUPADA?</div>
                <div className="cr-planos-mesas__dialog-actions cr-planos-mesas__dialog-actions--one">
                  <button type="button" className="primario" disabled={saving} onClick={() => void ocuparMesa()}>{saving ? 'OCUPANDO...' : 'OCUPAR MESA'}</button>
                  <button type="button" onClick={() => setSelectedTable(null)}>CERRAR</button>
                </div>
              </>
            )}

            {estado === 'reservada' && reservaSeleccionada && (
              <>
                <div className="cr-planos-mesas__dialog-title">MESA {selectedTable}</div>
                <div className="cr-planos-mesas__dialog-type">MESA PRINCIPAL</div>
                <div className="cr-planos-mesas__dialog-name">{reservaSeleccionada.Nombre || 'SIN NOMBRE'}</div>
                <div className="cr-planos-mesas__dialog-phone">{reservaSeleccionada.Telefono || 'SIN TELÉFONO'}</div>
                <div className="cr-planos-mesas__dialog-data">{String(reservaSeleccionada.HoraReserva).slice(0,5)} · {reservaSeleccionada.Personas || '—'} PAX</div>
                <div className="cr-planos-mesas__dialog-code">CÓDIGO: {reservaSeleccionada.CodigoReserva || reservaSeleccionada.ReservaID}</div>
                <div className="cr-planos-mesas__dialog-state">ESTADO: {reservaSeleccionada.Estado}</div>
                <div className="cr-planos-mesas__dialog-tables">MESAS: {parseAssignedTables(reservaSeleccionada).join(', ') || 'SIN ASIGNAR'}</div>
                <div className="cr-planos-mesas__dialog-actions">
                  <button type="button" className="primario" disabled={saving} onClick={() => void actualizarEstado('SENTADA')}>{saving ? 'GUARDANDO...' : 'SENTAR MESA'}</button>
                  <button type="button" className="primario" onClick={abrirReserva}>ABRIR RESERVA</button>
                  <button type="button" onClick={() => setSelectedTable(null)}>CERRAR</button>
                </div>
              </>
            )}

            {estado === 'ocupada' && reservaSeleccionada && (
              <>
                <div className="cr-planos-mesas__dialog-title">MESA {selectedTable}</div>
                <div className="cr-planos-mesas__dialog-type">{reservaSeleccionada.Nombre === 'SIN RESERVA' ? 'SIN RESERVA' : 'MESA PRINCIPAL'}</div>
                <div className="cr-planos-mesas__dialog-name">{reservaSeleccionada.Nombre || 'SIN NOMBRE'}</div>
                <div className="cr-planos-mesas__dialog-phone">{reservaSeleccionada.Telefono || 'SIN TELÉFONO'}</div>
                <div className="cr-planos-mesas__dialog-data">{String(reservaSeleccionada.HoraReserva).slice(0,5)} · {reservaSeleccionada.Personas || '—'} PAX</div>
                <div className="cr-planos-mesas__dialog-code">CÓDIGO: {reservaSeleccionada.CodigoReserva || reservaSeleccionada.ReservaID}</div>
                <div className="cr-planos-mesas__dialog-state">ESTADO: {reservaSeleccionada.Estado}</div>
                <div className="cr-planos-mesas__dialog-tables">MESAS: {parseAssignedTables(reservaSeleccionada).join(', ') || selectedTable}</div>
                <div className="cr-planos-mesas__dialog-actions">
                  <button type="button" className="primario" disabled={saving} onClick={() => void actualizarEstado('FINALIZADA')}>{saving ? 'GUARDANDO...' : (reservaSeleccionada.Nombre === 'SIN RESERVA' ? 'FINALIZAR MESA' : 'FINALIZAR RESERVA')}</button>
                  {reservaSeleccionada.Nombre !== 'SIN RESERVA' && <button type="button" className="primario" onClick={abrirReserva}>ABRIR RESERVA</button>}
                  <button type="button" onClick={() => setSelectedTable(null)}>CERRAR</button>
                </div>
              </>
            )}

            {estado === 'desactivada' && (
              <>
                <div className="cr-planos-mesas__dialog-title">MESA {selectedTable}</div>
                <div className="cr-planos-mesas__dialog-text">MESA DESACTIVADA</div>
                <div className="cr-planos-mesas__dialog-actions cr-planos-mesas__dialog-actions--one">
                  <button type="button" onClick={() => setSelectedTable(null)}>CERRAR</button>
                </div>
              </>
            )}

            {configSeleccionada?.GrupoUnion && (
              <div className="cr-planos-mesas__dialog-union">GRUPO DE UNIÓN: {configSeleccionada.GrupoUnion}</div>
            )}
          </div>
        </div>
      )}
      {calendarOpen && <FechaPicker value={fecha} onChange={setFecha} onClose={() => setCalendarOpen(false)} />}
    </section>
  );
}
