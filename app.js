const screens = ['screen-form','screen-confirm','screen-received','screen-thanks','screen-consult','screen-found','screen-edit'];
const state = { name:'', phone:'', email:'', people:'2', date:'', time:'', notes:'', code:'', reservation:null };
const $ = id => document.getElementById(id);
const cfg = window.CAMBORIO_CONFIG || {};
const apiUrl = () => `${String(cfg.supabaseUrl || '').replace(/\/$/, '')}/functions/v1/${cfg.publicFunction || 'public-reservas'}`;
const lunchFallback = ['12:30','12:45','13:00','13:15','13:30','13:45','14:00','14:15','14:30','14:45','15:00'];
const dinnerFallback = ['20:30','20:45','21:00','21:15','21:30','21:45','22:00','22:15','22:30','22:45','23:00'];

const todayISO = () => {
  const parts = new Intl.DateTimeFormat('en-CA',{timeZone:cfg.timezone || 'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  const y = parts.find(x=>x.type==='year')?.value, m = parts.find(x=>x.type==='month')?.value, d = parts.find(x=>x.type==='day')?.value;
  return `${y}-${m}-${d}`;
};
const parseISO = value => { const [y,m,d] = String(value||'').split('-').map(Number); return y&&m&&d ? new Date(y,m-1,d) : null; };
const isoDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const formatDate = value => { const d=parseISO(value); return d ? d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}) : '-'; };
const cleanPhone = value => String(value||'').replace(/\D/g,'');
const showError = message => alert(message || 'No se ha podido completar la operación.');
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

async function api(action, payload={}) {
  const response = await fetch(apiUrl(), { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action,...payload}) });
  let data = null;
  try { data = await response.json(); } catch (_) {}
  if (!response.ok || !data?.ok) throw new Error(data?.error || `Error HTTP ${response.status}`);
  return data;
}

