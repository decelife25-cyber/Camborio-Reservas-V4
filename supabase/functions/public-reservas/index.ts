import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json; charset=utf-8' },
  });

const clean = (v: unknown) => String(v ?? '').trim();
const phone = (v: unknown) => clean(v).replace(/\D/g, '');
const iso = (v: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(clean(v)) ? clean(v) : '';
const time = (v: unknown) => /^\d{1,2}:\d{2}$/.test(clean(v)) ? clean(v).padStart(5, '0') : '';
const todayMadrid = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const minutesNowMadrid = () => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(new Date());
  return Number(parts.find(p => p.type === 'hour')?.value ?? 0) * 60 + Number(parts.find(p => p.type === 'minute')?.value ?? 0);
};
const weekdayMadrid = (date: string) => {
  const d = new Date(`${date}T12:00:00+02:00`);
  return new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', weekday: 'long' }).format(d);
};
const minutes = (v: string) => { const [h, m] = v.split(':').map(Number); return h * 60 + m; };

async function availability(date: string) {
  if (!date || date < todayMadrid()) return { COMIDA: [], CENA: [] };
  const day = weekdayMadrid(date);
  const { data: rows, error } = await supabase
    .from('Horarios')
    .select('Servicio,Hora,MargenHoras,Activo')
    .eq('Activo', true)
    .ilike('DiaSemana', day);
  if (error) throw error;
  const result: Record<string, string[]> = { COMIDA: [], CENA: [] };
  const isToday = date === todayMadrid();
  const now = isToday ? minutesNowMadrid() : -1;
  for (const row of rows ?? []) {
    const h = time(String(row.Hora ?? '').slice(0, 5));
    if (!h) continue;
    const margin = Number(row.MargenHoras ?? 0);
    if (isToday && minutes(h) < now + margin * 60) continue;
    const service = clean(row.Servicio).toUpperCase();
    if (service === 'COMIDA' || service === 'CENA') result[service].push(h);
  }
  result.COMIDA = [...new Set(result.COMIDA)].sort();
  result.CENA = [...new Set(result.CENA)].sort();
  return result;
}

async function validateSlot(date: string, hour: string) {
  const groups = await availability(date);
  const service = groups.COMIDA.includes(hour) ? 'COMIDA' : groups.CENA.includes(hour) ? 'CENA' : '';
  if (!service) throw new Error('La hora seleccionada ya no está disponible.');
  return service;
}

async function findReservation(p: string, c: string) {
  const normalized = phone(p);
  const code = clean(c).toUpperCase();
  if (!/^[6789]\d{8}$/.test(normalized) || !code) return null;
  const { data, error } = await supabase.from('Reservas')
    .select('ReservaID,CodigoReserva,FechaCreacion,FechaReserva,HoraReserva,Nombre,Telefono,Email,Personas,Observaciones,Estado,FechaEstado,Mesa,Zona,MesasAdicionales,Turno,FechaModificacion,OrigenReserva')
    .eq('Telefono', normalized).eq('CodigoReserva', code).maybeSingle();
  if (error) throw error;
  return data;
}

