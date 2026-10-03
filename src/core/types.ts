/** Patrones débiles detectados en una contraseña, independientes de la librería de análisis. */
export type WeakPattern =
  | 'common-password'
  | 'l33t'
  | 'name'
  | 'word'
  | 'local-word'
  | 'date'
  | 'keyboard'
  | 'sequence'
  | 'repeat'
  | 'predictable-structure';

export interface StrengthResult {
  /** Orden de magnitud de los intentos necesarios para adivinarla. */
  readonly guessesLog10: number;
  /** Segundos estimados con hash lento sin conexión (10⁴ intentos/s). */
  readonly crackSeconds: number;
  readonly patterns: ReadonlySet<WeakPattern>;
  /** La contraseña es una sola palabra de diccionario. */
  readonly singleWord: boolean;
  /** Longitud en caracteres (puntos de código Unicode). */
  readonly length: number;
}

export type Score = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
