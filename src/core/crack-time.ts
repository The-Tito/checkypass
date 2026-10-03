/** Formatea segundos como un tiempo legible en español ("3 horas", "más de un siglo"). */

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;
const CENTURY = 100 * YEAR;

const UNITS: readonly (readonly [number, string, string])[] = [
  [YEAR, 'año', 'años'],
  [MONTH, 'mes', 'meses'],
  [DAY, 'día', 'días'],
  [HOUR, 'hora', 'horas'],
  [MINUTE, 'minuto', 'minutos'],
  [1, 'segundo', 'segundos'],
];

export function formatCrackTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds >= CENTURY) return 'más de un siglo';
  if (seconds < 1) return 'menos de un segundo';

  for (const [size, singular, plural] of UNITS) {
    if (seconds >= size) {
      const value = Math.round(seconds / size);
      return value === 1 ? `1 ${singular}` : `${value} ${plural}`;
    }
  }
  return 'menos de un segundo';
}
