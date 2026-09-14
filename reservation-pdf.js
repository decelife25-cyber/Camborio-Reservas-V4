(function () {
  'use strict';

  let converterPromise = null;
  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => clean(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const date = (v) => { const s = clean(v); const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}-${m[2]}-${m[1]}` : s; };
  const time = (v) => { const m = clean(v).match(/(?:T|\s|^)(\d{1,2}):(\d{2})/); return m ? `${m[1].padStart(2, '0')}:${m[2]}` : clean(v).slice(0, 5); };

  function loadConverter() {
    if (window.html2pdf) return Promise.resolve(window.html2pdf);
    if (converterPromise) return converterPromise;
    converterPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      s.onload = () => window.html2pdf ? resolve(window.html2pdf) : reject(new Error('No se pudo cargar el generador PDF.'));
      s.onerror = () => reject(new Error('No se pudo cargar el generador PDF.'));
      document.head.appendChild(s);
    });
    return converterPromise;
  }

  function buildHtml(r) {
    r = r || {};
    const state = clean(r.Estado).toUpperCase();
    const status = ({ PENDIENTE: 'Pendiente de confirmación', CONFIRMADA: 'Confirmada', SENTADA: 'Sentada', FINALIZADA: 'Finalizada', CANCELADA_CLIENTE: 'Cancelada por el cliente', CANCELADA_LOCAL: 'Cancelada por el restaurante', NO_PRESENTADO: 'No presentado' })[state] || state || 'Pendiente de confirmación';
    return `<!doctype html><html><head><meta charset="UTF-8"><style>
      @page{margin:24px}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;margin:0;padding:22px 34px 26px;font-size:14px;background:#fff;width:794px}.head{border-bottom:4px solid #f2a100;padding-bottom:14px;margin-bottom:20px;text-align:center}.logo{width:130px;height:130px;object-fit:contain}.brand{font:700 32px Georgia,serif;color:#5b260f;letter-spacing:2px}.sub{font:700 20px Georgia,serif;color:#0d5a22;letter-spacing:2px;margin:8px}.title{text-align:center;font-size:20px;font-weight:800;margin:18px 0 10px}.code{border:2px solid #0d5a22;border-radius:8px;padding:10px;text-align:center;color:#0d5a22;font-size:38px;font-weight:900;letter-spacing:7px;margin-bottom:16px}.table{width:100%;border-collapse:collapse;border:1px solid #d7dde5}.table th,.table td{border:1px solid #e2e6ec;padding:11px 14px;text-align:left}.table th{width:34%;background:#fbfbfb}.state{display:inline-block;padding:7px 12px;border-radius:8px;font-weight:800;background:#eaf7ee;border:1px solid #0d5a22}.notice{margin-top:16px;padding:14px 18px;border:1.5px solid #f2a100;border-radius:10px;background:#fffdf2}.foot{margin-top:24px;padding-top:14px;border-top:1.5px solid #0d5a22;text-align:center;font-weight:800}
    </style></head><body>
    <div class="head"><img class="logo" src="./logocamborio_trans.png"><div class="brand">TABERNA CAMBORIO</div><div class="sub">Cervecería - Tapería</div><div>Calle Real, 184 - 11100 San Fernando</div><div>Teléfono: <strong>956 25 45 32</strong></div></div>
    <div class="title">CÓDIGO DE RESERVA</div><div class="code">${esc(r.CodigoReserva || '-')}</div>
    <table class="table"><tr><th>Nombre</th><td>${esc(r.Nombre || '-')}</td></tr><tr><th>Teléfono</th><td>${esc(r.Telefono || '-')}</td></tr><tr><th>Email</th><td>${esc(r.Email || '-')}</td></tr><tr><th>Fecha</th><td>${esc(date(r.FechaReserva) || '-')}</td></tr><tr><th>Hora</th><td>${esc(time(r.HoraReserva) || '-')}</td></tr><tr><th>Personas</th><td>${esc(r.Personas || '-')}</td></tr><tr><th>Estado</th><td><span class="state">${esc(status)}</span></td></tr><tr><th>Observaciones</th><td>${esc(r.Observaciones || 'Sin observaciones')}</td></tr></table>
    <div class="notice">Estado de la reserva: <strong>${esc(status)}</strong></div><div class="foot">Gracias por reservar en Taberna Camborio.</div></body></html>`;
  }

  async function download(reservation) {
    const html2pdf = await loadConverter();
    const holder = document.createElement('div');
    holder.innerHTML = buildHtml(reservation);
    holder.style.position = 'fixed';
    holder.style.left = '0';
    holder.style.top = '0';
    holder.style.width = '794px';
    holder.style.background = '#fff';
    holder.style.zIndex = '2147483647';
    holder.style.pointerEvents = 'none';
    document.body.appendChild(holder);
    try {
      const image = holder.querySelector('.logo');
      if (image && !image.complete) await new Promise(resolve => { image.onload = resolve; image.onerror = resolve; });
      await html2pdf().set({ margin: 0, filename: `Reserva_${clean(reservation?.CodigoReserva) || 'Camborio'}.pdf`, image: { type: 'jpeg', quality: .98 }, html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#fff', windowWidth: 794, scrollX: 0, scrollY: 0 }, jsPDF: { unit: 'pt', format: 'a4', orientation: 'portrait' }, pagebreak: { mode: ['css', 'legacy'] } }).from(holder).save();
    } finally { holder.remove(); }
  }

  function run(reservation) {
    if (!reservation) return alert('No se ha encontrado la reserva para generar el justificante.');
    download(reservation).catch(error => { console.error(error); alert('No se pudo generar el PDF. Comprueba la conexión e inténtalo de nuevo.'); });
  }

  function bind() {
    document.addEventListener('click', event => {
      const button = event.target.closest('#received-pdf,#found-pdf,#edit-pdf');
      if (!button) return;
      event.preventDefault(); event.stopImmediatePropagation();
      run(window.__publicReservation || window.__v4Reservation);
    }, true);
  }

  window.buildReservationPdf = download;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();