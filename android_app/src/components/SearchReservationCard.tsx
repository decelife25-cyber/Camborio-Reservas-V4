import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getTurnoFromHora } from '../utils/shifts';
import FechaPicker from './FechaPicker';
import { Wheel } from '../pages/NuevaReserva';
import StateChangeModal from './StateChangeModal';

export type SearchReservation = {
  ReservaID:string; CodigoReserva:string|null; FechaReserva:string; HoraReserva:string;
  Nombre:string|null; Telefono:string|null; Personas:number|null; Estado:string;
  Mesa:string|null; MesasAdicionales?:string|null; Turno?:string|null;
  Observaciones?:string|null; FechaCreacion?:string|null;
};


function dateParts(v:string){
  const [y,m,d]=String(v||'').split('-').map(Number);
  if(!y||!m||!d)return{fecha:'--/--',anio:'',dia:'--'};
  const dt=new Date(y,m-1,d);
  const dias=['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  return{fecha:String(d).padStart(2,'0')+'/'+String(m).padStart(2,'0'),anio:String(y),dia:dias[dt.getDay()]};
}
function stateLabel(s:string){return s.replaceAll('_',' ');}
function todayMadrid(){
  return new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Madrid'});
}