async function createReservation(body: any) {
  const nombre = clean(body.nombre);
  const telefono = phone(body.telefono);
  const email = clean(body.email) || null;
  const fecha = iso(body.fecha);
  const hora = time(body.hora);
  const personas = Number(body.personas);
  const observaciones = clean(body.observaciones) || null;
  if (!nombre || !/^\d{9}$/.test(telefono) || !fecha || !hora || !Number.isInteger(personas) || personas < 1 || personas > 30) {
    throw new Error('Datos de reserva incompletos o no válidos.');
  }
  if (fecha < todayMadrid()) throw new Error('No se puede reservar una fecha pasada.');
  const { data: blocked } = await supabase.from('Clientes_Bloqueados').select('Telefono').eq('Telefono', telefono).eq('Activo', true).maybeSingle();
  if (blocked) throw new Error('No es posible realizar la reserva con este teléfono.');
  const turno = await validateSlot(fecha, hora);

  const { data: existing } = await supabase.from('Reservas').select('ReservaID').eq('Telefono', telefono).eq('FechaReserva', fecha).eq('Turno', turno).in('Estado', ['PENDIENTE', 'CONFIRMADA', 'SENTADA']).limit(1);
  if ((existing ?? []).length) throw new Error('Ya existe una reserva activa para este teléfono, fecha y turno.');

  let cliente: any = null;
  const { data: foundClient } = await supabase.from('Clientes').select('*').eq('Telefono', telefono).maybeSingle();
  if (foundClient) {
    cliente = foundClient;
    await supabase.from('Clientes').update({ NombreUltimo: nombre, EmailUltimo: email }).eq('Telefono', telefono);
  } else {
    const clienteId = crypto.randomUUID();
    const { data: createdClient, error: clientError } = await supabase.from('Clientes').insert({ ClienteID: clienteId, Telefono: telefono, NombreUltimo: nombre, EmailUltimo: email, ReservasTotales: 0, Confirmadas: 0, Sentadas: 0, Canceladas: 0, NoPresentados: 0, FechaAlta: new Date().toISOString() }).select('*').single();
    if (clientError) throw clientError;
    cliente = createdClient;
  }

  const reservationId = crypto.randomUUID();
  const code = crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase();
  const { data, error } = await supabase.from('Reservas').insert({
    ReservaID: reservationId,
    CodigoReserva: code,
    FechaCreacion: new Date().toISOString(),
    FechaReserva: fecha,
    HoraReserva: hora,
    Nombre: nombre,
    Telefono: telefono,
    Email: email,
    Personas: personas,
    Observaciones: observaciones,
    Estado: 'PENDIENTE',
    FechaEstado: new Date().toISOString(),
    ClienteID: cliente?.ClienteID ?? null,
    FechaModificacion: new Date().toISOString(),
    OrigenReserva: 'PUBLICO',
    CreadaPor: 'PWA_PUBLICA',
    Turno: turno,
  }).select('*').single();
  if (error) throw error;
  await supabase.from('Log').insert({ FechaHora: new Date().toISOString(), Usuario: 'PUBLICO', Accion: 'CREAR_RESERVA', ReservaID: reservationId, Detalle: 'Reserva creada desde PWA pública' });
  return data;
}

