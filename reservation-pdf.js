(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  let libPromise = null;

  function loadLib() {
    if (window.PDFLib) return Promise.resolve(window.PDFLib);
    if (!libPromise) {
      libPromise = import('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm')
        .then((module) => module.default || module);
    }
    return libPromise;
  }

  const clean = (value) => String(value ?? '').trim();

  function formatDate(value) {
    const text = clean(value);
    const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}-${iso[2]}-${iso[1]}`;
    return text;
  }

  function formatTime(value) {
    const match = clean(value).match(/(?:T|^)(\d{1,2}):(\d{2})/);
    return match ? `${match[1].padStart(2, '0')}:${match[2]}` : clean(value).slice(0, 5);
  }

  function status(value) {
    const key = clean(value).toUpperCase();
    return ({
      PENDIENTE: 'Pendiente de confirmación',
      CONFIRMADA: 'Confirmada',
      SENTADA: 'Sentada',
      FINALIZADA: 'Finalizada',
      CANCELADA_CLIENTE: 'Cancelada por el cliente',
      CANCELADA_LOCAL: 'Cancelada por el restaurante',
      NO_PRESENTADO: 'No presentado'
    })[key] || key || 'Pendiente de confirmación';
  }

  function wrap(text, font, size, maxWidth) {
    const words = clean(text).split(/\s+/);
    const lines = [];
    let line = '';
    words.forEach((word) => {
      const candidate = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    });
    if (line) lines.push(line);
    return lines.length ? lines : ['-'];
  }

  async function loadLogo(pdf) {
    const candidates = ['logocamborio_trans.png', 'reservas_pwa.png'];
    for (const path of candidates) {
      try {
        const response = await fetch(`./${path}`, { cache: 'no-store' });
        if (!response.ok) continue;
        const bytes = await response.arrayBuffer();
        return await pdf.embedPng(bytes);
      } catch (_) {
        // Se prueba el siguiente recurso.
      }
    }
    return null;
  }

  async function make(reservation) {
    const { PDFDocument, StandardFonts, rgb } = await loadLib();
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const serif = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const logo = await loadLogo(pdf);

    const W = page.getWidth();
    const H = page.getHeight();
    const m = 42;
    const brown = rgb(0.357, 0.149, 0.059);
    const green = rgb(0.051, 0.353, 0.133);
    const gold = rgb(0.949, 0.631, 0);
    const ink = rgb(0.067, 0.094, 0.129);
    const muted = rgb(0.42, 0.45, 0.49);
    const light = rgb(0.984, 0.984, 0.984);
    const cream = rgb(0.996, 0.992, 0.949);

    // Cabecera recuperada visualmente del PDF original de V2.
    page.drawLine({ start: { x: m, y: H - 92 }, end: { x: W - m, y: H - 92 }, thickness: 3, color: gold });
    if (logo) {
      const scaled = logo.scale(0.23);
      page.drawImage(logo, { x: 58, y: H - 88, width: Math.min(scaled.width, 66), height: Math.min(scaled.height, 66) });
    }
    page.drawText('TABERNA CAMBORIO', { x: 125, y: H - 48, size: 21, font: serif, color: brown });
    page.drawText('CERVECERÍA · TAPERÍA', { x: 128, y: H - 67, size: 10.5, font: serif, color: green });
    page.drawText('Calle Real, 184 · 11100 San Fernando', { x: 128, y: H - 82, size: 8.5, font: regular, color: muted });
    page.drawText('Teléfono: 956 25 45 32', { x: 410, y: H - 82, size: 8.5, font: regular, color: green });

    page.drawText('CÓDIGO DE RESERVA', { x: W / 2 - 74, y: H - 123, size: 12, font: bold, color: ink });
    const code = clean(reservation?.CodigoReserva) || '-';
    page.drawRectangle({ x: m + 53, y: H - 178, width: W - 2 * m - 106, height: 40, borderColor: green, borderWidth: 1.5, color: rgb(0.985, 0.995, 0.987) });
    page.drawText(code, { x: W / 2 - bold.widthOfTextAtSize(code, 22) / 2, y: H - 164, size: 22, font: bold, color: green, characterSpacing: 2 });

    const rows = [
      ['Nombre', clean(reservation?.Nombre) || '-'],
      ['Teléfono', clean(reservation?.Telefono) || '-'],
      ['Email', clean(reservation?.Email) || '-'],
      ['Fecha', formatDate(reservation?.FechaReserva) || '-'],
      ['Hora', formatTime(reservation?.HoraReserva) || '-'],
      ['Personas', clean(reservation?.Personas) || '-'],
      ['Estado', status(reservation?.Estado)],
      ['Observaciones', clean(reservation?.Observaciones) || 'Sin observaciones']
    ];

    let y = H - 202;
    const rowH = 35;
    const labelW = 135;
    page.drawRectangle({ x: m, y: y - rows.length * rowH, width: W - 2 * m, height: rows.length * rowH, borderColor: rgb(0.84, 0.87, 0.9), borderWidth: 0.7 });
    rows.forEach((row, index) => {
      const top = y - index * rowH;
      const bottom = top - rowH;
      if (index % 2 === 0) page.drawRectangle({ x: m, y: bottom, width: W - 2 * m, height: rowH, color: light });
      if (index < rows.length - 1) page.drawLine({ start: { x: m, y: bottom }, end: { x: W - m, y: bottom }, thickness: 0.5, color: rgb(0.88, 0.9, 0.92) });
      page.drawLine({ start: { x: m + labelW, y: bottom }, end: { x: m + labelW, y: top }, thickness: 0.5, color: rgb(0.88, 0.9, 0.92) });
      page.drawText(row[0], { x: m + 10, y: top - 22, size: 8.5, font: bold, color: ink });
      wrap(row[1], regular, 8.8, W - m - (m + labelW + 10)).slice(0, 2).forEach((line, lineIndex) => {
        page.drawText(line, { x: m + labelW + 10, y: top - 15 - lineIndex * 10, size: 8.8, font: regular, color: ink });
      });
    });

    const state = clean(reservation?.Estado).toUpperCase();
    let ay = y - rows.length * rowH - 20;
    const ah = state === 'PENDIENTE' ? 58 : 42;
    page.drawRectangle({ x: m, y: ay - ah, width: W - 2 * m, height: ah, color: state === 'PENDIENTE' ? cream : rgb(0.925, 0.98, 0.94), borderColor: state === 'PENDIENTE' ? gold : green, borderWidth: 1 });
    page.drawText(state === 'PENDIENTE' ? 'ESTA RESERVA ESTÁ PENDIENTE DE CONFIRMACIÓN' : `ESTADO DE LA RESERVA: ${status(state).toUpperCase()}`, { x: m + 12, y: ay - 20, size: 9.5, font: bold, color: ink });
    if (state === 'PENDIENTE') page.drawText('El restaurante revisará la disponibilidad y confirmará su reserva lo antes posible.', { x: m + 12, y: ay - 36, size: 8.5, font: regular, color: ink });

    ay -= ah + 14;
    const qh = 68;
    page.drawRectangle({ x: m, y: ay - qh, width: W - 2 * m, height: qh, color: rgb(0.953, 0.984, 0.961), borderColor: green, borderWidth: 1 });
    page.drawText('PUEDE CONSULTAR EL ESTADO DE SU RESERVA', { x: m + 12, y: ay - 19, size: 9.5, font: bold, color: green });
    page.drawText('Teléfono:', { x: m + 12, y: ay - 36, size: 8.5, font: bold, color: ink });
    page.drawText(clean(reservation?.Telefono) || '-', { x: m + 67, y: ay - 36, size: 8.5, font: regular, color: ink });
    page.drawText('Código de reserva:', { x: m + 12, y: ay - 51, size: 8.5, font: bold, color: ink });
    page.drawText(code, { x: m + 112, y: ay - 51, size: 8.5, font: bold, color: green });

    page.drawLine({ start: { x: m, y: 47 }, end: { x: W - m, y: 47 }, thickness: 1, color: green });
    const thanks = 'Gracias por reservar en Taberna Camborio.';
    page.drawText(thanks, { x: W / 2 - regular.widthOfTextAtSize(thanks, 8.5) / 2, y: 34, size: 8.5, font: bold, color: ink });
    return pdf.save();
  }

  async function download(reservation) {
    const bytes = await make(reservation);
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Reserva_${clean(reservation?.CodigoReserva) || 'Camborio'}.pdf`;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    setTimeout(() => { anchor.remove(); URL.revokeObjectURL(url); }, 1500);
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
    const received = $('received-pdf');
    if (received) received.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      run(window.__publicReservation || window.__v4Reservation);
    }, true);
    document.addEventListener('click', (event) => {
      const button = event.target.closest('#found-pdf,#edit-pdf');
      if (!button) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      run(window.__publicReservation || window.__v4Reservation);
    }, true);
  }

  window.buildReservationPdf = download;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();