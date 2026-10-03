/** Estado que la vista sabe pintar. No contiene la contraseña. */
import type { ScoreRating } from '../core/score.ts';
import type { Tip } from '../core/tips.ts';
import type { Score } from '../core/types.ts';

export type PwnedView =
  | { readonly status: 'checking' }
  | { readonly status: 'found'; readonly count: number }
  | { readonly status: 'clean' }
  | { readonly status: 'unavailable' };

export type ViewState =
  | { readonly kind: 'empty' }
  /** zxcvbn todavía se está descargando. */
  | { readonly kind: 'loading' }
  /** No se pudo cargar el analizador (p. ej. sin conexión al abrir la página). */
  | { readonly kind: 'engine-error' }
  | {
      readonly kind: 'result';
      readonly score: Score;
      readonly rating: ScoreRating;
      readonly crackTime: string;
      readonly tips: readonly Tip[];
      readonly pwned: PwnedView;
    };
