/**
 * Análisis de fuerza con zxcvbn-ts. La librería y sus diccionarios (~1 MB) se cargan
 * de forma diferida la primera vez que se pide el analizador.
 */
import type { ZxcvbnResult } from '@zxcvbn-ts/core';
import type { StrengthResult, WeakPattern } from './types.ts';

export const MAX_PASSWORD_LENGTH = 256;

export type StrengthAnalyzer = (password: string) => StrengthResult;

let analyzerPromise: Promise<StrengthAnalyzer> | undefined;

/** Carga zxcvbn-ts una sola vez. Si falla, el siguiente intento vuelve a cargar. */
export function loadStrengthAnalyzer(): Promise<StrengthAnalyzer> {
  analyzerPromise ??= createAnalyzer().catch((error: unknown) => {
    analyzerPromise = undefined;
    throw error;
  });
  return analyzerPromise;
}

async function createAnalyzer(): Promise<StrengthAnalyzer> {
  const [{ ZxcvbnFactory }, common, es, mx] = await Promise.all([
    import('@zxcvbn-ts/core'),
    import('@zxcvbn-ts/language-common'),
    import('@zxcvbn-ts/language-es-es'),
    import('./dict-mx.ts'),
  ]);

  const zxcvbn = new ZxcvbnFactory({
    dictionary: {
      ...common.dictionary,
      ...es.dictionary,
      [mx.MX_DICTIONARY_NAME]: [...mx.MX_WORDS],
    },
    graphs: common.adjacencyGraphs,
    translations: es.translations,
    maxLength: MAX_PASSWORD_LENGTH,
  });

  return (password) => toStrengthResult(zxcvbn.check(password), password);
}

const PREDICTABLE_STRUCTURE = /^[A-ZÑ][a-zñáéíóú]+[\d\W_]+$/u;

/** Traduce el resultado de zxcvbn a nuestro modelo, desacoplado de la librería. */
export function toStrengthResult(
  result: Pick<ZxcvbnResult, 'guessesLog10' | 'crackTimes' | 'sequence'>,
  password: string,
): StrengthResult {
  const patterns = new Set<WeakPattern>();

  for (const match of result.sequence) {
    switch (match.pattern) {
      case 'dictionary': {
        const name = String(match.dictionaryName ?? '');
        if (match.l33t) patterns.add('l33t');
        if (name.startsWith('passwords')) patterns.add('common-password');
        else if (name.startsWith('firstnames') || name.startsWith('lastnames')) {
          patterns.add('name');
        } else if (name === 'mx-common') patterns.add('local-word');
        else patterns.add('word');
        break;
      }
      case 'date':
        patterns.add('date');
        break;
      case 'regex':
        if (match.regexName === 'recentYear') patterns.add('date');
        break;
      case 'spatial':
        patterns.add('keyboard');
        break;
      case 'sequence':
      case 'wordSequence':
        patterns.add('sequence');
        break;
      case 'repeat':
        patterns.add('repeat');
        break;
    }
  }

  if (PREDICTABLE_STRUCTURE.test(password)) patterns.add('predictable-structure');

  const only = result.sequence.length === 1 ? result.sequence[0] : undefined;

  return {
    guessesLog10: result.guessesLog10,
    crackSeconds: result.crackTimes.offlineSlowHashingXPerSecond.seconds,
    patterns,
    singleWord: only?.pattern === 'dictionary',
    length: [...password].length,
  };
}
