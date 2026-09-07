export const CUTOFF_HOUR = 18; // 18:00

export function getTurnoFromHora(hora: string): 'COMIDA' | 'CENA' {
  if (!hora) return 'COMIDA'; // Default
  const hourPart = parseInt(hora.split(':')[0], 10);
  if (isNaN(hourPart)) return 'COMIDA';

  if (hourPart < CUTOFF_HOUR) {
    return 'COMIDA';
  } else {
    return 'CENA';
  }
}
