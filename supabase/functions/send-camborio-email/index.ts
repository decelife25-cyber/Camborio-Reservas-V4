// Camborio Reservas V4 - Servicio de correo de confirmación de reserva.
//
// Flujo determinista y de un único envío (sin colas ni reintentos):
//   RESERVA -> localizar reserva -> resolver destinatario -> construir HTML
//   -> enviar por Gmail API (OAuth2) -> registrar en "Notificaciones" / "Log"
//
// Un fallo de envío NUNCA modifica el estado de la reserva (Estado, FechaEstado, etc.):
// esta función únicamente lee la reserva, opcionalmente actualiza el Email guardado,
// y registra el resultado del envío como una notificación independiente.
//
// Seguridad: nunca se registra (console.log/console.error) el client secret, el
// refresh token ni el access token de Gmail.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---------------------------------------------------------------------------
// Configuración / entorno
// ---------------------------------------------------------------------------

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const GMAIL_CLIENT_ID = Deno.env.get('GMAIL_CLIENT_ID') || '';
const GMAIL_CLIENT_SECRET = Deno.env.get('GMAIL_CLIENT_SECRET') || '';
const GMAIL_REFRESH_TOKEN = Deno.env.get('GMAIL_REFRESH_TOKEN') || '';
const GMAIL_FROM = (Deno.env.get('GMAIL_FROM') || 'Camborio.reserva@gmail.com').trim();

const GMAIL_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_ENDPOINT = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
// Esquema estándar HTTP para cabeceras Authorization (RFC 6750). No es un secreto.
const AUTH_SCHEME = 'Bearer';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

// ---------------------------------------------------------------------------
// Utilidades de datos
// ---------------------------------------------------------------------------

const clean = (v: unknown): string => String(v ?? '').trim();
const onlyDigits = (v: unknown): string => clean(v).replace(/\D/g, '');
const upperCode = (v: unknown): string => clean(v).toUpperCase();
const isValidEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

function formatDate(v: unknown): string {
  const s = clean(v);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-');
    return `${d}-${m}-${y}`;
  }
  return s || '-';
}

function formatTime(v: unknown): string {
  const s = clean(v);
  const m = s.match(/^(?:.*T)?(\d{1,2}):(\d{2})/);
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : s;
}

