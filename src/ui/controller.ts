/**
 * Orquesta el análisis mientras el usuario escribe:
 * fuerza local tras una pausa corta y consulta a HIBP tras una pausa larga.
 * Cada tecla invalida el trabajo anterior (número de secuencia + AbortController),
 * así nunca se pinta un resultado de una contraseña que ya no está en el campo.
 */
import { formatCrackTime } from '../core/crack-time.ts';
import type { PwnedClient, PwnedResult } from '../core/pwned.ts';
import { applyPwnedCap, rateScore, strengthScore } from '../core/score.ts';
import type { StrengthAnalyzer } from '../core/strength.ts';
import { buildTips } from '../core/tips.ts';
import type { StrengthResult } from '../core/types.ts';
import type { PwnedView, ViewState } from './state.ts';

export const STRENGTH_DELAY_MS = 150;
export const PWNED_DELAY_MS = 600;

export interface ControllerDeps {
  readonly loadAnalyzer: () => Promise<StrengthAnalyzer>;
  readonly pwnedClient: PwnedClient;
  readonly render: (state: ViewState) => void;
  readonly strengthDelayMs?: number;
  readonly pwnedDelayMs?: number;
}

export interface Controller {
  /** Empieza a descargar el analizador (al enfocar el campo). */
  prepare(): void;
  /** Nuevo valor del campo. */
  update(password: string): void;
  /** Olvida todo el trabajo en curso y vuelve al estado vacío. */
  reset(): void;
}

export function createController(deps: ControllerDeps): Controller {
  const strengthDelay = deps.strengthDelayMs ?? STRENGTH_DELAY_MS;
  const pwnedDelay = deps.pwnedDelayMs ?? PWNED_DELAY_MS;

  let sequence = 0;
  let strengthTimer: ReturnType<typeof setTimeout> | undefined;
  let pwnedTimer: ReturnType<typeof setTimeout> | undefined;
  let pwnedAbort: AbortController | undefined;
  // Resultados de la secuencia actual.
  let strength: StrengthResult | undefined;
  let pwned: PwnedResult | undefined;

  function cancelPending(): void {
    sequence += 1;
    clearTimeout(strengthTimer);
    clearTimeout(pwnedTimer);
    pwnedAbort?.abort();
    pwnedAbort = undefined;
    strength = undefined;
    pwned = undefined;
  }

  function renderResult(): void {
    if (!strength) return;
    const score = applyPwnedCap(strengthScore(strength.guessesLog10), pwned ?? null);
    deps.render({
      kind: 'result',
      score,
      rating: rateScore(score),
      // Las contraseñas filtradas están en las listas que los atacantes prueban primero.
      crackTime: pwned?.status === 'found' ? 'al instante' : formatCrackTime(strength.crackSeconds),
      tips: buildTips(strength, score, pwned ?? null),
      pwned: toPwnedView(pwned),
    });
  }

  async function runStrength(password: string, seq: number): Promise<void> {
    let analyze: StrengthAnalyzer;
    try {
      const loading = deps.loadAnalyzer();
      // Solo se muestra "cargando" si de verdad hay que esperar.
      const ready = await Promise.race([loading, Promise.resolve(undefined)]);
      if (!ready && seq === sequence) deps.render({ kind: 'loading' });
      analyze = await loading;
    } catch {
      if (seq === sequence) deps.render({ kind: 'engine-error' });
      return;
    }
    if (seq !== sequence) return;
    strength = analyze(password);
    renderResult();
  }

  async function runPwned(password: string, seq: number): Promise<void> {
    const abort = new AbortController();
    pwnedAbort = abort;
    let result: PwnedResult;
    try {
      result = await deps.pwnedClient.check(password, abort.signal);
    } catch {
      return; // Cancelada por una tecla posterior.
    }
    if (seq !== sequence) return;
    pwned = result;
    renderResult();
  }

  return {
    prepare() {
      deps.loadAnalyzer().catch(() => {
        // El error se mostrará cuando el usuario escriba.
      });
    },

    update(password) {
      cancelPending();
      if (password === '') {
        deps.render({ kind: 'empty' });
        return;
      }
      const seq = sequence;
      strengthTimer = setTimeout(() => void runStrength(password, seq), strengthDelay);
      pwnedTimer = setTimeout(() => void runPwned(password, seq), pwnedDelay);
    },

    reset() {
      cancelPending();
      deps.render({ kind: 'empty' });
    },
  };
}

function toPwnedView(result: PwnedResult | undefined): PwnedView {
  if (!result) return { status: 'checking' };
  if (result.status === 'found') return { status: 'found', count: result.count };
  return { status: result.status };
}
