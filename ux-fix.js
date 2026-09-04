(function(){
'use strict';
const $=id=>document.getElementById(id);
const LOGO_URL='https://caeszgtogifserrxdrcw.supabase.co/storage/v1/object/public/camborio-assets/logocamborio_trans.png?v=20260902';
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
function madridMinutes(){const p=new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Madrid',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date());let h=0,m=0;p.forEach(x=>{if(x.type==='hour')h=+x.value;if(x.type==='minute')m=+x.value});return h*60+m}
function filterHours(){
 const f=$('date');
 if(!f||!f.dataset.iso)return;
 const date=f.dataset.iso, now=date===today()?madridMinutes():-1;
 ['lunch-times','dinner-times'].forEach(id=>{
  const box=$(id);if(!box)return;
  box.querySelectorAll('.time-btn').forEach(b=>{
   const parts=String(b.textContent||'').trim().split(':');
   const mins=parts.length===2?(+parts[0]*60+ +parts[1]):-1;
   b.hidden=now>=0&&mins>=0&&mins<=now;
  });
 });
}
function compact(){
 const s=document.createElement('style');
 s.textContent=`
 .date-modal[hidden]{display:none!important}
 .date-modal{position:static!important;inset:auto!important;background:transparent!important;padding:0!important;width:100%!important;display:block!important}
 .date-modal-card{position:relative!important;width:100%!important;max-width:100%!important;margin:8px 0 10px!important;padding:8px 10px!important;border-radius:10px!important;box-shadow:none!important}
 .date-modal-head{margin-bottom:5px!important}.date-modal-head button{width:34px!important;height:34px!important}
 .weekdays,.date-grid{gap:2px!important}.date-day,.date-empty{width:32px!important;height:32px!important;font-size:13px!important}
 .date-modal-actions{margin-top:5px!important}.date-modal-actions button{min-height:34px!important;font-size:13px!important}
 .brand-mark{background-image:none!important;background-color:transparent!important;object-fit:contain!important}
 `;
 document.head.appendChild(s);
}
function fixLogo(){const mark=document.querySelector('.brand-mark');if(!mark)return;mark.src=LOGO_URL;mark.removeAttribute('srcset');mark.style.backgroundImage='none';mark.style.backgroundColor='transparent';mark.style.objectFit='contain';mark.loading='eager';mark.decoding='async'}
function wire(){
 compact();fixLogo();
 // Do not replace the application's date handler with focus-only behaviour.
 // The field is readonly, so focusing it cannot open the calendar.
 const date=$('date');
 if(date) date.onclick=()=>{if(typeof window.openDateModal==='function')window.openDateModal('date');else date.dispatchEvent(new MouseEvent('click',{bubbles:false}))};
 const editDate=$('edit-date');
 if(editDate) editDate.onclick=()=>{if(typeof window.openDateModal==='function')window.openDateModal('edit-date')};
 const tb=$('time-trigger');
 if(tb) tb.onclick=()=>{
  const f=$('date');
  if(!f||!f.dataset.iso){if(typeof window.openDateModal==='function')window.openDateModal('date');return}
  filterHours();
  const panel=$('time-panel');
  if(panel) panel.hidden=!panel.hidden;
 };
 const editTb=$('edit-time-trigger');
 if(editTb) editTb.onclick=()=>{
  const f=$('edit-date');
  if(!f||!f.dataset.iso){if(typeof window.openDateModal==='function')window.openDateModal('edit-date');return}
  const panel=$('edit-time-panel');if(panel)panel.hidden=!panel.hidden;
 };
 filterHours();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wire);else wire();
})();