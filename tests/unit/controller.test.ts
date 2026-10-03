import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PwnedClient, PwnedResult } from '../../src/core/pwned.ts';
import type { StrengthAnalyzer } from '../../src/core/strength.ts';
import type { StrengthResult } from '../../src/core/types.ts';
import { createController, PWNED_DELAY_MS, STRENGTH_DELAY_MS } from '../../src/ui/controller.ts';
import type { ViewState } from '../../src/ui/state.ts';

function strengthOf(guessesLog10: number): StrengthResult {
  return {
    guessesLog10,
    crackSeconds: 10 ** (guessesLog10 - 4),
    patterns: new Set(),
    singleWord: false,
    length: 20,
  };
}

// Analizador falso: la "fuerza" depende de la longitud para distinguir contraseñas.
const analyze: StrengthAnalyzer = (password) => strengthOf(password.length);

function setup(
  options: { pwned?: (password: string, signal?: AbortSignal) => Promise<PwnedResult> } = {},
) {
  const states: ViewState[] = [];
  const check = vi.fn<PwnedClient['check']>(
    options.pwned ?? (async () => ({ status: 'clean' }) as const),
  );
  const loadAnalyzer = vi.fn(async () => analyze);
  const controller = createController({
    loadAnalyzer,
    pwnedClient: { check },
    render: (state) => states.push(state),
  });
  return { controller, states, check, loadAnalyzer, last: () => states.at(-1) };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('createController', () => {
  it('campo vacío → estado vacío, sin análisis ni red', async () => {
    const { controller, check, last } = setup();
    controller.update('');
    await vi.runAllTimersAsync();
    expect(last()).toEqual({ kind: 'empty' });
    expect(check).not.toHaveBeenCalled();
  });

  it('muestra el puntaje local antes de consultar HIBP', async () => {
    const { controller, check, last } = setup();
    controller.update('abcdefghijklm'); // 13 → puntaje 8

    await vi.advanceTimersByTimeAsync(STRENGTH_DELAY_MS);
    expect(last()).toMatchObject({ kind: 'result', score: 8, pwned: { status: 'checking' } });
    expect(check).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(PWNED_DELAY_MS - STRENGTH_DELAY_MS);
    expect(check).toHaveBeenCalledTimes(1);
    expect(last()).toMatchObject({ kind: 'result', score: 8, pwned: { status: 'clean' } });
  });

  it('aplica el tope y el tiempo "al instante" si está filtrada', async () => {
    const { controller, last } = setup({
      pwned: async () => ({ status: 'found', count: 500 }),
    });
    controller.update('abcdefghijklm');
    await vi.runAllTimersAsync();
    expect(last()).toMatchObject({
      kind: 'result',
      score: 1,
      crackTime: 'al instante',
      pwned: { status: 'found', count: 500 },
    });
    if (last()?.kind === 'result') {
      expect((last() as Extract<ViewState, { kind: 'result' }>).tips[0]?.id).toBe('pwned');
    }
  });

  it('si HIBP falla mantiene el puntaje local', async () => {
    const { controller, last } = setup({
      pwned: async () => ({ status: 'unavailable', reason: 'network' }),
    });
    controller.update('abcdefghijklm');
    await vi.runAllTimersAsync();
    expect(last()).toMatchObject({ kind: 'result', score: 8, pwned: { status: 'unavailable' } });
  });

  it('teclear rápido solo consulta HIBP una vez, con el último valor', async () => {
    const { controller, check } = setup();
    for (const value of ['a', 'ab', 'abc', 'abcd']) {
      controller.update(value);
      await vi.advanceTimersByTimeAsync(100);
    }
    await vi.runAllTimersAsync();
    expect(check).toHaveBeenCalledTimes(1);
    expect(check.mock.calls[0]?.[0]).toBe('abcd');
  });

  it('cancela la consulta en vuelo e ignora su resultado si el usuario sigue escribiendo', async () => {
    let firstSignal: AbortSignal | undefined;
    const { controller, states, last } = setup({
      pwned: (password, signal) => {
        if (password === 'primera-clave') {
          firstSignal = signal;
          return new Promise((resolve) => {
            setTimeout(() => resolve({ status: 'found', count: 9 }), 5000);
          });
        }
        return Promise.resolve({ status: 'clean' });
      },
    });

    controller.update('primera-clave');
    await vi.advanceTimersByTimeAsync(PWNED_DELAY_MS + 10);
    controller.update('segunda-clave-mas-larga');
    expect(firstSignal?.aborted).toBe(true);

    await vi.runAllTimersAsync();
    expect(last()).toMatchObject({ kind: 'result', pwned: { status: 'clean' } });
    expect(states.some((s) => s.kind === 'result' && s.pwned.status === 'found')).toBe(false);
  });

  it('reset descarta el trabajo pendiente', async () => {
    const { controller, check, last } = setup();
    controller.update('abcdefgh');
    controller.reset();
    await vi.runAllTimersAsync();
    expect(last()).toEqual({ kind: 'empty' });
    expect(check).not.toHaveBeenCalled();
  });

  it('muestra "cargando" mientras se descarga el analizador', async () => {
    let release: (value: StrengthAnalyzer) => void = () => {};
    const states: ViewState[] = [];
    const controller = createController({
      loadAnalyzer: () => new Promise((resolve) => (release = resolve)),
      pwnedClient: { check: async () => ({ status: 'clean' }) },
      render: (state) => states.push(state),
    });
    controller.update('abcdefgh');
    await vi.advanceTimersByTimeAsync(STRENGTH_DELAY_MS);
    expect(states.at(-1)).toEqual({ kind: 'loading' });
    release(analyze);
    await vi.runAllTimersAsync();
    expect(states.at(-1)).toMatchObject({ kind: 'result', pwned: { status: 'clean' } });
  });

  it('informa si el analizador no se pudo cargar', async () => {
    const states: ViewState[] = [];
    const controller = createController({
      loadAnalyzer: () => Promise.reject(new Error('sin red')),
      pwnedClient: { check: async () => ({ status: 'clean' }) },
      render: (state) => states.push(state),
    });
    controller.update('abcdefgh');
    await vi.runAllTimersAsync();
    expect(states.at(-1)).toEqual({ kind: 'engine-error' });
  });

  it('el estado pintado nunca contiene la contraseña', async () => {
    const { controller, states } = setup({
      pwned: async () => ({ status: 'found', count: 2 }),
    });
    controller.update('MiClaveSecreta-123');
    await vi.runAllTimersAsync();
    expect(JSON.stringify(states)).not.toContain('MiClaveSecreta');
  });
});
