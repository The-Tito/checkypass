import { describe, expect, it } from 'vitest';
import { rateScore } from '../../src/core/score.ts';
import type { Score } from '../../src/core/types.ts';
import type { PwnedView, ViewState } from '../../src/ui/state.ts';
import { summarize } from '../../src/ui/view.ts';

function result(score: Score, pwned: PwnedView): ViewState {
  return {
    kind: 'result',
    score,
    rating: rateScore(score),
    crackTime: '3 años',
    tips: [],
    pwned,
  };
}

describe('summarize', () => {
  it('no anuncia nada en estados intermedios', () => {
    expect(summarize({ kind: 'empty' })).toBe('');
    expect(summarize({ kind: 'loading' })).toBe('');
    expect(summarize(result(5, { status: 'checking' }))).toBe('');
  });

  it('anuncia el error del analizador', () => {
    expect(summarize({ kind: 'engine-error' })).toContain('No se pudo cargar el analizador');
  });

  it('resume un resultado limpio sin decir que es segura', () => {
    const text = summarize(result(7, { status: 'clean' }));
    expect(text).toBe('Puntaje 7 de 10, Fuerte. No aparece en filtraciones conocidas.');
    expect(text).not.toContain('segura');
  });

  it('formatea el conteo de filtraciones en es-MX', () => {
    expect(summarize(result(1, { status: 'found', count: 1234567 }))).toBe(
      'Puntaje 1 de 10, Muy débil. Apareció 1,234,567 veces en filtraciones de datos.',
    );
  });

  it('usa "una vez" cuando el conteo es 1', () => {
    expect(summarize(result(2, { status: 'found', count: 1 }))).toContain('Apareció una vez');
  });

  it('indica cuando no se pudo revisar filtraciones', () => {
    expect(summarize(result(6, { status: 'unavailable' }))).toContain(
      'No se pudo revisar filtraciones ahora',
    );
  });
});
