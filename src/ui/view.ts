/** Pinta un ViewState en el DOM ya presente en index.html. */
import { STRONG_SCORE } from '../core/tips.ts';
import { byId, setText } from './dom.ts';
import type { PwnedView, ViewState } from './state.ts';

const numberFormat = new Intl.NumberFormat('es-MX');

export const MESSAGES = {
  empty: 'Escribe una contraseña para analizarla',
  loading: 'Preparando el analizador…',
  engineError: 'No se pudo cargar el analizador. Revisa tu conexión y vuelve a intentarlo.',
  checking: 'Revisando filtraciones…',
  clean: 'No aparece en filtraciones conocidas.',
  unavailable: 'No se pudo revisar filtraciones ahora. El puntaje solo considera su estructura.',
} as const;

export function pwnedMessage(pwned: PwnedView): string {
  switch (pwned.status) {
    case 'checking':
      return MESSAGES.checking;
    case 'clean':
      return MESSAGES.clean;
    case 'unavailable':
      return MESSAGES.unavailable;
    case 'found': {
      const times = pwned.count === 1 ? 'una vez' : `${numberFormat.format(pwned.count)} veces`;
      return `Apareció ${times} en filtraciones de datos.`;
    }
  }
}

export function crackTimeMessage(crackTime: string): string {
  return crackTime === 'al instante' ? 'Se descifra: al instante' : `Se descifra en: ${crackTime}`;
}

/**
 * Resumen corto para la región aria-live. Cadena vacía = nada que anunciar
 * (estados intermedios, para no hablar en cada tecla).
 */
export function summarize(state: ViewState): string {
  switch (state.kind) {
    case 'empty':
    case 'loading':
      return '';
    case 'engine-error':
      return MESSAGES.engineError;
    case 'result':
      if (state.pwned.status === 'checking') return '';
      return `Puntaje ${state.score} de 10, ${state.rating.label}. ${pwnedMessage(state.pwned)}`;
  }
}

export interface View {
  render(state: ViewState): void;
}

export function createView(root: Document): View {
  const message = byId(root, 'status-message', HTMLParagraphElement);
  const result = byId(root, 'result', HTMLElement);
  const scoreValue = byId(root, 'score-value', HTMLElement);
  const scoreLabel = byId(root, 'score-label', HTMLElement);
  const crackTime = byId(root, 'crack-time', HTMLElement);
  const pwnedEl = byId(root, 'pwned-status', HTMLElement);
  const tipsBlock = byId(root, 'tips-block', HTMLElement);
  const tipsTitle = byId(root, 'tips-title', HTMLElement);
  const tipsList = byId(root, 'tips', HTMLOListElement);
  const announcer = byId(root, 'announcer', HTMLElement);
  const segments = Array.from(result.querySelectorAll<HTMLElement>('.meter > span'));

  let lastSummary = '';

  function showMessage(text: string, state: string): void {
    setText(message, text);
    message.dataset.state = state;
    message.hidden = false;
    result.hidden = true;
    result.dataset.state = state;
  }

  function announce(state: ViewState): void {
    const summary = summarize(state);
    if (summary === '') {
      lastSummary = '';
      return;
    }
    if (summary !== lastSummary) {
      lastSummary = summary;
      announcer.textContent = summary;
    }
  }

  return {
    render(state) {
      switch (state.kind) {
        case 'empty':
          showMessage(MESSAGES.empty, 'empty');
          break;
        case 'loading':
          showMessage(MESSAGES.loading, 'loading');
          break;
        case 'engine-error':
          showMessage(MESSAGES.engineError, 'engine-error');
          break;
        case 'result': {
          message.hidden = true;
          result.hidden = false;
          result.dataset.state = 'result';
          result.dataset.level = state.rating.level;
          result.dataset.score = String(state.score);
          setText(scoreValue, String(state.score));
          setText(scoreLabel, state.rating.label);
          setText(crackTime, crackTimeMessage(state.crackTime));
          pwnedEl.dataset.status = state.pwned.status;
          setText(pwnedEl, pwnedMessage(state.pwned));
          segments.forEach((segment, i) => {
            segment.dataset.on = i < state.score ? 'true' : 'false';
          });
          tipsBlock.hidden = state.tips.length === 0;
          setText(tipsTitle, state.score >= STRONG_SCORE ? 'Buenas prácticas' : 'Cómo mejorarla');
          tipsList.replaceChildren(
            ...state.tips.map((tip) => {
              const li = root.createElement('li');
              li.textContent = tip.text;
              return li;
            }),
          );
          break;
        }
      }
      announce(state);
    },
  };
}
