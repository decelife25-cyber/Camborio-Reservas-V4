(function(){'use strict';
function init(){
 const style=document.createElement('style');
 style.textContent=''.concat(
  '.confirm-card .step-badge{font-size:12px!important;padding:5px 12px!important;margin:0 auto 8px!important;background:#eaf8ef!important;color:#118642!important;border:1px solid #b9e2c7!important}',
  '.received-card .status small{font-size:15px!important;line-height:1.2!important;color:#5b4b20!important}',
  '.received-card .status b{display:block;font-size:15px!important;line-height:1.25!important;margin-top:4px!important;color:#3b3218!important;font-weight:800!important}',
  '.received-card p:not(.subtitle){color:#aeb7c1!important}'
 );document.head.appendChild(style);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
