/**
 * Puntaje 1–10. La base sale de la fuerza estimada (guessesLog10 de zxcvbn) por tramos
 * explícitos; luego se limita si la contraseña aparece en filtraciones.
 *
 * Referencia de tiempos con hash lento sin conexión (10⁴ intentos/s): 10^g intentos
 * tardan 10^(g-4) segundos.
 */
import type { PwnedResult } from './pwned.ts';
import type { Score } from './types.ts';

/** [límite superior exclusivo de guessesLog10, puntaje]. ≥ último límite → 10. */
export const STRENGTH_TIERS: readonly (readonly [number, Score])[] = [
  [3, 1], // < 0,1 s: instantáneo
  [5, 2], // < 10 s
  [6.5, 3], // < 5 min
  [8, 4], // < 3 h
  [9.5, 5], // < 4 días
  [11, 6], // < 4 meses
  [12.5, 7], // < 10 años
  [14, 8], // < 300 años
  [16, 9], // < 30 000 años
];

/** Una sola aparición basta para que la contraseña esté en las listas de los atacantes. */
export const PWNED_MAX_SCORE: Score = 2;
export const PWNED_HEAVY_THRESHOLD = 100;

export function strengthScore(guessesLog10: number): Score {
  for (const [limit, score] of STRENGTH_TIERS) {
    if (guessesLog10 < limit) return score;
  }
  return 10;
}

/** Aplica el tope por filtración. Sin resultado de HIBP (pendiente o caído) no se limita. */
export function applyPwnedCap(score: Score, pwned: PwnedResult | null): Score {
  if (pwned?.status !== 'found') return score;
  if (pwned.count > PWNED_HEAVY_THRESHOLD) return 1;
  return Math.min(score, PWNED_MAX_SCORE) as Score;
}

export type ScoreLevel = 'very-weak' | 'weak' | 'fair' | 'strong' | 'excellent';

export interface ScoreRating {
  readonly level: ScoreLevel;
  readonly label: string;
}

export function rateScore(score: Score): ScoreRating {
  if (score <= 2) return { level: 'very-weak', label: 'Muy débil' };
  if (score <= 4) return { level: 'weak', label: 'Débil' };
  if (score <= 6) return { level: 'fair', label: 'Aceptable' };
  if (score <= 8) return { level: 'strong', label: 'Fuerte' };
  return { level: 'excellent', label: 'Excelente' };
}
