import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import FechaPicker from '../components/FechaPicker';
import { getTurnoFromHora } from '../utils/shifts';

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

type NuevaReservaBorrador = { nombre:string; telefono:string; personas:number; fecha:string; horaReserva:string; observaciones:string; mesa?:string; mesasAdicionales?:string[] };

type ConfirmModal = {
  titulo: string;
  mensaje: string;
  aceptar: string;
  cancelar: string;
  alAceptar: () => void | Promise<void>;
  alCancelar?: () => void;
  soloAviso?: boolean;
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
  const [zona, setZona] = useState<Zona>('terraza');
  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [mesasConfig, setMesasConfig] = useState<Record<string, MesaConfig>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const assignmentId = searchParams.get('asignar');
  const nuevaAssignment = searchParams.get('nueva') === '1';
  const volverCodigo = searchParams.get('volverCodigo') || '';
  const accion = searchParams.get('accion') || '';
  const [assignmentReserva, setAssignmentReserva] = useState<Reserva | null>(null);
  const [nuevaBorrador, setNuevaBorrador] = useState<NuevaReservaBorrador | null>(null);
  const [assignmentTables, setAssignmentTables] = useState<string[]>([]);
  const assignmentTablesRef = useRef<string[]>([]);
  const assignmentOriginalRef = useRef<string[]>([]);
  const savingRef = useRef(false);
  const [confirmModal, setConfirmModal] = useState<ConfirmModal | null>(null);
  const assignmentMode = Boolean(assignmentId || nuevaAssignment);

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
    if (!assignmentId && !nuevaAssignment) {
      setAssignmentReserva(null); setNuevaBorrador(null);
      setAssignmentTables([]); assignmentTablesRef.current=[]; assignmentOriginalRef.current=[]; setConfirmModal(null);
      return;
    }
    let alive=true;
    (async()=>{
      if(nuevaAssignment && !assignmentId){
        try{
          const raw=sessionStorage.getItem('camborio_nueva_reserva_borrador');
          const borrador=raw?JSON.parse(raw) as NuevaReservaBorrador:null;
          if(!borrador?.nombre||!borrador?.fecha||!borrador?.horaReserva){setError('No se encontraron los datos de la nueva reserva.');return;}
          if(!alive)return;
          const mesasBorrador = [borrador.mesa, ...(Array.isArray(borrador.mesasAdicionales) ? borrador.mesasAdicionales : [])]
            .map(v => String(v || '').trim())
            .filter(Boolean);
          setNuevaBorrador(borrador); setAssignmentReserva(null); setFecha(borrador.fecha);
          setTurno(getTurnoFromHora(borrador.horaReserva)); setZona('terraza');
          setAssignmentTables(mesasBorrador); assignmentTablesRef.current=[...mesasBorrador]; assignmentOriginalRef.current=[...mesasBorrador];
          return;
        }catch{setError('No se pudieron recuperar los datos de la nueva reserva.');return;}
      }
      const {data,error}=await supabase.from('Reservas').select('ReservaID,CodigoReserva,FechaReserva,HoraReserva,Nombre,Telefono,Personas,Estado,Mesa,Zona,MesasAdicionales,Turno,Email').eq('ReservaID',assignmentId).maybeSingle();
      if(!alive)return;
      if(error){setError(error.message);return;}
      const reserva=(data||null) as Reserva|null; setAssignmentReserva(reserva); setNuevaBorrador(null);
      if(reserva){
        const hora=Number(String(reserva.HoraReserva||'00').slice(0,2)); setFecha(reserva.FechaReserva); setTurno(hora>=18?'CENA':'COMIDA');
        const mesasAsignadas=parseAssignedTables(reserva); setAssignmentTables(mesasAsignadas); assignmentTablesRef.current=mesasAsignadas; assignmentOriginalRef.current=[...mesasAsignadas];
        if(reserva.Zona==='TERRAZA')setZona('terraza'); else if(reserva.Zona==='CHILL OUT'||reserva.Zona==='CHILLOUT')setZona('chillout'); else setZona('terraza');
      }
    })();
    return()=>{alive=false};
  }, [assignmentId,nuevaAssignment]);

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

    const fechaReserva = String(reservaSeleccionada.FechaReserva || '').slice(0, 10);
    const turnoReserva = String(reservaSeleccionada.Turno || '').trim().toUpperCase();
    const turnoContexto = String(turno || '').trim().toUpperCase();

    if (fechaReserva !== fecha || (turnoReserva && turnoReserva !== turnoContexto)) {
      setError('La reserva no pertenece al día y turno actuales del plano.');
      return;
    }

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
        CodigoReserva: null,
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

  const mesasVisibles = useMemo(() => layout.mesas.map(m => {
    const reservaMesa = reservationForTable(reservas, m.numero);
    const mesasAsignadas = parseAssignedTables(reservaMesa);
    const numeroPrincipal = mesasAsignadas[0] || m.numero;
    return {
      ...m,
      estado: mesasConfig[m.numero]?.Activa === false ? 'desactivada' : visualState(reservaMesa),
      numeroVisual: !assignmentMode && reservaMesa ? numeroPrincipal : m.numero,
    };
  }), [layout.mesas, mesasConfig, reservas, assignmentMode]);

  const assignmentSet = new Set(assignmentTablesRef.current);
  const assignmentOriginalSet = new Set(assignmentOriginalRef.current);

  const sincronizarSeleccionMesasDOM = (next:string[]) => {
    const panel = document.querySelector('.cr-planos-mesas__panel--asignacion');
    if (!panel) return;
    panel.querySelectorAll<HTMLElement>('[data-mesa-numero]').forEach(button => {
      const numero = String(button.dataset.mesaNumero || '');
      const seleccionada = next.includes(numero);
      const original = assignmentOriginalRef.current.includes(numero);
      const indice = next.indexOf(numero);
      if (!seleccionada && (
        button.classList.contains('cr-planos-mesas__mesa--reservada') ||
        button.classList.contains('cr-planos-mesas__mesa--ocupada') ||
        button.classList.contains('cr-planos-mesas__mesa--desactivada')
      )) return;
      button.classList.remove(
        'cr-planos-mesas__mesa--principal',
        'cr-planos-mesas__mesa--adicional',
        'cr-planos-mesas__mesa--seleccionada',
        'cr-planos-mesas__mesa--disponible',
      );
      if (seleccionada) {
        if (original) {
          button.classList.add(indice === 0 ? 'cr-planos-mesas__mesa--principal' : 'cr-planos-mesas__mesa--adicional');
        } else {
          button.classList.add('cr-planos-mesas__mesa--seleccionada');
        }
      } else {
        button.classList.add('cr-planos-mesas__mesa--disponible');
      }
      button.setAttribute('aria-pressed', seleccionada ? 'true' : 'false');
    });

    const resumen = panel.querySelector<HTMLElement>('[data-cr-asignacion-resumen]');
    const etiqueta = panel.querySelector<HTMLElement>('[data-cr-asignacion-etiqueta]');
    const guardar = panel.querySelector<HTMLButtonElement>('[data-cr-guardar-asignacion]');
    const cambio = next.join(',') !== assignmentOriginalRef.current.join(',');
    if (resumen) {
      resumen.textContent = next.length ? next.join(', ') : 'SIN ASIGNAR';
      resumen.classList.toggle('cr-planos-mesas__asignacion--asignada', next.join(',') === assignmentOriginalRef.current.join(',') && next.length > 0);
      resumen.classList.toggle('cr-planos-mesas__asignacion--pendiente', cambio && next.length > 0);
    }
    if (etiqueta) etiqueta.textContent = next.length === 1 ? 'MESA ASIGNADA' : 'MESAS ASIGNADAS';
    if (guardar) guardar.disabled = savingRef.current || !cambio || (Boolean(nuevaBorrador) && next.length === 0);
  };

  const toggleAssignmentTable = (numero:string) => {
    if(!assignmentMode || mesasConfig[numero]?.Activa===false)return;
    const mesaVisible=mesasVisibles.find(m=>m.numero===numero);
    const esMesaOriginal = assignmentOriginalRef.current.includes(numero);
    if(mesaVisible && mesaVisible.estado!=='disponible' && !assignmentTablesRef.current.includes(numero) && !esMesaOriginal)return;
    const current=assignmentTablesRef.current;
    const indice=current.indexOf(numero);
    const next=indice===0?[]:indice!==-1?current.filter(x=>x!==numero):[...current,numero];
    assignmentTablesRef.current=next;
    sincronizarSeleccionMesasDOM(next);
  };

  const mesaTapTimerRef = useRef<number | null>(null);
  const mesaTapLastKeyRef = useRef('');

  const limpiarToqueMesa = () => {
    if (mesaTapTimerRef.current !== null) {
      window.clearTimeout(mesaTapTimerRef.current);
      mesaTapTimerRef.current = null;
    }
    mesaTapLastKeyRef.current = '';
  };

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      const button = target?.closest('[data-mesa-numero]') as HTMLButtonElement | null;
      if (!button) return;
      const numero = button.dataset.mesaNumero || '';
      if (!numero) return;

      if (assignmentMode) {
        toggleAssignmentTable(numero);
        return;
      }

      const zonaMesa = button.dataset.mesaZona || zona;
      const claveToque = zonaMesa + ':' + numero;
      const esDobleToque = mesaTapTimerRef.current !== null && mesaTapLastKeyRef.current === claveToque;

      if (!esDobleToque) {
        limpiarToqueMesa();
        mesaTapLastKeyRef.current = claveToque;
        mesaTapTimerRef.current = window.setTimeout(() => {
          mesaTapTimerRef.current = null;
          mesaTapLastKeyRef.current = '';
          setSelectedTable(numero);
        }, 320);
        return;
      }

      limpiarToqueMesa();
      setSelectedTable(numero);
    };

    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('click', onClick);
      limpiarToqueMesa();
    };
  }, [assignmentMode, zona, mesasConfig, mesasVisibles, nuevaBorrador]);

  const tieneCambiosAsignacion=()=>assignmentTablesRef.current.join(',')!==assignmentOriginalRef.current.join(',');

  const cerrarAsignacion=()=>{
    if(!assignmentMode||savingRef.current)return;
    if(!tieneCambiosAsignacion()){navigate('/');return;}
    setConfirmModal({
      titulo:'CAMBIOS SIN GUARDAR',
      mensaje:'¿CERRAR SIN GUARDAR?',
      cancelar:'SEGUIR EDITANDO',
      aceptar:'CERRAR SIN GUARDAR',
      alAceptar:()=>{
        const original=[...assignmentOriginalRef.current];
        assignmentTablesRef.current=original;
        setAssignmentTables(original);
        setConfirmModal(null);
        navigate('/');
      },
      alCancelar:()=>setConfirmModal(null)
    });
  };

  const guardarAsignacion = async () => {
    if ((!assignmentReserva && !nuevaBorrador) || savingRef.current || saving) return;

    const mesasSeleccionadas = [...assignmentTablesRef.current];
    const principal = mesasSeleccionadas[0] || null;
    const adicionales = mesasSeleccionadas.slice(1);
    const asignacionNueva = mesasSeleccionadas.join(', ');

    // Contrato V2: una asignación no puede repetir mesas y todas deben
    // existir/estar activas y pertenecer a la misma zona que la principal.
    const mesasUnicas = [...new Set(mesasSeleccionadas)];
    if (mesasUnicas.length !== mesasSeleccionadas.length) {
      setError('CR_MESA_REPETIDA: no se puede seleccionar la misma mesa más de una vez.');
      return;
    }

    const catalogoPlanos = Object.values(PLANOS).flatMap(plano => plano.mesas);
    const mesasInvalidas = mesasSeleccionadas.filter(numero => {
      const layoutMesa = catalogoPlanos.find(mesa => mesa.numero === numero);
      return !layoutMesa || mesasConfig[numero]?.Activa === false;
    });
    if (mesasInvalidas.length) {
      setError('CR_MESA_INEXISTENTE: una de las mesas seleccionadas no existe o no está activa.');
      return;
    }

    if (principal) {
      const principalLayout = catalogoPlanos.find(mesa => mesa.numero === principal);
      const zonaPrincipal = principalLayout?.zona;
      const zonasSeleccionadas = mesasSeleccionadas
        .map(numero => catalogoPlanos.find(mesa => mesa.numero === numero)?.zona)
        .filter(Boolean);
      if (!zonaPrincipal || zonasSeleccionadas.some(zonaMesa => zonaMesa !== zonaPrincipal)) {
        setError('CR_ZONA_INVALIDA: la zona no corresponde a la mesa principal.');
        return;
      }
    }

    if (nuevaBorrador) {
      if (!asignacionNueva) {
        setError('Selecciona al menos una mesa antes de volver a la reserva.');
        return;
      }
      try {
        setError('');
        savingRef.current = true;
        setSaving(true);
        sessionStorage.setItem('camborio_nueva_reserva_borrador', JSON.stringify({
          ...nuevaBorrador,
          mesa: principal || '',
          mesasAdicionales: adicionales,
        }));
        savingRef.current = false;
        setSaving(false);
        navigate('/reservas?desdeMesa=1');
      } catch (err: any) {
        savingRef.current = false;
        setSaving(false);
        setError(err?.message || 'No se pudo volver al formulario de reserva.');
      }
      return;
    }

    if (!assignmentReserva?.ReservaID) return;

    try {
      setError('');
      savingRef.current = true;
      setSaving(true);

      const principalLayout = Object.values(PLANOS)
        .flatMap(p => p.mesas)
        .find(m => m.numero === principal);
      const zonaAsignada = principalLayout
        ? principalLayout.zona.toUpperCase().replace('CHILLOUT', 'CHILL OUT')
        : null;

      const fechaReserva = String(assignmentReserva.FechaReserva || '').slice(0, 10);
      const turnoReserva = String(assignmentReserva.Turno || '').trim().toUpperCase();
      const turnoContexto = String(turno || '').trim().toUpperCase();

      if (fechaReserva !== fecha || (turnoReserva && turnoReserva !== turnoContexto)) {
        setError('La reserva no pertenece al día y turno actuales del plano.');
        savingRef.current = false;
        setSaving(false);
        return;
      }

      const ahoraAsignacion = new Date().toISOString();
      const estadoTrasAsignacion = accion === 'sentar'
        ? 'SENTADA'
        : assignmentReserva.Estado === 'PENDIENTE'
          ? 'CONFIRMADA'
          : assignmentReserva.Estado;
      const { error: updateError } = await supabase
        .from('Reservas')
        .update({
          Mesa: principal,
          MesasAdicionales: adicionales.length ? adicionales.join(', ') : null,
          Zona: zonaAsignada,
          Turno: turno,
          Estado: estadoTrasAsignacion,
          ...(estadoTrasAsignacion !== assignmentReserva.Estado
            ? { FechaEstado: ahoraAsignacion }
            : {}),
          FechaModificacion: ahoraAsignacion,
        })
        .eq('ReservaID', assignmentReserva.ReservaID);

      if (updateError) throw updateError;
      if (assignmentReserva.Estado === 'PENDIENTE' && estadoTrasAsignacion !== 'PENDIENTE') {
        window.dispatchEvent(new Event('camborio-pending-count-change'));
      }

      const persistida = {
        ...assignmentReserva,
        Mesa: principal,
        MesasAdicionales: adicionales.length ? adicionales.join(', ') : null,
        Zona: zonaAsignada,
        Turno: turno,
        Estado: estadoTrasAsignacion,
      } as Reserva;

      assignmentOriginalRef.current = [...mesasSeleccionadas];
      assignmentTablesRef.current = [...mesasSeleccionadas];
      setAssignmentTables([...mesasSeleccionadas]);

      savingRef.current = false;
      setSaving(false);

      if (accion === 'sentar' && persistida.Mesa) {
        const codigo = volverCodigo || persistida.CodigoReserva || '';
        navigate('/buscar?codigo=' + encodeURIComponent(codigo));
        return;
      }

      if (volverCodigo || persistida.CodigoReserva) {
        const codigo = volverCodigo || persistida.CodigoReserva || '';
        navigate('/buscar?codigo=' + encodeURIComponent(codigo));
      } else {
        navigate('/');
      }
    } catch (err: any) {
      savingRef.current = false;
      setSaving(false);
      console.error('Error guardando asignación de mesas', err);
      setError(err?.hint || err?.message || 'No se pudo guardar la asignación de mesas.');
    }
  };
  const estado: 'disponible' | 'reservada' | 'ocupada' | 'desactivada' = selectedTable && mesasConfig[selectedTable]?.Activa === false ? 'desactivada' : (selectedTable ? visualState(reservaSeleccionada) : 'disponible');

  return (
    <section className="cr-planos-mesas" aria-label="Planos de mesas">
      <button className="cr-planos-mesas__backdrop" type="button" aria-label="Cerrar" onClick={cerrarAsignacion} />
      <div className={'cr-planos-mesas__panel' + (assignmentMode ? ' cr-planos-mesas__panel--asignacion' : '')}>
        <header className="cr-planos-mesas__header">
          <h2>{assignmentMode ? 'ASIGNAR MESA' : 'PLANOS DE MESAS'}</h2>
          <button type="button" className="cr-planos-mesas__cerrar" onClick={assignmentMode ? cerrarAsignacion : () => navigate('/')}>CERRAR</button>
        </header>

        {assignmentMode ? <div className="cr-planos-mesas__reserva-info"><div><span>NOMBRE</span><strong>{assignmentReserva?.Nombre || nuevaBorrador?.nombre || 'SIN NOMBRE'}</strong></div><div className="cr-planos-mesas__reserva-fecha">📅 {formatHeaderDate(assignmentReserva?.FechaReserva || nuevaBorrador?.fecha || fecha)}</div><div className="cr-planos-mesas__reserva-grid"><div><span data-cr-asignacion-etiqueta>{assignmentTables.length === 1 ? 'MESA ASIGNADA' : 'MESAS ASIGNADAS'}</span><strong data-cr-asignacion-resumen className={assignmentOriginalRef.current.length ? 'cr-planos-mesas__asignacion--asignada' : ''}>{assignmentTables.length ? assignmentTables.join(', ') : 'SIN ASIGNAR'}</strong></div><div><span>TELÉFONO</span><strong>{assignmentReserva?.Telefono || nuevaBorrador?.telefono || '—'}</strong></div><div><span>HORA</span><strong>{String(assignmentReserva?.HoraReserva || nuevaBorrador?.horaReserva || '').slice(0,5)}</strong></div><div><span>PERSONAS</span><strong>{assignmentReserva?.Personas || nuevaBorrador?.personas || 0} PAX</strong></div></div></div> : <button className="cr-planos-mesas__fecha" type="button" onClick={() => setCalendarOpen(true)} aria-label="Cambiar fecha">📅 {formatHeaderDate(fecha)}</button>}

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
        <div className="cr-planos-mesas__canvas-wrap">
          <div className={'cr-planos-mesas__canvas cr-planos-mesas__canvas--' + zona}>
            <div className="cr-planos-mesas__rotulo">{layout.nombre}</div>
            {zona === 'terraza' && <div className="cr-planos-mesas__terraza-marco" aria-hidden="true" />}
            {mesasVisibles.map(mesa => (
              <button
                key={mesa.numero}
                type="button"
                className={'cr-planos-mesas__mesa cr-planos-mesas__mesa--' + (
                  assignmentMode
                    ? assignmentSet.has(mesa.numero)
                      ? (assignmentOriginalSet.has(mesa.numero)
                        ? (assignmentTablesRef.current[0] === mesa.numero ? 'principal' : 'adicional')
                        : 'seleccionada')
                      : mesa.estado
                    : mesa.estado
                )}
                data-mesa-numero={mesa.numero}
                style={{ '--mesa-x': mesa.x + '%', '--mesa-y': mesa.y + '%' } as CSSProperties}
                aria-label={'Mesa ' + mesa.numeroVisual + ' ' + mesa.estado}
              >
                {mesa.numeroVisual}
              </button>
            ))}
          </div>
        </div>

        <div className="cr-planos-mesas__leyenda" aria-label="Leyenda de estados de mesas">
          <span><i className="principal" />PRINCIPAL</span>
          <span><i className="adicional" />ADICIONAL</span>
          <span><i className="cambio-pendiente" />CAMBIO PENDIENTE</span>
          <span><i className="libre" />LIBRE</span>
          <span><i className="reservada" />RESERVADA</span>
          <span><i className="ocupada" />OCUPADA</span>
          <span><i className="desactivada" />DESACTIVADA</span>
        </div>

        {assignmentMode && <div className="cr-planos-mesas__assignment-actions"><div>SELECCIONA UNA O VARIAS MESAS Y PULSA GUARDAR ASIGNACIÓN PARA ACTUALIZAR LA RESERVA.</div><button type="button" className="primario" data-cr-guardar-asignacion disabled={saving || (Boolean(nuevaBorrador) && assignmentTablesRef.current.length === 0)} onClick={() => void guardarAsignacion()}>{saving ? 'GUARDANDO...' : 'GUARDAR ASIGNACIÓN'}</button></div>}
        {error && <div className="cr-planos-mesas__error">{error}</div>}
      </div>

      {confirmModal && (
        <div className="cr-confirmacion-mesa" role="dialog" aria-modal="true" aria-labelledby="crConfirmacionMesaTitulo">
          <button className="cr-confirmacion-mesa__backdrop" type="button" aria-label="Cerrar" onClick={() => { if (!savingRef.current) { confirmModal.alCancelar?.(); setConfirmModal(null); } }} />
          <section className="cr-confirmacion-mesa__panel">
            <p className="cr-confirmacion-mesa__eyebrow">{confirmModal.titulo}</p>
            <div id="crConfirmacionMesaTitulo" className="cr-confirmacion-mesa__contenido">{confirmModal.mensaje}</div>
            <div className="cr-confirmacion-mesa__acciones">
              <button className="cr-confirmacion-mesa__boton cr-confirmacion-mesa__boton--cancelar" type="button" onClick={() => { if (!savingRef.current) { confirmModal.alCancelar?.(); setConfirmModal(null); } }}>{confirmModal.cancelar}</button>
              <button className="cr-confirmacion-mesa__boton cr-confirmacion-mesa__boton--aceptar" type="button" disabled={saving} onClick={() => void confirmModal.alAceptar()}>{confirmModal.aceptar}</button>
            </div>
          </section>
        </div>
      )}

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
                <div className="cr-planos-mesas__dialog-title">MESA {parseAssignedTables(reservaSeleccionada)[0] || selectedTable}</div>
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
                <div className="cr-planos-mesas__dialog-title">MESA {reservaSeleccionada.Nombre === 'SIN RESERVA' ? selectedTable : (parseAssignedTables(reservaSeleccionada)[0] || selectedTable)}</div>
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
