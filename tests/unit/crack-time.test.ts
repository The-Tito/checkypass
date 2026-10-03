import { describe, expect, it } from 'vitest';
import { formatCrackTime } from '../../src/core/crack-time.ts';

describe('formatCrackTime', () => {
  it.each([
    [0, 'menos de un segundo'],
    [0.5, 'menos de un segundo'],
    [1, '1 segundo'],
    [36, '36 segundos'],
    [60, '1 minuto'],
    [17 * 60, '17 minutos'],
    [3 * 3600, '3 horas'],
    [86400, '1 día'],
    [12 * 86400, '12 días'],
    [45 * 86400, '2 meses'],
    [3 * 365 * 86400, '3 años'],
    [100 * 365 * 86400, 'más de un siglo'],
    [Number.POSITIVE_INFINITY, 'más de un siglo'],
  ])('%d s → %s', (seconds, expected) => {
    expect(formatCrackTime(seconds)).toBe(expected);
  });
});