function showScreen(id) {
  screens.forEach(screen => $(screen).classList.toggle('active', screen===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
function setDateField(id,value) {
  const el=$(id); el.dataset.iso=value||''; el.value=formatDate(value)==='-'?'':formatDate(value); el.classList.toggle('has-date',!!value);
}
function renderSummary(target='summary', data=state) {
  const rows=[['👤 Nombre',data.name||data.Nombre||'-'],['📞 Teléfono',data.phone||data.Telefono||'-'],['✉️ Email',data.email||data.Email||'-'],['👥 Comensales',data.people||data.Personas||'-'],['📅 Fecha',formatDate(data.date||data.FechaReserva)],['🕘 Hora',data.time||String(data.HoraReserva||'').slice(0,5)||'-'],['📝 Observaciones',data.notes||data.Observaciones||'Sin observaciones']];
  $(target).innerHTML=rows.map(([label,value])=>`<div class="summary-row"><span class="summary-label">${label}</span><span class="summary-value">${escapeHtml(value)}</span></div>`).join('');
}

let calendarTarget='date', calendarMonth=new Date(); calendarMonth.setDate(1);
function moveDateModalInline(target) {
  const modal=$('date-modal'), field=$(target), row=target==='date'?field.closest('.date-time-row'):field.closest('.grid-2');
  if(row?.parentNode) row.parentNode.insertBefore(modal,row.nextSibling);
}
function openDateModal(target) {
  calendarTarget=target; moveDateModalInline(target);
  const current=$(target).dataset.iso || todayISO(); const d=parseISO(current)||parseISO(todayISO());
  calendarMonth=new Date(d.getFullYear(),d.getMonth(),1); renderCalendar(); $('date-modal').hidden=false;
}
function closeDateModal(){ $('date-modal').hidden=true; }
function renderCalendar(){
  const y=calendarMonth.getFullYear(), m=calendarMonth.getMonth();
  $('date-month').textContent=calendarMonth.toLocaleDateString('es-ES',{month:'long'}).replace(/^./,c=>c.toUpperCase()); $('date-year').textContent=y;
  const grid=$('date-grid'); grid.innerHTML=''; const first=new Date(y,m,1), offset=(first.getDay()+6)%7, days=new Date(y,m+1,0).getDate(), min=todayISO();
  for(let i=0;i<offset;i++){const empty=document.createElement('span');empty.className='date-empty';grid.appendChild(empty)}
  for(let day=1;day<=days;day++){
    const d=new Date(y,m,day), value=isoDate(d), b=document.createElement('button'); b.type='button'; b.className='date-day'; b.textContent=day;
    if(value<min){b.disabled=true;b.classList.add('disabled')}
    if(value===$(calendarTarget).dataset.iso)b.classList.add('selected'); if(value===min)b.classList.add('today');
    b.onclick=async()=>{ setDateField(calendarTarget,value); closeDateModal(); if(calendarTarget==='date'){ state.date=value; state.time=''; $('selected-time').textContent='Selecciona una hora'; $('time-trigger').classList.remove('has-time'); $('time-trigger').disabled=false; clearTimes('lunch-times','dinner-times'); await loadAvailability(value,'main'); } else { $('edit-selected-time').textContent='Selecciona una hora'; $('edit-time-trigger').classList.remove('has-time'); clearTimes('edit-lunch-times','edit-dinner-times'); await loadAvailability(value,'edit'); } };
    grid.appendChild(b);
  }
}
function changeMonth(delta){ const next=new Date(calendarMonth.getFullYear(),calendarMonth.getMonth()+delta,1), min=new Date(parseISO(todayISO()).getFullYear(),parseISO(todayISO()).getMonth(),1); if(next<min)return; calendarMonth=next; renderCalendar(); }
function clearTimes(...ids){ ids.forEach(id=>$(id).innerHTML=''); }
function makeTimes(target,values,onSelect){ clearTimes(target); values.forEach(value=>{const b=document.createElement('button');b.type='button';b.className='time-btn';b.textContent=value;b.onclick=()=>onSelect(value,b);$(target).appendChild(b);}); }
function renderTimeGroups(groups, mode='main'){
  const lunchId=mode==='edit'?'edit-lunch-times':'lunch-times', dinnerId=mode==='edit'?'edit-dinner-times':'dinner-times'; clearTimes(lunchId,dinnerId);
  const lunch=groups?.COMIDA||[], dinner=groups?.CENA||[];
  if(!lunch.length&&!dinner.length){
    const msg=document.createElement('div');msg.className='help-text';msg.textContent='No hay horas disponibles para esta fecha.';$(lunchId).appendChild(msg);return;
  }
  const select=(value,b)=>{
    if(mode==='edit'){$('edit-selected-time').textContent=value;$('edit-time-trigger').classList.add('has-time');document.querySelectorAll('#edit-time-panel .time-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('edit-time-panel').hidden=true;}
    else{state.time=value;$('selected-time').textContent=value;$('time-trigger').classList.add('has-time');document.querySelectorAll('#time-panel .time-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('time-panel').hidden=true;}
  };
  makeTimes(lunchId,lunch,select); makeTimes(dinnerId,dinner,select);
}
async function loadAvailability(date,mode='main'){
  try{const result=await api('availability',{date});renderTimeGroups(result.availability,mode);}catch(error){clearTimes(mode==='edit'?'edit-lunch-times':'lunch-times',mode==='edit'?'edit-dinner-times':'dinner-times');showError(error.message);}
}
function syncTimeTriggers(){
  $('time-trigger').disabled=!state.date; $('edit-time-trigger').disabled=!$('edit-date').dataset.iso;
}

$('date').onclick=()=>openDateModal('date'); $('edit-date').onclick=()=>openDateModal('edit-date'); $('date-prev').onclick=()=>changeMonth(-1); $('date-next').onclick=()=>changeMonth(1); $('date-cancel').onclick=closeDateModal; $('date-modal-close').onclick=closeDateModal;
$('time-trigger').onclick=async()=>{if(!state.date)return; if(!$('time-panel').hidden){$('time-panel').hidden=true;return;} if(!$('lunch-times').children.length&&!$('dinner-times').children.length)await loadAvailability(state.date,'main'); $('time-panel').hidden=false;};
$('edit-time-trigger').onclick=async()=>{const date=$('edit-date').dataset.iso;if(!date)return;if(!$('edit-time-panel').hidden){$('edit-time-panel').hidden=true;return;}if(!$('edit-lunch-times').children.length&&!$('edit-dinner-times').children.length)await loadAvailability(date,'edit');$('edit-time-panel').hidden=false;};
$('reservation-form').onsubmit=async e=>{e.preventDefault();state.name=$('name').value.trim();state.phone=cleanPhone($('phone').value);state.email=$('email').value.trim();state.people=$('people').value;state.date=$('date').dataset.iso||'';state.notes=$('notes').value.trim();if(!state.name||!/^\d{9}$/.test(state.phone)||!state.people||!state.date||!state.time){showError(!state.date?'Selecciona primero una fecha.':!state.time?'Selecciona una hora disponible.':'Completa los datos obligatorios.');return;}renderSummary();showScreen('screen-confirm');};
$('back-button').onclick=()=>showScreen('screen-form');
$('confirm-button').onclick=async()=>{const button=$('confirm-button');button.disabled=true;try{const result=await api('create',{nombre:state.name,telefono:state.phone,email:state.email,personas:Number(state.people),fecha:state.date,hora:state.time,observaciones:state.notes});state.reservation=result.reservation;state.code=result.reservation.CodigoReserva;state.phone=result.reservation.Telefono;state.date=result.reservation.FechaReserva;state.time=String(result.reservation.HoraReserva).slice(0,5);$('reservation-code').textContent=state.code;showScreen('screen-received');}catch(error){showError(error.message);}finally{button.disabled=false;}};
$('finish-button').onclick=()=>{state.reservation=null;state.code='';showScreen('screen-thanks');};
$('existing-button').onclick=()=>showScreen('screen-consult'); $('consult-back').onclick=()=>showScreen('screen-form');
$('lookup-button').onclick=async()=>{const phone=cleanPhone($('lookup-phone').value),code=$('lookup-code').value.trim().toUpperCase();if(!/^\d{9}$/.test(phone)||!code){showError('Introduce un teléfono válido y el código de reserva.');return;}const button=$('lookup-button');button.disabled=true;try{const result=await api('lookup',{telefono:phone,codigo:code});if(!result.reservation){showError('No se ha encontrado una reserva con esos datos.');return;}state.reservation=result.reservation;state.code=result.reservation.CodigoReserva;renderFound(result.reservation);showScreen('screen-found');}catch(error){showError(error.message);}finally{button.disabled=false;}};
function renderFound(r){renderSummary('found-summary',r);}
$('found-edit').onclick=()=>{const r=state.reservation;if(!r)return;populateEdit(r);showScreen('screen-edit');};
function populateEdit(r){$('edit-name').value=r.Nombre||'';$('edit-phone').value=r.Telefono||'';$('edit-email').value=r.Email||'';$('edit-people').value=r.Personas||2;setDateField('edit-date',r.FechaReserva||'');$('edit-selected-time').textContent=String(r.HoraReserva||'').slice(0,5)||'Selecciona una hora';$('edit-time-trigger').classList.toggle('has-time',!!r.HoraReserva);$('edit-notes').value=r.Observaciones||'';$('edit-code').textContent=r.CodigoReserva||state.code;clearTimes('edit-lunch-times','edit-dinner-times');syncTimeTriggers();}
$('found-back').onclick=()=>showScreen('screen-consult');
async function cancelCurrentReservation(){if(!state.reservation)return; if(!confirm('¿Quieres cancelar esta reserva?'))return;try{const r=state.reservation;const result=await api('cancel',{telefono:r.Telefono,codigo:r.CodigoReserva});state.reservation=result.reservation;renderFound(result.reservation);showError('La reserva ha sido cancelada correctamente.');showScreen('screen-found');}catch(error){showError(error.message);}}
$('found-cancel').onclick=cancelCurrentReservation; $('cancel-reservation').onclick=cancelCurrentReservation;
$('found-email').onclick=()=>openEmailModal(); $('received-email').onclick=()=>openEmailModal();
$('received-pdf').onclick=()=>downloadReservationPdf(state.reservation);
$('email-close').onclick=closeEmailModal; $('email-cancel').onclick=closeEmailModal; $('email-modal-close').onclick=closeEmailModal;
function openEmailModal(){$('email-modal').hidden=false;const current=state.reservation?.Email||state.email||'';$('email-send').value=current;setTimeout(()=>$('email-send').focus(),50);} function closeEmailModal(){$('email-modal').hidden=true;}
$('email-form').onsubmit=async e=>{e.preventDefault();if(!state.reservation){closeEmailModal();return;}const destination=$('email-send').value.trim();if(!destination)return;const button=e.submitter||$('email-form').querySelector('button.primary');button.disabled=true;try{await api('email',{telefono:state.reservation.Telefono,codigo:state.reservation.CodigoReserva,email:destination});closeEmailModal();showError('La solicitud de envío ha quedado registrada.');}catch(error){showError(error.message);}finally{button.disabled=false;}};
$('edit-back').onclick=()=>showScreen('screen-found');
$('edit-form').onsubmit=async e=>{e.preventDefault();if(!state.reservation)return;const date=$('edit-date').dataset.iso||'',timeValue=$('edit-selected-time').textContent.trim();if(!date){showError('Selecciona una fecha.');return;}if(!/^\d{1,2}:\d{2}$/.test(timeValue)){showError('Selecciona una hora disponible.');return;}const payload={telefono:state.reservation.Telefono,codigo:state.reservation.CodigoReserva,nombre:$('edit-name').value.trim(),email:$('edit-email').value.trim(),personas:Number($('edit-people').value),fecha:date,hora:timeValue,observaciones:$('edit-notes').value.trim()};const button=e.submitter||$('edit-form').querySelector('button.success');button.disabled=true;try{const result=await api('update',payload);state.reservation=result.reservation;state.code=result.reservation.CodigoReserva;renderFound(result.reservation);showError('Los cambios se han guardado correctamente.');showScreen('screen-found');}catch(error){showError(error.message);}finally{button.disabled=false;}};
function downloadReservationPdf(r){if(!r)return;const w=window.open('','_blank');if(!w){showError('El navegador ha bloqueado la ventana para generar el PDF.');return;}const html=`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Reserva ${escapeHtml(r.CodigoReserva)}</title><style>body{font-family:Arial,sans-serif;padding:32px;color:#222}h1{margin-bottom:4px}table{border-collapse:collapse;width:100%;max-width:520px}td{padding:9px;border-bottom:1px solid #ddd}td:first-child{font-weight:bold;width:40%}@media print{body{padding:0}}</style></head><body><h1>Taberna Camborio</h1><p>Comprobante de reserva</p><table>${[['Código',r.CodigoReserva],['Nombre',r.Nombre],['Teléfono',r.Telefono],['Email',r.Email||'-'],['Personas',r.Personas],['Fecha',formatDate(r.FechaReserva)],['Hora',String(r.HoraReserva||'').slice(0,5)],['Estado',r.Estado],['Observaciones',r.Observaciones||'-']].map(x=>`<tr><td>${escapeHtml(x[0])}</td><td>${escapeHtml(x[1])}</td></tr>`).join('')}</table><script>window.onload=()=>setTimeout(()=>window.print(),150);</script></body></html>`;w.document.write(html);w.document.close();}

setDateField('date','');setDateField('edit-date','');$('time-trigger').disabled=true;$('edit-time-trigger').disabled=true;
if('serviceWorker' in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));
