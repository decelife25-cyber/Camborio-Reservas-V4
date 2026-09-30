import { getTurnoFromHora } from './shifts';

export type ReservationStateAction = [string, string, string];

function todayMadrid() {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function nowMadridTime() {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Madrid',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}

export function getReservationStateActions({
  estado,
  fecha,
  hora,
  turno,
  esSinReserva = false,
}: {
  estado: string;
  fecha: string;
  hora: string;
  turno?: string | null;
  esSinReserva?: boolean;
}): ReservationStateAction[] {
  if (esSinReserva) return [['FINALIZADA', 'FINALIZAR', 'finalizada']];

  const hoyMadrid = todayMadrid();
  const horaMadrid = nowMadridTime();
  const horaReserva = String(hora || '').slice(0, 5);
  const esFechaPasada = fecha < hoyMadrid;
  const esFechaFutura = fecha > hoyMadrid;
  const esHoraPasadaHoy = fecha === hoyMadrid && horaReserva < horaMadrid;
  const turnoActual = getTurnoFromHora(horaMadrid);
  const turnoReserva = String(turno || '').trim().toUpperCase() || getTurnoFromHora(horaReserva);
  const esTurnoActual = turnoReserva === turnoActual;
  const esContextoFuturoOIncorrecto =
    esFechaFutura || (fecha === hoyMadrid && !esTurnoActual);

  if (estado === 'PENDIENTE') {
    if (esContextoFuturoOIncorrecto) {
      return [
        ['CONFIRMADA', 'CONFIRMAR', 'confirmar'],
        ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'],
      ];
    }
    if (esFechaPasada) {
      return [
        ['FINALIZADA', 'FINALIZAR', 'finalizada'],
        ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado'],
      ];
    }
    const acciones: ReservationStateAction[] = [
      ['CONFIRMADA', 'CONFIRMAR', 'confirmar'],
      ['SENTADA', 'SENTAR', 'sentar'],
      ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'],
    ];
    if (esHoraPasadaHoy) {
      acciones.push(['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']);
    }
    return acciones;
  }

  if (estado === 'CONFIRMADA') {
    if (esContextoFuturoOIncorrecto) {
      return [['CANCELADA_LOCAL', 'CANCELAR', 'cancelar']];
    }
    if (esFechaPasada) {
      return [
        ['FINALIZADA', 'FINALIZAR', 'finalizada'],
        ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado'],
      ];
    }
    const acciones: ReservationStateAction[] = [
      ['SENTADA', 'SENTAR', 'sentar'],
      ['CANCELADA_LOCAL', 'CANCELAR', 'cancelar'],
    ];
    if (esHoraPasadaHoy) {
      acciones.push(['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado']);
    }
    return acciones;
  }

  if (estado === 'SENTADA') {
    if (esContextoFuturoOIncorrecto) {
      return [['CANCELADA_LOCAL', 'CANCELAR', 'cancelar']];
    }
    return esFechaPasada
      ? [
          ['FINALIZADA', 'FINALIZAR', 'finalizada'],
          ['NO_PRESENTADO', 'NO ASISTIÓ', 'no-presentado'],
        ]
      : [['FINALIZADA', 'FINALIZAR', 'finalizada']];
  }

  return [];
}
