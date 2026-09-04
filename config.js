window.CAMBORIO_CONFIG = Object.freeze({
  supabaseUrl: 'https://caeszgtogifserrxdrcw.supabase.co',
  supabaseAnonKey: 'sb_publishable_g8c6I-h5g0omPamXeduuYQ_V4g0PlZU',
  publicReservationsFunction: 'https://caeszgtogifserrxdrcw.supabase.co/functions/v1/public-reservas',
  timezone: 'Europe/Madrid'
});

// V4: el selector de hora debe quedar conectado al backend real y no depender
// de datos simulados ni del orden de carga de los scripts auxiliares.
window.addEventListener('DOMContentLoaded', () => setTimeout(() => {
  const $ = id => document.getElementById(id);
  const api = window.CAMBORIO_CONFIG.publicReservationsFunction;
  const modal = (message, title = 'Información', icon = 'ℹ️') => {
    if (typeof window.__camborioModal === 'function') return window.__camborioModal(message, {title, icon});
    return Promise.resolve(false);
  };
  const isoFromField = field => {
    if (!field) return '';
    if (field.dataset.iso) return field.dataset.iso;
    const m = String(field.value || '').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) return '';
    const iso = `${m[3]}-${m[2]}-${m[1]}`;
    field.dataset.iso = iso;
    return iso;
  };
  const loadTimes = async (edit = false) => {
    const dateField = $(edit ? 'edit-date' : 'date');
    const panel = $(edit ? 'edit-time-panel' : 'time-panel');
    const lunch = $(edit ? 'edit-lunch-times' : 'lunch-times');
    const dinner = $(edit ? 'edit-dinner-times' : 'dinner-times');
    const iso = isoFromField(dateField);
    if (!iso) return modal('Primero selecciona una fecha.', 'Falta la fecha', '📅');
    try {
      const r = await fetch(`${api}?action=availability&date=${encodeURIComponent(iso)}`, {cache:'no-store'});
      const d = await r.json();
      if (!r.ok || d.ok === false) throw new Error(d.error || 'No se han podido consultar las horas disponibles.');
      const a = d.availability || {};
      const render = (box, values) => {
        if (!box) return;
        box.innerHTML = '';
        (values || []).forEach(time => {
          const b = document.createElement('button');
          b.type = 'button'; b.className = 'time-btn'; b.textContent = time;
          b.onclick = () => {
            if (edit) {
              $('edit-selected-time').textContent = time;
              $('edit-time-trigger').classList.add('has-time');
              if (window.state) window.state.time = time;
            } else {
              if (window.state) window.state.time = time;
              $('selected-time').textContent = time;
              $('time-trigger').classList.add('has-time');
            }
            document.querySelectorAll(`#${edit ? 'edit-time-panel' : 'time-panel'} .time-btn`).forEach(x => x.classList.remove('selected'));
            b.classList.add('selected');
            if (panel) panel.hidden = true;
          };
          box.appendChild(b);
        });
      };
      render(lunch, a.COMIDA || []);
      render(dinner, a.CENA || []);
      if (!((a.COMIDA || []).length || (a.CENA || []).length)) {
        if (panel) panel.hidden = false;
        await modal('No quedan horas disponibles para ese día. Recuerda que la reserva debe hacerse con al menos una hora de antelación.', 'Sin disponibilidad', '🕐');
        return;
      }
      if (panel) panel.hidden = false;
    } catch (e) {
      await modal(e.message, 'No se pudo consultar', '⚠️');
    }
  };
  const main = $('time-trigger');
  if (main) main.onclick = e => { e.preventDefault(); loadTimes(false); };
  const edit = $('edit-time-trigger');
  if (edit) edit.onclick = e => { e.preventDefault(); loadTimes(true); };
}, 0));
