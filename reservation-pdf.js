(function () {
  'use strict';

  const clean = (value) => String(value ?? '').trim();
  let converterPromise = null;

  function loadConverter() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (converterPromise) return converterPromise;
    converterPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('No se pudo cargar el generador PDF.'));
      script.onerror = () => reject(new Error('No se pudo cargar el generador PDF.'));
      document.head.appendChild(script);
    });
    return converterPromise;
  }

  function formatDate(value) {
    const text = clean(value);
    let match = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
    match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    return match ? `${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}-${match[3]}` : text;
  }

  function formatTime(value) {
    const text = clean(value);
    const match = text.match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : text.slice(0, 5);
  }

  function escapeHtml(value) {
    return clean(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function status(value) {
    const key = clean(value).toUpperCase();
    return ({
      PENDIENTE: 'Pendiente de confirmación',
      CONFIRMADA: 'Confirmada',
      SENTADA: 'Sentada',
      FINALIZADA: 'Finalizada',
      CANCELADA_CLIENTE: 'Cancelada (por el cliente)',
      CANCELADA_LOCAL: 'Cancelada por el restaurante',
      NO_PRESENTADO: 'No presentado'
    })[key] || key || 'Pendiente de confirmación';
  }

  function stateClass(value) {
    const key = clean(value).toUpperCase();
    if (key === 'PENDIENTE') return 'estadoPendiente';
    if (key === 'CONFIRMADA') return 'estadoConfirmada';
    if (key === 'CANCELADA_CLIENTE' || key === 'CANCELADA_LOCAL') return 'estadoCancelada';
    return 'estadoNeutro';
  }

  function stateNotice(value) {
    const key = clean(value).toUpperCase();
    if (key === 'PENDIENTE') return '<div class="aviso avisoPendiente"><div class="avisoContenido"><div class="avisoTitulo">Esta reserva está <strong>pendiente de confirmación</strong> por el restaurante.</div><div class="avisoTexto">En cuanto sea confirmada, podrás consultar el estado actual.</div></div></div>';
    if (key === 'CONFIRMADA') return '<div class="aviso avisoConfirmada"><div class="avisoTitulo">Esta reserva está confirmada.</div></div>';
    if (key === 'CANCELADA_CLIENTE' || key === 'CANCELADA_LOCAL') return `<div class="aviso avisoCancelada"><div class="avisoTitulo">Reserva cancelada.</div><div class="avisoTexto">${escapeHtml(status(key))}</div></div>`;
    return `<div class="aviso avisoNeutro"><div class="avisoTitulo">Estado de la reserva: ${escapeHtml(status(key))}</div></div>`;
  }

  function buildHtml(reservation) {
    const r = reservation || {};
    const code = clean(r.CodigoReserva) || '-';
    const phone = clean(r.Telefono) || '-';
    const state = clean(r.Estado).toUpperCase();
    const fecha = formatDate(r.FechaReserva) || '-';
    const hora = formatTime(r.HoraReserva) || '-';
    const observations = clean(r.Observaciones) || 'Sin observaciones';
    const generated = new Date().toLocaleDateString('es-ES') + ' a las ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
      @page { margin: 24px; }
      * { box-sizing: border-box; }
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 22px 34px 26px; font-size: 14px; background: #ffffff; width: 794px; }
      .cabecera { border-bottom: 4px solid #f2a100; padding-bottom: 14px; margin-bottom: 20px; }
      .cabeceraTabla { width: auto; margin: 0 auto; border-collapse: collapse; }
      .cabeceraLogo { width: 156px; padding-right: 4px; vertical-align: middle; text-align: left; }
      .cabeceraTexto { vertical-align: middle; text-align: center; }
      .logo { width: 156px; height: 156px; display: block; object-fit: contain; }
      .marca { font-family: Georgia, 'Times New Roman', serif; font-size: 34px; line-height: 1; font-weight: bold; letter-spacing: 2px; color: #5b260f; margin: 0; white-space: nowrap; }
      .submarca { color: #0d5a22; font-family: Georgia, 'Times New Roman', serif; font-size: 21px; font-weight: bold; letter-spacing: 3px; margin-top: 10px; text-transform: uppercase; white-space: nowrap; }
      .submarca:before, .submarca:after { content: ""; display: inline-block; width: 46px; border-top: 2px solid #c98500; vertical-align: middle; margin: 0 14px; }
      .direccion, .telefono { font-size: 14px; margin-top: 5px; }
      .telefono strong { color: #0d5a22; }
      .tituloCodigo { text-align: center; font-size: 20px; font-weight: 800; letter-spacing: 1.6px; margin: 18px 0 10px; }
      .codigoCaja { max-width: 520px; margin: 0 auto 16px; border: 2px solid #0d5a22; border-radius: 8px; padding: 10px 16px; text-align: center; color: #0d5a22; font-size: 40px; line-height: 1; font-weight: 900; letter-spacing: 9px; background: #fbfdfb; }
      .tablaReserva { width: 100%; border-collapse: separate; border-spacing: 0; border: 1px solid #d7dde5; border-radius: 10px; overflow: hidden; margin-top: 12px; }
      .tablaReserva th, .tablaReserva td { border-bottom: 1px solid #e2e6ec; padding: 11px 14px; text-align: left; vertical-align: middle; }
      .tablaReserva tr:last-child th, .tablaReserva tr:last-child td { border-bottom: 0; }
      .tablaReserva th { width: 34%; font-weight: 800; background: #fbfbfb; }
      .badgeEstado { display: inline-block; border-radius: 8px; padding: 7px 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .4px; }
      .estadoPendiente { color: #134e22; background: #fff7df; border: 1px solid #f2a100; }
      .estadoConfirmada { color: #0d5a22; background: #eaf7ee; border: 1px solid #0d5a22; }
      .estadoCancelada { color: #9f1239; background: #fff1f2; border: 1px solid #e11d48; }
      .estadoNeutro { color: #1f2937; background: #f3f4f6; border: 1px solid #9ca3af; }
      .aviso { margin-top: 16px; border-radius: 10px; padding: 14px 18px; line-height: 1.35; overflow: hidden; }
      .avisoContenido { overflow: hidden; }
      .avisoTitulo { font-size: 18px; font-weight: 900; text-transform: uppercase; }
      .avisoTexto { margin-top: 6px; font-size: 14px; font-weight: 400; }
      .avisoPendiente { background: #fffdf2; border: 1.5px solid #f2a100; color: #111827; }
      .avisoConfirmada { background: #ecfdf3; border: 1.5px solid #0d5a22; color: #0d5a22; }
      .avisoCancelada { background: #fff1f2; border: 1.5px solid #dc2626; color: #991b1b; }
      .avisoNeutro { background: #f9fafb; border: 1.5px solid #9ca3af; color: #1f2937; }
      .consulta { margin-top: 14px; border: 1.5px solid #0d5a22; border-radius: 10px; padding: 16px 18px; background: #f3fbf5; overflow: hidden; }
      .consultaContenido { overflow: hidden; }
      .consultaTitulo { color: #0d5a22; font-size: 17px; font-weight: 900; text-transform: uppercase; margin-bottom: 6px; }
      .consultaDato { margin-top: 5px; }
      .consultaDato strong { font-size: 15px; color: #111827; }
      .consultaDato .codigoConsulta { color: #0d5a22; }
      .pie { margin-top: 24px; padding-top: 14px; border-top: 1.5px solid #0d5a22; text-align: center; font-size: 15px; font-weight: 800; }
      .generado { margin-top: 8px; text-align: center; font-size: 11px; color: #6b7280; font-weight: 400; }
    </style></head><body>
      <div class="cabecera"><table class="cabeceraTabla" role="presentation"><tr><td class="cabeceraLogo"><img class="logo" src="./logocamborio_trans.png" alt="Logo Taberna Camborio"></td><td class="cabeceraTexto"><div class="marca">TABERNA CAMBORIO</div><div class="submarca">Cervecería - Tapería</div><div class="direccion">Calle Real, 184 - 11100 San Fernando</div><div class="telefono">Teléfono: <strong>956 25 45 32</strong></div></td></tr></table></div>
      <div class="tituloCodigo">CÓDIGO DE RESERVA</div><div class="codigoCaja">${escapeHtml(code)}</div>
      <table class="tablaReserva" role="presentation"><tr><th>Nombre</th><td>${escapeHtml(r.Nombre || '-')}</td></tr><tr><th>Teléfono</th><td>${escapeHtml(phone)}</td></tr><tr><th>Email</th><td>${escapeHtml(r.Email || '-')}</td></tr><tr><th>Fecha</th><td>${escapeHtml(fecha)}</td></tr><tr><th>Hora</th><td>${escapeHtml(hora)}</td></tr><tr><th>Personas</th><td>${escapeHtml(r.Personas || '-')}</td></tr><tr><th>Estado</th><td><span class="badgeEstado ${stateClass(state)}">${escapeHtml(status(state))}</span></td></tr><tr><th>Observaciones</th><td>${escapeHtml(observations)}</td></tr></table>
      ${stateNotice(state)}
      <div class="consulta"><div class="consultaContenido"><div class="consultaTitulo">Puede consultar el estado de su reserva</div><div>Puede consultar el estado actual de su reserva entrando con:</div><div class="consultaDato">Teléfono: <strong>${escapeHtml(phone)}</strong></div><div class="consultaDato">Código de reserva: <strong class="codigoConsulta">${escapeHtml(code)}</strong></div></div></div>
      <div class="pie">Gracias por reservar en Taberna Camborio.</div><div class="generado">Documento generado el ${escapeHtml(generated)}</div>
    </body></html>`;
  }

  async function download(reservation) {
    const html2pdf = await loadConverter();
    const holder = document.createElement('div');
    holder.innerHTML = buildHtml(reservation);
    holder.style.position = 'fixed';
    holder.style.left = '0';
    holder.style.top = '0';
    holder.style.width = '794px';
    holder.style.background = '#ffffff';
    holder.style.zIndex = '-1';
    holder.style.pointerEvents = 'none';
    document.body.appendChild(holder);

    try {
      const image = holder.querySelector('.logo');
      if (image && !image.complete) {
        await new Promise((resolve) => { image.onload = resolve; image.onerror = resolve; });
      }
      await html2pdf().set({
        margin: 0,
        filename: `Reserva_${clean(reservation?.CodigoReserva) || 'Camborio'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', windowWidth: 794, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      }).from(holder).save();
    } finally {
      holder.remove();
    }
  }

  function run(reservation) {
    if (!reservation) return alert('No se ha encontrado la reserva para generar el justificante.');
    const buttons = [...document.querySelectorAll('#received-pdf,#found-pdf,#edit-pdf')];
    buttons.forEach((button) => { button.disabled = true; });
    download(reservation)
      .catch((error) => { console.error(error); alert('No se pudo generar el PDF. Comprueba la conexión e inténtalo de nuevo.'); })
      .finally(() => buttons.forEach((button) => { button.disabled = false; }));
  }

  function bind() {
    const received = document.getElementById('received-pdf');
    if (received) received.addEventListener('click', (event) => { event.preventDefault(); event.stopImmediatePropagation(); run(window.__publicReservation || window.__v4Reservation); }, true);
    document.addEventListener('click', (event) => { const button = event.target.closest('#found-pdf,#edit-pdf'); if (!button) return; event.preventDefault(); event.stopImmediatePropagation(); run(window.__publicReservation || window.__v4Reservation); }, true);
  }

  window.buildReservationPdf = download;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();