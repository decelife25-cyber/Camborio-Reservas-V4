(function () {
  'use strict';

  let converterPromise = null;
  const clean = (v) => String(v ?? '').trim();
  const esc = (v) => clean(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

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

  function date(v) {
    const t = clean(v);
    let m = t.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}-${m[2]}-${m[1]}`;
    return t;
  }

  function time(v) {
    const m = clean(v).match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    return m ? `${m[1].padStart(2,'0')}:${m[2]}` : clean(v).slice(0,5);
  }

  function buildHtml(r) {
    r = r || {};
    const state = clean(r.Estado).toUpperCase();
    const stateText = ({PENDIENTE:'Pendiente de confirmación',CONFIRMADA:'Confirmada',SENTADA:'Sentada',FINALIZADA:'Finalizada',CANCELADA_CLIENTE:'Cancelada por el cliente',CANCELADA_LOCAL:'Cancelada por el restaurante',NO_PRESENTADO:'No presentado'})[state] || state || 'Pendiente de confirmación';
    return `<!doctype html><html><head><meta charset="UTF-8"><style>
      @page{margin:24px}*{box-sizing:border-box}body{font-family:Arial,sans-serif;color:#111827;background:#fff;width:794px;margin:0;padding:22px 34px 26px;font-size:14px}.cabecera{border-bottom:4px solid #f2a100;padding-bottom:14px;margin-bottom:20px}.cabeceraTabla{margin:auto;border-collapse:collapse}.logo{width:156px;height:156px;object-fit:contain}.cabeceraLogo{padding-right:8px}.cabeceraTexto{text-align:center}.marca{font:700 34px Georgia,serif;letter-spacing:2px;color:#5b260f;white-space:nowrap}.submarca{font:700 21px Georgia,serif;letter-spacing:3px;color:#0d5a22;margin-top:10px;white-space:nowrap}.direccion,.telefono{margin-top:5px}.telefono strong{color:#0d5a22}.tituloCodigo{text-align:center;font-size:20px;font-weight:800;margin:18px 0 10px}.codigoCaja{max-width:520px;margin:0 auto 16px;border:2px solid #0d5a22;border-radius:8px;padding:10px 16px;text-align:center;color:#0d5a22;font-size:40px;font-weight:900;letter-spacing:9px}.tablaReserva{width:100%;border-collapse:collapse;border:1px solid #d7dde5;margin-top:12px}.tablaReserva th,.tablaReserva td{border-bottom:1px solid #e2e6ec;padding:11px 14px;text-align:left}.tablaReserva th{width:34%;background:#fbfbfb}.badge{font-weight:800;padding:7px 12px;border:1px solid #0d5a22;border-radius:8px}.aviso,.consulta{margin-top:16px;border-radius:10px;padding:14px 18px}.aviso{border:1.5px solid #f2a100;background:#fffdf2}.consulta{border:1.5px solid #0d5a22;background:#f3fbf5}.consultaTitulo{font-weight:900;color:#0d5a22;margin-bottom:6px}.pie{margin-top:24px;padding-top:14px;border-top:1.5px solid #0d5a22;text-align:center;font-weight:800}.generado{text-align:center;font-size:11px;color:#6b7280;margin-top:8px}
    </style></head><body><div class="cabecera"><table class="cabeceraTabla"><tr><td class="cabeceraLogo"><img class="logo" src="./logocamborio_trans.png"></td><td class="cabeceraTexto"><div class="marca">TABERNA CAMBORIO</div><div class="submarca">Cervecería - Tapería</div><div class="direccion">Calle Real, 184 - 11100 San Fernando</div><div class="telefono">Teléfono: <strong>956 25 45 32</strong></div></td></tr></table></div><div class="tituloCodigo">CÓDIGO DE RESERVA</div><div class="codigoCaja">${esc(r.CodigoReserva||'-')}</div><table class="tablaReserva"><tr><th>Nombre</th><td>${esc(r.Nombre||'-')}</td></tr><tr><th>Teléfono</th><td>${esc(r.Telefono||'-')}</td></tr><tr><th>Email</th><td>${esc(r.Email||'-')}</td></tr><tr><th>Fecha</th><td>${esc(date(r.FechaReserva)||'-')}</td></tr><tr><th>Hora</th><td>${esc(time(r.HoraReserva)||'-')}</td></tr><tr><th>Personas</th><td>${esc(r.Personas||'-')}</td></tr><tr><th>Estado</th><td><span class="badge">${esc(stateText)}</span></td></tr><tr><th>Observaciones</th><td>${esc(r.Observaciones||'Sin observaciones')}</td></tr></table><div class="aviso">Esta reserva está: <strong>${esc(stateText)}</strong></div><div class="consulta"><div class="consultaTitulo">Puede consultar el estado de su reserva</div><div>Teléfono: <strong>${esc(r.Telefono||'-')}</strong></div><div>Código de reserva: <strong>${esc(r.CodigoReserva||'-')}</strong></div></div><div class="pie">Gracias por reservar en Taberna Camborio.</div><div class="generado">Documento generado el ${esc(new Date().toLocaleString('es-ES'))}</div></body></html>`;
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
    holder.style.zIndex = '999999';
    holder.style.pointerEvents = 'none';
    document.body.appendChild(holder);
    try {
      const image = holder.querySelector('.logo');
      if (image && !image.complete) await new Promise(resolve => { image.onload=resolve; image.onerror=resolve; });
      await html2pdf().set({margin:0,filename:`Reserva_${clean(reservation?.CodigoReserva)||'Camborio'}.pdf`,image:{type:'jpeg',quality:.98},html2canvas:{scale:2,useCORS:true,allowTaint:true,backgroundColor:'#fff',windowWidth:794,scrollX:0,scrollY:0},jsPDF:{unit:'pt',format:'a4',orientation:'portrait'},pagebreak:{mode:['css','legacy']}}).from(holder).save();
    } finally { holder.remove(); }
  }

  function run(r) {
    if (!r) return alert('No se ha encontrado la reserva para generar el justificante.');
    const buttons=[...document.querySelectorAll('#received-pdf,#found-pdf,#edit-pdf')];
    buttons.forEach(b=>b.disabled=true);
    download(r).catch(e=>{console.error(e);alert('No se pudo generar el PDF. Comprueba la conexión e inténtalo de nuevo.');}).finally(()=>buttons.forEach(b=>b.disabled=false));
  }

  function bind() {
    const received=document.getElementById('received-pdf');
    if(received) received.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();run(window.__publicReservation||window.__v4Reservation)},true);
    document.addEventListener('click',e=>{const b=e.target.closest('#found-pdf,#edit-pdf');if(!b)return;e.preventDefault();e.stopImmediatePropagation();run(window.__publicReservation||window.__v4Reservation)},true);
  }
  window.buildReservationPdf=download;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();