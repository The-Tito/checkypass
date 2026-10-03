/**
 * Recomendaciones en español a partir de los patrones detectados y del resultado de HIBP.
 * Máximo tres, la más importante primero.
 */
import type { PwnedResult } from './pwned.ts';
import type { Score, StrengthResult, WeakPattern } from './types.ts';

export const MAX_TIPS = 3;
export const RECOMMENDED_LENGTH = 12;
/** A partir de este puntaje la contraseña ya es fuerte y no se critica su estructura. */
export const STRONG_SCORE = 8;

export type TipId =
  | 'pwned'
  | WeakPattern
  | 'single-word'
  | 'too-short'
  | 'use-passphrase'
  | 'no-reuse'
  | 'password-manager'
  | 'two-factor';

export interface Tip {
  readonly id: TipId;
  readonly text: string;
}

const PATTERN_TIPS: readonly (readonly [WeakPattern, string])[] = [
  [
    'common-password',
    'Es de las contraseñas más usadas: los atacantes la prueban en los primeros intentos.',
  ],
  [
    'l33t',
    'Cambiar letras por números o símbolos (a→@, o→0) no la protege: los programas lo prueban automáticamente.',
  ],
  ['name', 'Evita nombres y apellidos, sobre todo los tuyos o los de tu familia.'],
  [
    'local-word',
    'Evita equipos, ciudades y palabras populares en México: están en las listas de los atacantes.',
  ],
  ['date', 'Evita fechas y años: cumpleaños y aniversarios son lo primero que se prueba.'],
  ['keyboard', 'Evita patrones de teclado como «qwerty» o «1qaz2wsx».'],
  ['sequence', 'Evita secuencias como «abc», «1234» o «lunes martes».'],
  ['repeat', 'Evita repetir caracteres o bloques («aaa», «abcabc»).'],
  [
    'predictable-structure',
    'Mayúscula al inicio y números o símbolos al final es el patrón más predecible.',
  ],
];

const GOOD_PRACTICE: readonly Tip[] = [
  { id: 'no-reuse', text: 'Úsala solo en un sitio: si uno se filtra, los demás siguen a salvo.' },
  {
    id: 'password-manager',
    text: 'Un gestor de contraseñas te ayuda a tener una distinta y larga para cada cuenta.',
  },
  {
    id: 'two-factor',
    text: 'Activa la verificación en dos pasos: protege tu cuenta aunque alguien conozca la contraseña.',
  },
];

export function buildTips(
  strength: StrengthResult,
  score: Score,
  pwned: PwnedResult | null,
): Tip[] {
  const tips: Tip[] = [];

  if (pwned?.status === 'found') {
    tips.push({
      id: 'pwned',
      text:
        pwned.count === 1
          ? 'Ya está en manos de atacantes: cámbiala en todos los sitios donde la uses y no la vuelvas a usar.'
          : 'Está en las listas de los atacantes: cámbiala en todos los sitios donde la uses y no la vuelvas a usar.',
    });
  }

  if (score < STRONG_SCORE) {
    for (const [pattern, text] of PATTERN_TIPS) {
      if (strength.patterns.has(pattern)) tips.push({ id: pattern, text });
    }

    if (strength.singleWord && !strength.patterns.has('common-password')) {
      tips.push({
        id: 'single-word',
        text: 'Una sola palabra se adivina rápido. Combina varias palabras al azar.',
      });
    }

    if (strength.length < RECOMMENDED_LENGTH) {
      tips.push({
        id: 'too-short',
        text: `Hazla más larga: al menos ${RECOMMENDED_LENGTH} caracteres. La longitud pesa más que los símbolos.`,
      });
    }

    tips.push({
      id: 'use-passphrase',
      text: 'Prueba una frase de 4 o más palabras al azar, sin relación entre ellas y separadas por guiones o espacios.',
    });
  }

  for (const tip of GOOD_PRACTICE) tips.push(tip);

  return tips.slice(0, MAX_TIPS);
}
