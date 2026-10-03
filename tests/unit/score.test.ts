import { describe, expect, it } from 'vitest';
import { applyPwnedCap, rateScore, STRENGTH_TIERS, strengthScore } from '../../src/core/score.ts';
import type { Score } from '../../src/core/types.ts';

describe('strengthScore', () => {
  it.each([
    [0, 1],
    [2.99, 1],
    [3, 2],
    [6.49, 3],
    [8, 5],
    [10, 6],
    [12.5, 8],
    [15.9, 9],
    [16, 10],
    [40, 10],
  ])('guessesLog10 %d → %d', (log10, expected) => {
    expect(strengthScore(log10)).toBe(expected);
  });

  it('los tramos son crecientes y cubren del 1 al 9', () => {
    const limits = STRENGTH_TIERS.map(([limit]) => limit);
    expect(limits).toEqual([...limits].sort((a, b) => a - b));
    expect(STRENGTH_TIERS.map(([, score]) => score)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  });
});

describe('applyPwnedCap', () => {
  it('no cambia el puntaje si está limpia, pendiente o HIBP no respondió', () => {
    expect(applyPwnedCap(9, { status: 'clean' })).toBe(9);
    expect(applyPwnedCap(9, null)).toBe(9);
    expect(applyPwnedCap(9, { status: 'unavailable', reason: 'network' })).toBe(9);
  });

  it('limita a 2 si aparece en filtraciones', () => {
    expect(applyPwnedCap(10, { status: 'found', count: 1 })).toBe(2);
    expect(applyPwnedCap(10, { status: 'found', count: 100 })).toBe(2);
    expect(applyPwnedCap(1, { status: 'found', count: 3 })).toBe(1);
  });

  it('baja a 1 con más de 100 apariciones', () => {
    expect(applyPwnedCap(10, { status: 'found', count: 101 })).toBe(1);
  });
});

describe('rateScore', () => {
  it('asigna una etiqueta a cada puntaje', () => {
    const labels = ([1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as Score[]).map((s) => rateScore(s).level);
    expect(labels).toEqual([
      'very-weak',
      'very-weak',
      'weak',
      'weak',
      'fair',
      'fair',
      'strong',
      'strong',
      'excellent',
      'excellent',
    ]);
  });
});
