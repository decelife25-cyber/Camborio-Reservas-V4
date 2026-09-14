(function () {
  'use strict';

  let loading = null;

  const text = (value) => String(value == null ? '' : value).trim();
  const esc = (value) => text(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');

  function load() {
    if (window.html2canvas && (window.jspdf || window.jsPDF)) {
      return Promise.resolve();
    }
    if (loading) return loading;
    loading = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = () => {
        if (window.html2canvas && (window.jspdf || window.jsPDF)) resolve();
        else reject(new Error('Generador PDF no disponible'));
      };
      script.onerror = () => reject(new Error('No se pudo cargar el generador PDF'));
      document.head.appendChild(script);
    });
    return loading;
  }

  function fmtDate(value) {
    const match = text(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}-${match[2]}-${match[1]}` : text(value);
  }

  function fmtTime(value) {
    const match = text(value).match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : text(value).slice(0, 5);
  }

  function ui() {
    if (document.getElementById('pdf-runtime-styles')) return;
    const style = document.createElement('style');
    style.id = 'pdf-runtime-styles';
    style.textContent = `
      .pdf-spinner{display:inline-block;width:14px;height:14px;border:2px solid currentColor;border-right-color:transparent;border-radius:50%;vertical-align:-2px;animation:pdfspin .7s linear infinite}
      @keyframes pdfspin{to{transform:rotate(360deg)}}
      .pdf-progress{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:20000;background:#18202b;color:#fff;padding:12px 18px;border-radius:999px;font:600 14px Arial,sans-serif;box-shadow:0 4px 18px #0003;white-space:nowrap}
      .pdf-progress[hidden]{display:none}.pdf-progress.error{background:#9f2020}
    `;
    document.head.appendChild(style);
  }

  function status(message, error) {
    let node = document.getElementById('pdf-progress');
    if (!node) {
      node = document.createElement('div');
      node.id = 'pdf-progress';
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      document.body.appendChild(node);
    }
    node.className = `pdf-progress${error ? ' error' : ''}`;
    node.textContent = message;
    node.hidden = false;
    if (!error) setTimeout(() => { node.hidden = true; }, 1800);
  }

  function busy(button, on) {
    if (!button) return;
    if (on) {
      button.dataset.pdfOriginal = button.innerHTML;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.innerHTML = '<span class="pdf-spinner" aria-hidden="true"></span> GUARDANDO PDF…';
    } else {
      button.disabled = false;
      button.removeAttribute('aria-busy');
      button.innerHTML = button.dataset.pdfOriginal || 'DESCARGAR PDF';
    }
  }

  function markup(reservation) {
    const r = reservation || {};
    const estado = text(r.Estado).toUpperCase();
    const estados = {
      PENDIENTE: 'PENDIENTE DE CONFIRMACIÓN',
      CONFIRMADA: 'CONFIRMADA',
      SENTADA: 'SENTADA',
      FINALIZADA: 'FINALIZADA',
      CANCELADA_CLIENTE: 'CANCELADA POR EL CLIENTE',
      CANCELADA_LOCAL: 'CANCELADA POR EL RESTAURANTE',
      NO_PRESENTADO: 'NO PRESENTADO'
    };
    const estadoTexto = estados[estado] || estado || 'PENDIENTE DE CONFIRMACIÓN';
    const logo = new URL('logocamborio_trans.png', document.baseURI).href;

    return `<div class="pdf-page">
      <div class="head"><img class="logo" src="${esc(logo)}" alt="Taberna Camborio"><div class="head-copy"><div class="brand">TABERNA CAMBORIO</div><div class="sub"><span>—</span> CERVECERÍA - TAPERÍA <span>—</span></div><div class="muted">Calle Real, 184 - 11100 San Fernando</div><div class="muted">Teléfono: <b>956 25 45 32</b></div></div></div>
      <div class="gold-line"></div>
      <div class="code-title">CÓDIGO DE RESERVA</div>
      <div class="code">${esc(r.CodigoReserva || '-')}</div>
      <table class="data"><tr><th>Nombre</th><td>${esc(r.Nombre || '-')}</td></tr><tr><th>Teléfono</th><td>${esc(r.Telefono || '-')}</td></tr><tr><th>Email</th><td>${esc(r.Email || '-')}</td></tr><tr><th>Fecha</th><td>${esc(fmtDate(r.FechaReserva) || '-')}</td></tr><tr><th>Hora</th><td>${esc(fmtTime(r.HoraReserva) || '-')}</td></tr><tr><th>Personas</th><td>${esc(r.Personas || '-')}</td></tr><tr><th>Estado</th><td><span class="badge">${esc(estadoTexto)}</span></td></tr><tr><th>Observaciones</th><td>${esc(r.Observaciones || 'Sin observaciones')}</td></tr></table>
      <div class="notice"><b>ESTA RESERVA ESTÁ ${esc(estadoTexto)}.</b><br><span>En cuanto sea confirmada, podrás consultar el estado actual.</span></div>
      <div class="lookup"><b>PUEDE CONSULTAR EL ESTADO DE SU RESERVA</b><br><span>Puede consultar el estado actual de su reserva entrando con:</span><br>Teléfono: <b>${esc(r.Telefono || '-')}</b><br>Código de reserva: <b>${esc(r.CodigoReserva || '-')}</b></div>
      <div class="footer">Gracias por reservar en Taberna Camborio.</div>
      <div class="document-date">Documento generado · Reserva creada</div>
    </div>`;
  }

  function styles() {
    return `*{box-sizing:border-box}.pdf-page{width:794px;height:1123px;overflow:hidden;background:#fff;color:#202733;font:16px Arial,sans-serif;padding:28px 0 20px}.head,.gold-line,.code-title,.data,.notice,.lookup,.footer,.document-date{width:680px;margin-left:auto;margin-right:auto}.head{height:145px;display:flex;align-items:center;justify-content:center;gap:25px}.logo{display:block;width:150px;height:150px;object-fit:contain;flex:0 0 150px}.head-copy{text-align:center;flex:1}.brand{font:700 31px Georgia,serif;letter-spacing:1.3px;color:#5b260f;white-space:nowrap}.sub{font:700 19px Georgia,serif;letter-spacing:1.4px;color:#0d5a22;margin-top:7px;white-space:nowrap}.sub span{color:#d99b00;font-size:27px;vertical-align:-2px;margin:0 8px}.muted{margin-top:6px;font-size:15px}.gold-line{height:5px;background:#f2a100;margin-top:22px}.code-title{text-align:center;font-size:24px;font-weight:800;margin-top:23px;margin-bottom:10px}.code{width:520px;margin:0 auto 17px;border:2px solid #236b43;border-radius:9px;color:#126331;text-align:center;font-size:40px;font-weight:900;letter-spacing:8px;padding:10px}.data{border-collapse:separate;border-spacing:0;border:1px solid #dfe3e8;border-radius:12px;overflow:hidden;font-size:16px}.data th,.data td{border-bottom:1px solid #dfe3e8;padding:13px 15px;text-align:left;height:46px;line-height:1.25}.data tr:last-child th,.data tr:last-child td{border-bottom:0}.data th{width:36%;font-weight:700;background:#fff}.data td{color:#505866}.badge{display:inline-block;font-weight:800;color:#23633f;border:1px solid #e6b83f;border-radius:9px;padding:5px 12px}.notice,.lookup{margin-top:16px;padding:16px 20px;border-radius:10px;line-height:1.45}.notice{border:2px solid #e7b94b;background:#fff}.notice b{font-size:17px}.notice span{display:inline-block;margin-top:5px}.lookup{border:2px solid #6d9d7b;background:#fff}.lookup b:first-child{display:inline-block;color:#236b43;font-size:18px;margin-bottom:5px}.lookup span{display:inline-block;margin-bottom:3px}.footer{margin-top:25px;padding-top:16px;border-top:2px solid #236b43;text-align:center;font-weight:800;font-size:17px}.document-date{text-align:center;color:#555;font-size:12px;margin-top:7px}`;
  }

  async function generate(reservation, button) {
    ui();
    busy(button, true);
    status('Preparando el PDF…');

    let holder = null;
    const hiddenNodes = [];

    try {
      if (!reservation) throw new Error('No se ha encontrado la reserva');
      await load();
      status('Generando el PDF…');

      holder = document.createElement('div');
      holder.innerHTML = `<style>${styles()}</style>${markup(reservation)}`;
      Object.assign(holder.style, {
        position: 'fixed',
        left: '0',
        top: '0',
        width: '794px',
        height: '1123px',
        overflow: 'hidden',
        background: '#fff',
        pointerEvents: 'none',
        opacity: '1',
        zIndex: '0'
      });
      document.body.appendChild(holder);

      document.body.childNodes.forEach((node) => {
        if (node !== holder && node.nodeType === 1) {
          hiddenNodes.push([node, node.style.visibility]);
          node.style.visibility = 'hidden';
        }
      });

      const image = holder.querySelector('.logo');
      if (image && !image.complete) {
        await new Promise((resolve) => {
          image.onload = resolve;
          image.onerror = resolve;
        });
      }
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      status('Componiendo el PDF…');
      const canvas = await window.html2canvas(holder.querySelector('.pdf-page'), {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: 794,
        height: 1123,
        windowWidth: 794,
        windowHeight: 1123,
        scrollX: 0,
        scrollY: 0
      });

      if (!canvas || canvas.width < 10 || canvas.height < 10) {
        throw new Error('La captura del PDF está vacía');
      }

      const imageData = canvas.toDataURL('image/jpeg', 1);
      const JsPDF = window.jspdf && window.jspdf.jsPDF ? window.jspdf.jsPDF : window.jsPDF;
      if (!JsPDF) throw new Error('jsPDF no disponible');

      const pdf = new JsPDF({ unit: 'px', format: [794, 1123], orientation: 'portrait' });
      pdf.addImage(imageData, 'JPEG', 0, 0, 794, 1123, undefined, 'FAST');
      status('Guardando el PDF…');
      pdf.save(`Reserva_${text(reservation.CodigoReserva) || 'Camborio'}.pdf`);
      status('PDF guardado correctamente.');
    } catch (error) {
      console.error(error);
      status(`No se pudo guardar el PDF: ${error.message || 'Error'}`, true);
      alert(`No se pudo generar el PDF. ${error.message || 'Error'}`);
    } finally {
      hiddenNodes.forEach(([node, visibility]) => { node.style.visibility = visibility; });
      if (holder) holder.remove();
      busy(button, false);
    }
  }

  function bind() {
    const reservation = () => window.__publicReservation || window.__v4Reservation;
    document.addEventListener('click', (event) => {
      const button = event.target.closest('#received-pdf,#found-pdf,#edit-pdf');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!button.disabled) generate(reservation(), button);
    }, true);
  }

  window.buildReservationPdf = generate;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();