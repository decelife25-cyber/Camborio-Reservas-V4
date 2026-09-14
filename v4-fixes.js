(function(){'use strict';
const $=id=>document.getElementById(id);
function addStyles(){const s=document.createElement('style');s.textContent=''+
'.confirm-card .subtitle{font-size:18px!important;line-height:1.35!important;margin-bottom:14px!important;color:#aeb7c1!important}'+
'.confirm-highlight{color:#18202b!important}'+
'.confirm-highlight strong{font-size:20px!important;line-height:1.2!important;color:#18202b!important}'+
'.confirm-highlight small{font-size:16px!important;line-height:1.25!important;color:#4d5a66!important}'+
'.received-card .status{color:#3b3218!important}'+
'.received-card .status small{font-size:17px!important;line-height:1.2!important;color:#5b4b20!important}'+
'.received-card .status b{display:block;font-size:22px!important;line-height:1.25!important;margin-top:6px;color:#3b3218!important}'+
'.thanks-card{text-align:center}'+
'.thanks-card h1{font-size:25px!important}'+
'.thanks-card p{font-size:16px!important;line-height:1.4}'+
'.thanks-card .info{margin-top:12px}'+
'.thanks-card .secondary{margin-top:8px}'+
'.deployment-version{position:fixed;right:8px;bottom:6px;z-index:9999;font:10px/1 Arial,sans-serif;color:#6b7280;opacity:.8;pointer-events:none}';document.head.appendChild(s)}
function version(){if(!$('deployment-version')){const v=document.createElement('div');v.id='deployment-version';v.className='deployment-version';v.textContent='Camborio Reservas V4 · V4.0.0.19';document.body.appendChild(v)}}
function finish(){if($('finish-button'))$('finish-button').onclick=function(){if($('screen-thanks')){const card=$('screen-thanks .thanks-card');if(card&&!$('thanks-menu')){const menu=document.createElement('button');menu.id='thanks-menu';menu.type='button';menu.className='info';menu.textContent='VER CARTA DIGITAL';menu.onclick=function(){window.location.href='https://decelife.com/reserva-tamborio/'};card.appendChild(menu)}showScreen('screen-thanks')}}}
function init(){addStyles();version();finish()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();