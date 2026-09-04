(function(){
  'use strict';

  const API=(window.CAMBORIO_CONFIG||{}).publicReservationsFunction||'https://caeszgtogifserrxdrcw.supabase.co/functions/v1/public-reservas';
  const $=id=>document.getElementById(id);

  function injectModal(){
    if($('app-info-modal')) return;
    const s=document.createElement('style');
    s.textContent=`
      #app-info-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;background:rgba(9,12,16,.72);backdrop-filter:blur(3px)}
      #app-info-modal.open{display:flex}
      #app-info-modal .app-modal-card{width:min(92vw,430px);background:#20252b;color:#f4f5f6;border:1px solid #3c4650;border-radius:24px;box-shadow:0 18px 55px rgba(0,0,0,.45);padding:26px 24px 20px;text-align:center}
      #app-info-modal .app-modal-icon{width:54px;height:54px;margin:0 auto 12px;border-radius:50%;display:grid;place-items:center;background:#2c343d;font-size:27px}
      #app-info-modal h2{margin:0 0 8px;font-size:21px;line-height:1.2}
      #app-info-modal p{margin:0;color:#b9c0c8;font-size:15px;line-height:1.5;white-space:pre-line}
      #app-info-modal .app-modal-actions{display:flex;justify-content:center;gap:10px;margin-top:20px}
      #app-info-modal button{border:0;border-radius:12px;min-height:44px;padding:0 22px;font-weight:800;font-size:14px;cursor:pointer}
      #app-info-modal .app-modal-ok{background:#ffc928;color:#171a1d}
      #app-info-modal .app-modal-cancel{background:#303840;color:#f4f5f6;border:1px solid #4a5560}
      .date-day.selected{outline:3px solid #2f6fed!important;outline-offset:1px;box-shadow:0 0 0 2px rgba(47,111,237,.18) inset!important;font-weight:900!important}
      .time-btn.selected{outline:2px solid #2f6fed;outline-offset:1px;font-weight:900}
    `;
    document.head.appendChild(s);
    const m=document.createElement('div');
    m.id='app-info-modal';
    m.innerHTML='<div class="app-modal-card" role="dialog" aria-modal="true" aria-labelledby="app-modal-title"><div class="app-modal-icon" id="app-modal-icon">ℹ️</div><h2 id="app-modal-title">Información</h2><p id="app-modal-message"></p><div class="app-modal-actions"><button type="button" class="app-modal-cancel" id="app-modal-cancel" hidden>CANCELAR</button><button type="button" class="app-modal-ok" id="app-modal-ok">ACEPTAR</button></div></div>';
    document.body.appendChild(m);
  }

  let resolver=null;
  function modal(message,{title='Información',icon='ℹ️',confirm=false,ok='ACEPTAR'}={}){
    injectModal();
    $('app-modal-title').textContent=title;
    $('app-modal-message').textContent=String(message||'');
    $('app-modal-icon').textContent=icon;
    $('app-modal-ok').textContent=ok;
    $('app-modal-cancel').hidden=!confirm;
    $('app-info-modal').classList.add('open');
    return new Promise(resolve=>{resolver=resolve});
  }
  function closeModal(value){
    if(!$('app-info-modal'))return;
    if(resolver){const r=resolver;resolver=null;r(value)}
    $('app-info-modal').classList.remove('open');
  }
  injectModal();
  $('app-modal-ok').onclick=()=>closeModal(true);
  $('app-modal-cancel').onclick=()=>closeModal(false);
  $('app-info-modal').addEventListener('click',e=>{if(e.target.id==='app-info-modal'&&$('app-modal-cancel').hidden)closeModal(true)});
  window.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('app-info-modal')?.classList.contains('open'))closeModal(false)});

  // Regla global del proyecto: no usar alert() nativo de Android/navegador.
  window.alert=message=>{modal(message,{title:'Taberna Camborio',icon:'ℹ️'});};

  function parseISO(v){const [y,m,d]=String(v||'').split('-').map(Number);return y&&m&&d?new Date(y,m-1,d):null}
  function isMonday(iso){const d=parseISO(iso);return d?d.getDay()===1:false}
  function clearMainTime(){if(window.state)window.state.time='';if($('selected-time'))$('selected-time').textContent='Selecciona una hora';$('time-trigger')?.classList.remove('has-time');if($('time-panel'))$('time-panel').hidden=true;document.querySelectorAll('#time-panel .time-btn').forEach(b=>b.classList.remove('selected'))}
  function clearEditTime(){if($('edit-selected-time'))$('edit-selected-time').textContent='Selecciona una hora';$('edit-time-trigger')?.classList.remove('has-time');if($('edit-time-panel'))$('edit-time-panel').hidden=true;document.querySelectorAll('#edit-time-panel .time-btn').forEach(b=>b.classList.remove('selected'))}

  async function fetchAvailability(date){
    const u=`${API}${API.includes('?')?'&':'?'}action=availability&date=${encodeURIComponent(date)}`;
    const r=await fetch(u,{cache:'no-store'});let d={};try{d=await r.json()}catch(_){ }
    if(!r.ok||d.ok===false)throw new Error(d.error||'No se ha podido consultar las horas disponibles.');
    return d.availability||{COMIDA:[],CENA:[]};
  }

  function renderTimes(target,values,onSelect){
    const box=$(target);if(!box)return;box.innerHTML='';
    values.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='time-btn';b.textContent=t;b.onclick=()=>onSelect(t,b);box.appendChild(b)})
  }
  function chooseTime(t,b,edit){
    if(edit){$('edit-selected-time').textContent=t;$('edit-time-trigger').classList.add('has-time');document.querySelectorAll('#edit-time-panel .time-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('edit-time-panel').hidden=true}
    else{window.state.time=t;$('selected-time').textContent=t;$('time-trigger').classList.add('has-time');document.querySelectorAll('#time-panel .time-btn').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');$('time-panel').hidden=true}
  }
  async function openTimes(edit=false){
    const field=$(edit?'edit-date':'date'),iso=field?.dataset.iso||'';
    if(!iso){await modal('Primero selecciona una fecha.',{title:'Falta la fecha',icon:'📅'});return}
    if(isMonday(iso)){await modal('Los lunes cerramos por descanso del personal. No se pueden realizar reservas ese día.',{title:'Día de descanso',icon:'🛌'});return}
    try{
      const a=await fetchAvailability(iso),l=Array.isArray(a.COMIDA)?a.COMIDA:[],d=Array.isArray(a.CENA)?a.CENA:[];
      renderTimes(edit?'edit-lunch-times':'lunch-times',l,(t,b)=>chooseTime(t,b,edit));
      renderTimes(edit?'edit-dinner-times':'dinner-times',d,(t,b)=>chooseTime(t,b,edit));
      const panel=$(edit?'edit-time-panel':'time-panel');
      if(!l.length&&!d.length){if(panel)panel.hidden=false;await modal('No quedan horas disponibles para ese día. Recuerda que la reserva debe hacerse con al menos una hora de antelación.',{title:'Sin disponibilidad',icon:'🕐'});return}
      if(panel)panel.hidden=false;
    }catch(e){await modal(e.message,{title:'No se pudo consultar',icon:'⚠️'})}
  }

  function installCalendarGuard(){
    const grid=$('date-grid');if(!grid)return;
    grid.addEventListener('click',e=>{
      const b=e.target.closest('.date-day');if(!b||b.disabled)return;
      const year=Number($('date-year')?.textContent),month=String($('date-month')?.textContent||'').toLowerCase();
      if(!year)return;
      const months=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
      const mi=months.indexOf(month);if(mi<0)return;
      const iso=`${year}-${String(mi+1).padStart(2,'0')}-${String(Number(b.textContent)).padStart(2,'0')}`;
      if(isMonday(iso)){
        e.preventDefault();e.stopImmediatePropagation();
        modal('Los lunes cerramos por descanso del personal. No se pueden realizar reservas ese día.',{title:'Día de descanso',icon:'🛌'});
        return;
      }
      setTimeout(()=>{clearMainTime();clearEditTime()},0);
    },true);
  }

  function install(){
    if(window.__camborioRulesInstalled)return;window.__camborioRulesInstalled=true;
    installCalendarGuard();
    if($('time-trigger'))$('time-trigger').onclick=e=>{e.preventDefault();openTimes(false)};
    if($('edit-time-trigger'))$('edit-time-trigger').onclick=e=>{e.preventDefault();openTimes(true)};
    $('reservation-form')?.addEventListener('submit',e=>{
      const iso=$('date')?.dataset.iso||'';
      if(isMonday(iso)){e.preventDefault();e.stopImmediatePropagation();modal('Los lunes cerramos por descanso del personal. No se pueden realizar reservas ese día.',{title:'Día de descanso',icon:'🛌'});return}
      if(!window.state?.time){e.preventDefault();e.stopImmediatePropagation();modal('Selecciona una hora disponible antes de continuar.',{title:'Falta la hora',icon:'🕐'});return}
    },true);
    $('edit-form')?.addEventListener('submit',e=>{
      const iso=$('edit-date')?.dataset.iso||'',t=$('edit-selected-time')?.textContent?.trim()||'';
      if(isMonday(iso)){e.preventDefault();e.stopImmediatePropagation();modal('Los lunes cerramos por descanso del personal. No se pueden realizar reservas ese día.',{title:'Día de descanso',icon:'🛌'});return}
      if(!/^\d{1,2}:\d{2}$/.test(t)){e.preventDefault();e.stopImmediatePropagation();modal('Selecciona una hora disponible antes de guardar los cambios.',{title:'Falta la hora',icon:'🕐'});}
    },true);
    ['found-cancel','cancel-reservation'].forEach(id=>{const b=$(id);if(!b)return;b.onclick=async()=>{
      const r=window.__publicReservation||window.__v4Reservation;if(!r)return;
      const ok=await modal('¿Quieres cancelar esta reserva? Esta acción no se puede deshacer desde la PWA.',{title:'Cancelar reserva',icon:'⚠️',confirm:true,ok:'CANCELAR RESERVA'});if(!ok)return;
      try{
        const res=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'cancel',telefono:r.Telefono,codigo:r.CodigoReserva})});
        const d=await res.json();if(!res.ok||d.ok===false)throw new Error(d.error||'No se ha podido cancelar la reserva.');
        window.__publicReservation=d.reservation;if(typeof showScreen==='function')showScreen('screen-thanks');
        await modal('La reserva se ha cancelado correctamente.',{title:'Reserva cancelada',icon:'✓'});
      }catch(e){await modal(e.message,{title:'No se pudo cancelar',icon:'⚠️'})}
    }});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