function esc(v: unknown): string {
  return String(v === null || v === undefined ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const ESTADO_LABELS: Record<string, string> = {
  PENDIENTE: 'Pendiente de confirmación',
  CONFIRMADA: 'Confirmada',
  SENTADA: 'Cliente sentado',
  CANCELADA_CLIENTE: 'Cancelada por el cliente',
  CANCELADA_LOCAL: 'Cancelada por el restaurante',
  FINALIZADA: 'Finalizada',
  NO_PRESENTADO: 'No presentado',
};

function statusText(v: unknown): string {
  const s = clean(v).toUpperCase();
  return ESTADO_LABELS[s] || s || 'Pendiente de confirmación';
}

// ---------------------------------------------------------------------------
// Contenido del correo (marca Camborio, código de reserva, datos de la reserva)
// ---------------------------------------------------------------------------

function detailRow(label: string, value: unknown): string {
  return (
    '<tr>' +
    '<td style="padding:2px 4px 2px 0;border-bottom:1px solid #eee;color:#6b5d50;width:27%;vertical-align:top;white-space:nowrap;font-size:8.5px;line-height:1.1;">' +
    esc(label) +
    ':</td>' +
    '<td style="padding:2px 0 2px 4px;border-bottom:1px solid #eee;font-weight:bold;vertical-align:top;word-break:normal;overflow-wrap:break-word;">' +
    esc(value || '-') +
    '</td>' +
    '</tr>'
  );
}

function stateRow(state: unknown): string {
  return (
    '<tr>' +
    '<td style="padding:2px 4px 2px 0;border-bottom:1px solid #eee;color:#6b5d50;width:27%;vertical-align:top;white-space:nowrap;font-size:8.5px;line-height:1.1;">Estado:</td>' +
    '<td style="padding:2px 0 2px 4px;border-bottom:1px solid #eee;vertical-align:top;word-break:normal;overflow-wrap:break-word;">' +
    '<span style="display:inline-block;max-width:100%;box-sizing:border-box;border:1px solid #d7dde5;border-radius:999px;padding:2px 4px;background:#f9fafb;color:#2b2118;font-size:8.5px;font-weight:bold;line-height:1.05;white-space:nowrap;word-break:normal;overflow-wrap:normal;">' +
    esc(state) +
    '</span>' +
    '</td>' +
    '</tr>'
  );
}

function notesRow(value: unknown): string {
  return (
    '<tr>' +
    '<td style="padding:2px 4px 2px 0;border-bottom:1px solid #eee;color:#6b5d50;width:27%;vertical-align:top;white-space:nowrap;font-size:8px;line-height:1.1;">Observaciones:</td>' +
    '<td style="padding:2px 0 2px 6px;border-bottom:1px solid #eee;font-weight:bold;vertical-align:top;word-break:normal;overflow-wrap:break-word;">' +
    esc(value || '-') +
    '</td>' +
    '</tr>'
  );
}

function buildConsultaUrl(publicUrl: string, telefono: string, codigo: string): string {
  const base = clean(publicUrl);
  if (!base) return '';
  try {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}p=publico&telefono=${encodeURIComponent(telefono)}&codigo=${encodeURIComponent(codigo)}`;
  } catch {
    return '';
  }
}

function buildHtml(reserva: Record<string, unknown>, publicUrl: string): string {
  const estado = statusText(reserva.Estado);
  const fecha = formatDate(reserva.FechaReserva);
  const hora = formatTime(reserva.HoraReserva);
  const codigo = clean(reserva.CodigoReserva);
  const telefono = clean(reserva.Telefono) || '-';
  const email = clean(reserva.Email) || '-';
  const observaciones = clean(reserva.Observaciones) || 'Sin observaciones';
  const urlConsulta = buildConsultaUrl(publicUrl, telefono, codigo);

  const fechaCreacion = reserva.FechaCreacion
    ? new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
        .format(new Date(reserva.FechaCreacion as string))
        .replace(',', ' a las')
    : '';
  const bloqueFechaCreacion = fechaCreacion
    ? `<p style="margin:6px 0 0;color:#7b6b5d;font-size:9.5px;line-height:1.2;text-align:center;">Reserva creada el ${esc(fechaCreacion)}</p>`
    : '';

  const bloqueEnlace = urlConsulta
    ? `<p style="margin:7px 0 0;text-align:center;"><a href="${esc(urlConsulta)}" style="display:inline-block;max-width:100%;box-sizing:border-box;background:#0d5a22;color:#ffffff;text-decoration:none;padding:7px 10px;border-radius:6px;font-weight:bold;font-size:12px;line-height:1.05;white-space:normal;word-break:break-word;overflow-wrap:anywhere;">ACCEDER A MI RESERVA</a></p>`
    : '';

  const filas =
    detailRow('Nombre', reserva.Nombre) +
    detailRow('Teléfono', telefono) +
    detailRow('Email', email) +
    detailRow('Fecha', fecha) +
    detailRow('Hora', hora) +
    detailRow('Personas', reserva.Personas) +
    stateRow(estado) +
    notesRow(observaciones);

  return (
    '<div style="margin:0;padding:4px;background:#f5efe6;font-family:Arial,Helvetica,sans-serif;color:#2b2118;font-size:11px;line-height:1.2;overflow-x:hidden;">' +
    '<div style="max-width:440px;width:100%;margin:0 auto;background:#ffffff;border:1px solid #e3d5c4;border-radius:9px;overflow:hidden;box-sizing:border-box;">' +
    '<div style="background:#ffffff;color:#2b2118;text-align:center;padding:7px 8px;border-bottom:2px solid #f2a100;box-sizing:border-box;">' +
    '<div style="font-family:Georgia,Times,serif;font-size:16px;font-weight:700;letter-spacing:.15px;line-height:1.05;text-transform:uppercase;color:#5b260f;white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:clip;">TABERNA CAMBORIO</div>' +
    '<div style="font-family:Georgia,Times,serif;font-size:10px;font-weight:700;letter-spacing:.9px;margin-top:2px;line-height:1.1;color:#0d5a22;">Cervecería · Tapería</div>' +
    '</div>' +
    '<div style="padding:8px 8px 9px;box-sizing:border-box;word-break:normal;overflow-wrap:break-word;">' +
    '<h1 style="margin:0;color:#7a241d;font-size:15px;line-height:1.1;font-weight:700;">Reserva recibida</h1>' +
    '<p style="margin:3px 0 6px;font-size:10.5px;line-height:1.2;">Hemos recibido tu solicitud de reserva.</p>' +
    '<div style="background:#fff4df;border:1px solid #e8c47d;border-radius:7px;padding:6px 8px;text-align:center;margin:0 0 6px;box-sizing:border-box;">' +
    '<div style="font-size:7px;text-transform:uppercase;color:#7a5a22;line-height:1.1;">Código de reserva</div>' +
    `<div style="font-size:20px;font-weight:700;color:#7a241d;letter-spacing:.5px;line-height:1.05;word-break:break-word;overflow-wrap:anywhere;">${esc(codigo)}</div>` +
    '</div>' +
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:10.5px;line-height:1.1;table-layout:fixed;">${filas}</table>` +
    bloqueFechaCreacion +
    '<p style="margin:5px 0 0;color:#4d3d32;font-size:10.5px;line-height:1.2;word-break:normal;overflow-wrap:anywhere;">Tu reserva está pendiente de confirmación. Te avisaremos cuando el restaurante la confirme.</p>' +
    `<p style="margin:6px 0 0;font-size:10.5px;line-height:1.2;word-break:normal;overflow-wrap:anywhere;">Puedes consultar, modificar o cancelar tu reserva desde el panel público indicando:<br><strong>Teléfono:</strong> ${esc(telefono)}<br><strong>Código de reserva:</strong> ${esc(codigo || '-')}</p>` +
    bloqueEnlace +
    '<div style="margin-top:7px;padding-top:6px;border-top:1px solid #eadfd2;color:#4d3d32;font-size:10.5px;line-height:1.2;text-align:center;"><p style="margin:0;">Calle Real, 184 · 11100 San Fernando</p><p style="margin:2px 0 0;">Tel. 956 25 45 32</p></div>' +
    '</div></div></div>'
  );
}

// ---------------------------------------------------------------------------
// Gmail API (OAuth2 refresh token -> access token -> envío RFC 2822/MIME)
// ---------------------------------------------------------------------------

function utf8Base64Url(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encodeHeader(value: string): string {
  return `=?UTF-8?B?${utf8Base64Url(value)}?=`;
}

async function getGmailAccessToken(): Promise<string> {
  if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN) {
    throw new Error('Falta configurar Gmail en Supabase (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET y GMAIL_REFRESH_TOKEN).');
  }

  const body = new URLSearchParams({
    client_id: GMAIL_CLIENT_ID,
    client_secret: GMAIL_CLIENT_SECRET,
    refresh_token: GMAIL_REFRESH_TOKEN,
    grant_type: 'refresh_token',
  });

  const response = await fetch(GMAIL_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    // No se registra client_id/secret/refresh_token/access_token: solo código y motivo del error.
    console.error('Gmail OAuth error', response.status, data?.error, data?.error_description);
    throw new Error('No se pudo autorizar el envío con Gmail.');
  }

  return data.access_token as string;
}

function buildMimeMessage(to: string, subject: string, html: string): string {
  return [
    `From: Taberna Camborio <${GMAIL_FROM}>`,
    `To: ${to}`,
    `Reply-To: ${GMAIL_FROM}`,
    `Subject: ${encodeHeader(subject)}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    html,
  ].join('\r\n');
}

async function sendGmail(to: string, subject: string, html: string): Promise<string> {
  const accessToken = await getGmailAccessToken();
  const mime = buildMimeMessage(to, subject, html);

  const response = await fetch(GMAIL_SEND_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': AUTH_SCHEME + ' ' + accessToken,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ raw: utf8Base64Url(mime) }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data?.id) {
    console.error('Gmail send error', response.status, data?.error?.message || data?.error);
    throw new Error('Gmail no ha podido enviar el correo.');
  }

  return data.id as string;
}

// ---------------------------------------------------------------------------
// Acceso a datos (Supabase)
// ---------------------------------------------------------------------------

async function findReservation(telefono: unknown, codigo: unknown): Promise<Record<string, unknown> | null> {
  const p = onlyDigits(telefono);
  const c = upperCode(codigo);
  if (!/^\d{9}$/.test(p) || !c) return null;

  const { data, error } = await supabase
    .from('Reservas')
    .select(
      'ReservaID,CodigoReserva,FechaCreacion,FechaReserva,HoraReserva,Nombre,Telefono,Email,Personas,Observaciones,Estado,FechaEstado,Mesa,Zona,MesasAdicionales,Turno,FechaModificacion,OrigenReserva',
    )
    .eq('Telefono', p)
    .eq('CodigoReserva', c)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function saveReservationEmail(reservaID: string, telefono: string, email: string): Promise<void> {
  const { error } = await supabase
    .from('Reservas')
    .update({ Email: email, FechaModificacion: new Date().toISOString() })
    .eq('ReservaID', reservaID);
  if (error) throw error;

  // No es crítico para el envío: si falla, no debe impedir que el correo se mande.
  const { error: clienteError } = await supabase
    .from('Clientes')
    .update({ EmailUltimo: email })
    .eq('Telefono', telefono);
  if (clienteError) console.error('No se pudo actualizar EmailUltimo en Clientes', clienteError.message);
}

// El estado del envío de correo se registra siempre de forma independiente al
// estado de la reserva (PENDIENTE/CONFIRMADA/...). Un fallo aquí no debe
// propagarse como fallo del envío principal.
//
// Equivalente a V2 (07_Notificaciones.gs):
//   CR_Notificaciones_registrar()      -> registerNotificationPending (crea el registro en PENDIENTE
//                                          ANTES de intentar el envío, para que quede constancia del
//                                          intento incluso si el envío falla o la función se interrumpe).
//   CR_Notificaciones_marcarEnviada()  -> markNotificationSent
//   CR_Notificaciones_marcarError()    -> markNotificationError
//
// El identificador de fila no se conoce (la tabla "Notificaciones" no está versionada como
// migración SQL en este repositorio), así que la fila PENDIENTE se localiza de forma determinista
// para la actualización posterior mediante la combinación (ReservaID, Tipo, FechaHora) generada
// aquí mismo, en vez de asumir el nombre de una columna de clave primaria.
type NotificacionPendiente = { reservaID: string; destino: string; fechaHora: string };

async function registerNotificationPending(reservaID: string, destino: string): Promise<NotificacionPendiente> {
  const fechaHora = new Date().toISOString();
  const { error } = await supabase.from('Notificaciones').insert({
    FechaHora: fechaHora,
    ReservaID: reservaID,
    Tipo: 'EMAIL_RESERVA',
    Destino: destino,
    Estado: 'PENDIENTE',
  });
  if (error) console.error('No se pudo registrar Notificaciones (PENDIENTE)', error.message);
  return { reservaID, destino, fechaHora };
}

async function markNotification(pendiente: NotificacionPendiente, estado: 'ENVIADA' | 'ERROR'): Promise<void> {
  const { error } = await supabase
    .from('Notificaciones')
    .update({ Estado: estado })
    .eq('ReservaID', pendiente.reservaID)
    .eq('Tipo', 'EMAIL_RESERVA')
    .eq('FechaHora', pendiente.fechaHora);
  if (error) console.error(`No se pudo marcar Notificaciones como ${estado}`, error.message);
}

const markNotificationSent = (pendiente: NotificacionPendiente): Promise<void> => markNotification(pendiente, 'ENVIADA');
const markNotificationError = (pendiente: NotificacionPendiente): Promise<void> => markNotification(pendiente, 'ERROR');

async function registerLog(reservaID: string, destino: string): Promise<void> {
  const { error } = await supabase.from('Log').insert({
    FechaHora: new Date().toISOString(),
    Usuario: 'PUBLICO',
    Accion: 'ENVIAR_EMAIL',
    ReservaID: reservaID,
    Detalle: `Email enviado por Gmail a ${destino}`,
  });
  if (error) console.error('No se pudo registrar Log', error.message);
}

// ---------------------------------------------------------------------------
// Handler HTTP
// ---------------------------------------------------------------------------

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Método no permitido.' }, 405);

  try {
    const body = await req.json();

    const reserva = await findReservation(body.telefono, body.codigo);
    if (!reserva) throw new Error('Reserva no encontrada. Comprueba teléfono y código.');

    // Si la reserva ya tiene email guardado se usa directamente; solo se pide
    // uno nuevo (parámetro "email" del cuerpo) cuando todavía no existe.
    const destino = clean(body.email) || clean(reserva.Email);
    if (!destino || !isValidEmail(destino)) throw new Error('Introduce un email válido.');

    const reservaID = reserva.ReservaID as string;
    const telefonoNormalizado = onlyDigits(reserva.Telefono);

    if (destino !== clean(reserva.Email)) {
      await saveReservationEmail(reservaID, telefonoNormalizado, destino);
      reserva.Email = destino;
    }

    const subject = `Confirmación de reserva ${clean(reserva.CodigoReserva)} - Taberna Camborio`;
    const html = buildHtml(reserva, clean(body.publicUrl));

    // Se registra la notificación en PENDIENTE antes de intentar el envío (igual que
    // CR_Notificaciones_registrar en V2), de modo que quede constancia del intento aunque
    // el envío falle o la función se interrumpa.
    const pendiente = await registerNotificationPending(reservaID, destino);

    try {
      const messageId = await sendGmail(destino, subject, html);
      await markNotificationSent(pendiente);
      await registerLog(reservaID, destino);
      return json({ ok: true, sent: true, messageId });
    } catch (sendError) {
      // El fallo de envío se marca como notificación en ERROR, pero la
      // reserva y su estado permanecen intactos.
      await markNotificationError(pendiente);
      throw sendError;
    }
  } catch (e) {
    console.error(e);
    const err = e as { message?: string };
    return json({ ok: false, error: err?.message || 'Error interno.' }, 400);
  }
});
