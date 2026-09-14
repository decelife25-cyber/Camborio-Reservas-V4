(function () {
  'use strict';

  const PAGE = {
    widthPt: 595.28,
    heightPt: 841.89,
    widthPx: 1240,
    heightPx: 1754,
  };

  const text = (value) => String(value == null ? '' : value).trim();

  function fmtDate(value) {
    const raw = text(value);
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
    return match ? `${match[3]}/${match[2]}/${match[1]}` : raw;
  }

  function fmtTime(value) {
    const match = text(value).match(/(?:T|\s|^)(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : text(value).slice(0, 5);
  }

  function reservationStatus(value) {
    const key = text(value).toUpperCase();
    const labels = {
      PENDIENTE: 'PENDIENTE DE CONFIRMACIÓN',
      CONFIRMADA: 'CONFIRMADA',
      SENTADA: 'SENTADA',
      FINALIZADA: 'FINALIZADA',
      CANCELADA_CLIENTE: 'CANCELADA POR EL CLIENTE',
      CANCELADA_LOCAL: 'CANCELADA POR EL RESTAURANTE',
      NO_PRESENTADO: 'NO PRESENTADO',
    };
    return labels[key] || key || 'PENDIENTE DE CONFIRMACIÓN';
  }

  function ensureUi() {
    if (document.getElementById('pdf-runtime-styles')) return;
    const style = document.createElement('style');
    style.id = 'pdf-runtime-styles';
    style.textContent = ''
      + '#pdf-progress{position:fixed;inset:0;z-index:20000;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,18,23,.46)}'
      + '#pdf-progress[hidden]{display:none}'
      + '#pdf-progress .pdf-progress-card{width:min(360px,100%);background:#fff;color:#18202b;border-radius:18px;padding:22px 20px;text-align:center;box-shadow:0 18px 45px rgba(0,0,0,.28);font:600 15px Arial,sans-serif}'
      + '#pdf-progress .pdf-progress-spinner{width:34px;height:34px;margin:0 auto 14px;border-radius:50%;border:4px solid rgba(24,32,43,.15);border-top-color:#1f7a46;animation:camborioPdfSpin .8s linear infinite}'
      + '#pdf-progress .pdf-progress-title{font-size:18px;font-weight:800;margin-bottom:8px}'
      + '#pdf-progress .pdf-progress-message{line-height:1.4}'
      + '@keyframes camborioPdfSpin{to{transform:rotate(360deg)}}';
    document.head.appendChild(style);
  }

  function setProgress(message) {
    ensureUi();
    let node = document.getElementById('pdf-progress');
    if (!node) {
      node = document.createElement('div');
      node.id = 'pdf-progress';
      node.hidden = true;
      node.setAttribute('role', 'status');
      node.setAttribute('aria-live', 'polite');
      node.setAttribute('aria-atomic', 'true');
      node.innerHTML = '<div class="pdf-progress-card"><div class="pdf-progress-spinner" aria-hidden="true"></div><div class="pdf-progress-title">Generando PDF…</div><div class="pdf-progress-message"></div></div>';
      document.body.appendChild(node);
    }
    node.querySelector('.pdf-progress-message').textContent = message;
    node.hidden = false;
  }

  function clearProgress() {
    const node = document.getElementById('pdf-progress');
    if (node) node.hidden = true;
  }

  function showMessage(message, options) {
    if (typeof window.__camborioModal === 'function') {
      try {
        window.__camborioModal(message, options || {});
        return;
      } catch {}
    }
    alert(message);
  }

  function busy(button, on) {
    if (!button) return;
    if (on) {
      button.dataset.pdfOriginal = button.innerHTML;
      button.disabled = true;
      button.setAttribute('aria-busy', 'true');
      button.textContent = 'GENERANDO PDF…';
      return;
    }
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.innerHTML = button.dataset.pdfOriginal || 'DESCARGAR PDF';
  }

  function getLogoUrl() {
    const brand = document.querySelector('.brand-mark');
    if (brand?.currentSrc) return brand.currentSrc;
    if (brand?.src) return brand.src;
    return new URL('logocamborio_trans.png?v=20260907', document.baseURI).href;
  }

  function loadImage(src, timeoutMs) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const timer = setTimeout(() => reject(new Error('El logo de Camborio tardó demasiado en cargarse.')), timeoutMs);
      image.onload = () => {
        clearTimeout(timer);
        resolve(image);
      };
      image.onerror = () => {
        clearTimeout(timer);
        reject(new Error('No se pudo cargar el logo de Camborio.'));
      };
      image.decoding = 'async';
      if (new URL(src, document.baseURI).origin !== location.origin) image.crossOrigin = 'anonymous';
      image.src = src;
    });
  }

  function wrapText(ctx, value, maxWidth) {
    const input = text(value) || '-';
    const paragraphs = input.split(/\r?\n/);
    const lines = [];
    const splitWord = word => {
      if (ctx.measureText(word).width <= maxWidth) return [word];
      const parts = [];
      let chunk = '';
      for (const char of word) {
        const next = chunk + char;
        if (chunk && ctx.measureText(next).width > maxWidth) {
          parts.push(chunk);
          chunk = char;
        } else chunk = next;
      }
      if (chunk) parts.push(chunk);
      return parts;
    };
    paragraphs.forEach((paragraph, index) => {
      const words = paragraph.split(/\s+/).filter(Boolean).flatMap(splitWord);
      if (!words.length) {
        lines.push('');
      } else {
        let line = words.shift();
        words.forEach(word => {
          const next = `${line} ${word}`;
          if (ctx.measureText(next).width <= maxWidth) line = next;
          else {
            lines.push(line);
            line = word;
          }
        });
        lines.push(line);
      }
      if (index < paragraphs.length - 1) lines.push('');
    });
    return lines.length ? lines : ['-'];
  }

  function roundRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  }

  function fillBox(ctx, x, y, width, height, options) {
    roundRect(ctx, x, y, width, height, options.radius || 18);
    ctx.fillStyle = options.fill || '#ffffff';
    ctx.fill();
    if (options.stroke) {
      ctx.lineWidth = options.lineWidth || 2;
      ctx.strokeStyle = options.stroke;
      ctx.stroke();
    }
  }

  function measureRow(ctx, label, value, layout) {
    const x = 90;
    const width = PAGE.widthPx - 180;
    const labelWidth = layout.labelWidth;
    const valueX = x + labelWidth;
    const valueWidth = width - labelWidth - 28;
    ctx.font = `500 ${layout.fontSize}px Arial`;
    const lines = wrapText(ctx, value, valueWidth);
    const height = Math.max(layout.minHeight, layout.paddingTop + lines.length * layout.lineHeight);
    return { label, lines, x, width, valueX, height };
  }

  function drawRow(ctx, y, measured, layout) {
    const { label, lines, x, width, valueX, height } = measured;
    fillBox(ctx, x, y, width, height, { fill: '#ffffff', stroke: '#dfe4ea', radius: 16, lineWidth: 2 });
    ctx.strokeStyle = '#dfe4ea';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(valueX - 14, y + 16);
    ctx.lineTo(valueX - 14, y + height - 16);
    ctx.stroke();
    ctx.fillStyle = '#202733';
    ctx.font = `700 ${layout.fontSize}px Arial`;
    ctx.fillText(label, x + 24, y + layout.textTop);
    ctx.fillStyle = '#4d5662';
    ctx.font = `500 ${layout.fontSize}px Arial`;
    lines.forEach((line, index) => ctx.fillText(line, valueX + 10, y + layout.textTop + index * layout.lineHeight));
    return y + height + layout.gap;
  }

  function renderCanvas(reservation, logo) {
    const canvas = document.createElement('canvas');
    canvas.width = PAGE.widthPx;
    canvas.height = PAGE.heightPx;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('El navegador no permite dibujar el PDF.');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(logo, 92, 92, 180, 180);
    ctx.fillStyle = '#5b260f';
    ctx.font = '700 46px Georgia, serif';
    ctx.fillText('TABERNA CAMBORIO', 308, 150);
    ctx.fillStyle = '#0d5a22';
    ctx.font = '700 32px Georgia, serif';
    ctx.fillText('CERVECERÍA · TAPERÍA', 308, 196);
    ctx.fillStyle = '#505866';
    ctx.font = '500 24px Arial';
    ctx.fillText('Calle Real, 184 · 11100 San Fernando', 308, 236);
    ctx.fillText('Teléfono: 956 25 45 32', 308, 268);

    ctx.fillStyle = '#f2a100';
    ctx.fillRect(90, 310, PAGE.widthPx - 180, 8);

    ctx.fillStyle = '#202733';
    ctx.font = '800 34px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('CÓDIGO DE RESERVA', PAGE.widthPx / 2, 382);
    fillBox(ctx, 220, 412, PAGE.widthPx - 440, 92, { fill: '#ffffff', stroke: '#236b43', radius: 18, lineWidth: 3 });
    ctx.fillStyle = '#126331';
    ctx.font = '900 54px Arial';
    ctx.fillText(text(reservation.CodigoReserva) || '-', PAGE.widthPx / 2, 474);
    ctx.textAlign = 'start';

    const rowData = [
      ['Nombre', reservation.Nombre || '-'],
      ['Teléfono', reservation.Telefono || '-'],
      ['Email', reservation.Email || '-'],
      ['Fecha', fmtDate(reservation.FechaReserva) || '-'],
      ['Hora', fmtTime(reservation.HoraReserva) || '-'],
      ['Personas', reservation.Personas || '-'],
      ['Estado', reservationStatus(reservation.Estado)],
      ['Observaciones', reservation.Observaciones || 'Sin observaciones'],
    ];
    const maxRowsBottom = PAGE.heightPx - 430;
    let layout = { fontSize: 28, lineHeight: 32, labelWidth: 240, minHeight: 74, paddingTop: 26, textTop: 45, gap: 14 };
    let measuredRows = [];
    let y = 542;
    do {
      y = 542;
      measuredRows = rowData.map(([label, value]) => {
        const measured = measureRow(ctx, label, value, layout);
        y += measured.height + layout.gap;
        return measured;
      });
      if (y <= maxRowsBottom || layout.fontSize <= 20) break;
      layout = {
        fontSize: layout.fontSize - 2,
        lineHeight: layout.lineHeight - 2,
        labelWidth: 220,
        minHeight: Math.max(62, layout.minHeight - 4),
        paddingTop: Math.max(22, layout.paddingTop - 2),
        textTop: Math.max(40, layout.textTop - 2),
        gap: 12,
      };
    } while (true);

    y = 542;
    measuredRows.forEach(row => {
      y = drawRow(ctx, y, row, layout);
    });

    fillBox(ctx, 90, y + 4, PAGE.widthPx - 180, 114, { fill: '#fff8e8', stroke: '#e7b94b', radius: 18, lineWidth: 2 });
    ctx.fillStyle = '#6f4d00';
    ctx.font = '800 29px Arial';
    ctx.fillText(`ESTADO ACTUAL: ${reservationStatus(reservation.Estado)}`, 118, y + 48);
    ctx.fillStyle = '#5b533e';
    ctx.font = '500 24px Arial';
    ctx.fillText('Puedes usar este documento para consultar o acreditar tu reserva.', 118, y + 84);

    fillBox(ctx, 90, y + 136, PAGE.widthPx - 180, 126, { fill: '#eef8f1', stroke: '#6d9d7b', radius: 18, lineWidth: 2 });
    ctx.fillStyle = '#236b43';
    ctx.font = '800 30px Arial';
    ctx.fillText('CONSULTA DE RESERVA', 118, y + 180);
    ctx.fillStyle = '#44515f';
    ctx.font = '500 24px Arial';
    ctx.fillText(`Teléfono: ${text(reservation.Telefono) || '-'}`, 118, y + 220);
    ctx.fillText(`Código: ${text(reservation.CodigoReserva) || '-'}`, 118, y + 252);

    ctx.strokeStyle = '#236b43';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(90, PAGE.heightPx - 132);
    ctx.lineTo(PAGE.widthPx - 90, PAGE.heightPx - 132);
    ctx.stroke();

    ctx.fillStyle = '#202733';
    ctx.font = '800 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Gracias por reservar en Taberna Camborio.', PAGE.widthPx / 2, PAGE.heightPx - 88);
    ctx.fillStyle = '#66717c';
    ctx.font = '500 20px Arial';
    ctx.fillText('Documento generado · Reserva creada', PAGE.widthPx / 2, PAGE.heightPx - 52);
    ctx.textAlign = 'start';

    return canvas;
  }

  function canvasToJpegBytes(canvas) {
    return new Promise((resolve, reject) => {
      if (typeof canvas.toBlob === 'function') {
        canvas.toBlob(async blob => {
          if (!blob) {
            reject(new Error('No se pudo componer la imagen del PDF.'));
            return;
          }
          resolve(new Uint8Array(await blob.arrayBuffer()));
        }, 'image/jpeg', 0.92);
        return;
      }
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        const base64 = dataUrl.split(',')[1] || '';
        const binary = atob(base64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
        resolve(bytes);
      } catch (error) {
        reject(new Error('No se pudo exportar el PDF.'));
      }
    });
  }

  function buildPdfBytes(imageBytes) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let position = 0;

    function pushString(value) {
      const bytes = encoder.encode(value);
      chunks.push(bytes);
      position += bytes.length;
    }

    function pushBytes(bytes) {
      chunks.push(bytes);
      position += bytes.length;
    }

    function addObject(id, value) {
      offsets[id] = position;
      pushString(`${id} 0 obj\n`);
      if (typeof value === 'string') pushString(value);
      else pushBytes(value);
      pushString('\nendobj\n');
    }

    pushString('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');
    addObject(1, '<< /Type /Catalog /Pages 2 0 R >>');
    addObject(2, '<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    addObject(3, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE.widthPt.toFixed(2)} ${PAGE.heightPt.toFixed(2)}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`);
    addObject(4, (() => {
      const start = encoder.encode(`<< /Type /XObject /Subtype /Image /Width ${PAGE.widthPx} /Height ${PAGE.heightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
      const end = encoder.encode('\nendstream');
      const bytes = new Uint8Array(start.length + imageBytes.length + end.length);
      bytes.set(start, 0);
      bytes.set(imageBytes, start.length);
      bytes.set(end, start.length + imageBytes.length);
      return bytes;
    })());
    addObject(5, (() => {
      const stream = `q\n${PAGE.widthPt.toFixed(2)} 0 0 ${PAGE.heightPt.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
      return `<< /Length ${encoder.encode(stream).length} >>\nstream\n${stream}endstream`;
    })());

    const xrefOffset = position;
    pushString(`xref\n0 ${offsets.length}\n`);
    pushString('0000000000 65535 f \n');
    for (let id = 1; id < offsets.length; id += 1) {
      pushString(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
    }
    pushString(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

    const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const output = new Uint8Array(size);
    let cursor = 0;
    chunks.forEach(chunk => {
      output.set(chunk, cursor);
      cursor += chunk.length;
    });
    return output;
  }

  function downloadPdf(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.rel = 'noopener';
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }

  function pdfFilename(reservation) {
    const code = text(reservation?.CodigoReserva).replace(/[^0-9A-Za-z_-]+/g, '').slice(0, 40);
    return `Reserva_${code || 'Camborio'}.pdf`;
  }

  function isPdfBytes(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 16) return false;
    return bytes[0] === 37
      && bytes[1] === 80
      && bytes[2] === 68
      && bytes[3] === 70
      && bytes[4] === 45
      && bytes[bytes.length - 5] === 37
      && bytes[bytes.length - 4] === 37
      && bytes[bytes.length - 3] === 69
      && bytes[bytes.length - 2] === 79
      && bytes[bytes.length - 1] === 70;
  }

  async function generate(reservation, button) {
    busy(button, true);
    setProgress('Preparando la reserva para descargarla en PDF.');
    try {
      if (!reservation) throw new Error('No se ha encontrado la reserva.');
      const logo = await loadImage(getLogoUrl(), 12000);
      setProgress('Componiendo el PDF con los datos de la reserva.');
      const canvas = renderCanvas(reservation, logo);
      const imageBytes = await canvasToJpegBytes(canvas);
      if (!imageBytes.length) throw new Error('La imagen del PDF está vacía.');
      setProgress('Guardando el archivo PDF.');
      const pdfBytes = buildPdfBytes(imageBytes);
      if (!isPdfBytes(pdfBytes)) throw new Error('El archivo PDF generado es inválido.');
      downloadPdf(pdfBytes, pdfFilename(reservation));
    } catch (error) {
      console.error(error);
      showMessage(`No se pudo generar el PDF. ${error?.message || 'Error inesperado.'}`, { title: 'PDF no disponible', icon: '⚠️' });
    } finally {
      clearProgress();
      busy(button, false);
    }
  }

  function bind() {
    const reservation = () => window.__publicReservation || window.__v4Reservation;
    document.addEventListener('click', event => {
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