async function updateReservation(body: any, cancel = false) {
  const p = phone(body.telefono);
  const c = clean(body.codigo).toUpperCase();
  const current = await findReservation(p, c);
  if (!current) throw new Error('Reserva no encontrada. Comprueba teléfono y código.');
  if (cancel) {
    if (['SENTADA', 'FINALIZADA', 'NO_PRESENTADO'].includes(current.Estado)) throw new Error('Esta reserva ya no se puede cancelar desde la PWA.');
    if (['CANCELADA_CLIENTE', 'CANCELADA_LOCAL'].includes(current.Estado)) return current;
    const { data, error } = await supabase.from('Reservas').update({ Estado: 'CANCELADA_CLIENTE', FechaEstado: new Date().toISOString(), FechaModificacion: new Date().toISOString(), UsuarioEstado: 'PUBLICO' }).eq('ReservaID', current.ReservaID).select('*').single();
    if (error) throw error;
    await supabase.from('Log').insert({ FechaHora: new Date().toISOString(), Usuario: 'PUBLICO', Accion: 'CANCELAR_RESERVA', ReservaID: current.ReservaID, Detalle: 'Cancelación solicitada por cliente' });
    return data;
  }
  if (['SENTADA', 'FINALIZADA', 'NO_PRESENTADO', 'CANCELADA_CLIENTE', 'CANCELADA_LOCAL'].includes(current.Estado)) throw new Error('Esta reserva no se puede modificar en su estado actual.');
  const nombre = clean(body.nombre) || current.Nombre;
  const email = clean(body.email) || null;
  const fecha = iso(body.fecha) || current.FechaReserva;
  const hora = time(body.hora) || String(current.HoraReserva).slice(0, 5);
  const personas = Number(body.personas ?? current.Personas);
  if (fecha < todayMadrid()) throw new Error('No se puede mover la reserva a una fecha pasada.');
  if (!Number.isInteger(personas) || personas < 1 || personas > 30) throw new Error('Número de personas no válido.');
  const turno = await validateSlot(fecha, hora);
  if (fecha !== current.FechaReserva || hora !== String(current.HoraReserva).slice(0, 5)) {
    const { data: duplicate } = await supabase.from('Reservas').select('ReservaID').eq('Telefono', p).eq('FechaReserva', fecha).eq('Turno', turno).in('Estado', ['PENDIENTE', 'CONFIRMADA', 'SENTADA']).neq('ReservaID', current.ReservaID).limit(1);
    if ((duplicate ?? []).length) throw new Error('Ya existe otra reserva activa para este teléfono, fecha y turno.');
  }
  const oldTurn = clean(current.Turno).toUpperCase();
  const turnChanged = oldTurn && oldTurn !== turno;
  const patch: any = { Nombre: nombre, Email: email, Personas: personas, FechaReserva: fecha, HoraReserva: hora, Observaciones: clean(body.observaciones) || null, Turno: turno, FechaModificacion: new Date().toISOString() };
  if (turnChanged) { patch.Mesa = null; patch.MesasAdicionales = null; patch.Zona = null; }
  const { data, error } = await supabase.from('Reservas').update(patch).eq('ReservaID', current.ReservaID).select('*').single();
  if (error) throw error;
  if (p === current.Telefono) await supabase.from('Clientes').update({ NombreUltimo: nombre, EmailUltimo: email }).eq('Telefono', p);
  await supabase.from('Log').insert({ FechaHora: new Date().toISOString(), Usuario: 'PUBLICO', Accion: 'MODIFICAR_RESERVA', ReservaID: current.ReservaID, Detalle: turnChanged ? 'Modificación con cambio de turno; mesas liberadas' : 'Modificación solicitada por cliente' });
  return data;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const url = new URL(req.url);
    if (req.method === 'GET' && url.searchParams.get('action') === 'availability') {
      return json({ ok: true, availability: await availability(iso(url.searchParams.get('date'))) });
    }
    if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido.' }, 405);
    const body = await req.json();
    const action = clean(body.action);
    if (action === 'availability') return json({ ok: true, availability: await availability(iso(body.date)) });
    if (action === 'create') return json({ ok: true, reservation: await createReservation(body) });
    if (action === 'lookup') return json({ ok: true, reservation: await findReservation(body.telefono, body.codigo) });
    if (action === 'update') return json({ ok: true, reservation: await updateReservation(body, false) });
    if (action === 'cancel') return json({ ok: true, reservation: await updateReservation(body, true) });
    if (action === 'email') {
      const reservation = await findReservation(body.telefono, body.codigo);
      const destination = clean(body.email);
      if (!reservation || !destination) throw new Error('Reserva o email no válidos.');
      const { error } = await supabase.from('Notificaciones').insert({ FechaHora: new Date().toISOString(), ReservaID: reservation.ReservaID, Tipo: 'EMAIL_RESERVA', Destino: destination, Estado: 'PENDIENTE' });
      if (error) throw error;
      await supabase.from('Log').insert({ FechaHora: new Date().toISOString(), Usuario: 'PUBLICO', Accion: 'SOLICITAR_EMAIL', ReservaID: reservation.ReservaID, Detalle: 'Solicitud de envío por email registrada' });
      return json({ ok: true, queued: true });
    }
    return json({ ok: false, error: 'Acción no reconocida.' }, 400);
  } catch (e) {
    console.error(e);
    return json({ ok: false, error: e instanceof Error ? e.message : 'Error interno.' }, 400);
  }
});
