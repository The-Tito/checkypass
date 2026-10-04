/** Pinta un ViewState en el DOM ya presente en index.html. */
import { STRONG_SCORE } from '../core/tips.ts';
import { byId, setText } from './dom.ts';
import type { PwnedView, ViewState } from './state.ts';

const numberFormat = new Intl.NumberFormat('es-MX');

export const MESSAGES = {
  empty: 'Esperando… nada sale de aquí sin que lo veas.',
  loading: 'Preparando el analizador…',
  engineError: 'No se pudo cargar el analizador. Revisa tu conexión y vuelve a intentarlo.',
  checking: 'Revisando filtraciones…',
  clean: 'No aparece en filtraciones conocidas.',
  unavailable: 'No se pudo revisar filtraciones ahora.',
} as const;

const DETAILS = {
  checking: 'Solo 5 de los 40 caracteres de su huella salen de tu dispositivo.',
  found: 'Está en las listas que los atacantes prueban primero.',
  clean: 'Eso no la vuelve invulnerable: úsala en un solo sitio.',
  unavailable: 'El puntaje solo considera su estructura. Escribe de nuevo para reintentar.',
} as const;

export function pwnedDetail(pwned: PwnedView): string {
  return DETAILS[pwned.status];
}

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

/** Texto de `#crack-time`: prefijo y valor (el valor se resalta en la interfaz). */
export function crackTimeParts(crackTime: string): { prefix: string; value: string } {
  return crackTime === 'al instante'
    ? { prefix: 'Se descifra ', value: 'al instante' }
    : { prefix: 'Se descifra en ', value: crackTime };
}

const COUNT_MS = 400;

function pad(score: number): string {
  return String(score).padStart(2, '0');
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
  const statusWrap = byId(root, 'status-wrap', HTMLElement);
  const message = byId(root, 'status-message', HTMLParagraphElement);
  const result = byId(root, 'result', HTMLElement);
  const scoreValue = byId(root, 'score-value', HTMLElement);
  const scoreLabel = byId(root, 'score-label', HTMLElement);
  const crackTime = byId(root, 'crack-time', HTMLElement);
  const pwnedBlock = byId(root, 'pwned-block', HTMLElement);
  const pwnedEl = byId(root, 'pwned-status', HTMLElement);
  const pwnedDetailEl = byId(root, 'pwned-detail', HTMLElement);
  const tipsBlock = byId(root, 'tips-block', HTMLElement);
  const tipsTitle = byId(root, 'tips-title', HTMLElement);
  const tipsList = byId(root, 'tips', HTMLUListElement);
  const announcer = byId(root, 'announcer', HTMLElement);
  const view = root.defaultView;

  let lastSummary = '';
  let shownScore = 0;
  let frame = 0;

  function cancelCount(): void {
    if (frame !== 0) view?.cancelAnimationFrame(frame);
    frame = 0;
  }

  /** Cuenta desde el valor mostrado hasta `target`; el valor final siempre queda exacto. */
  function showScore(target: number): void {
    cancelCount();
    const reduced = view?.matchMedia('(prefers-reduced-motion: reduce)').matches ?? true;
    if (!view || reduced || shownScore === target) {
      shownScore = target;
      setText(scoreValue, pad(target));
      return;
    }
    const from = shownScore;
    const start = view.performance.now();
    const step = (now: number): void => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      shownScore = t >= 1 ? target : Math.round(from + (target - from) * (1 - (1 - t) ** 3));
      setText(scoreValue, pad(shownScore));
      frame = t < 1 ? view.requestAnimationFrame(step) : 0;
    };
    frame = view.requestAnimationFrame(step);
  }

  function setTone(tone: 'accent' | 'signal'): void {
    root.documentElement.dataset.tone = tone;
  }

  function showMessage(text: string, state: string): void {
    cancelCount();
    shownScore = 0;
    setText(scoreValue, pad(0));
    setText(message, text);
    message.dataset.state = state;
    message.hidden = false;
    statusWrap.dataset.state = state;
    statusWrap.hidden = false;
    result.hidden = true;
    result.dataset.state = state;
    setTone('accent');
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
          statusWrap.hidden = true;
          result.hidden = false;
          result.dataset.state = 'result';
          result.dataset.level = state.rating.level;
          result.dataset.score = String(state.score);
          result.dataset.pwned = state.pwned.status;
          setTone(state.pwned.status === 'found' ? 'signal' : 'accent');
          showScore(state.score);
          setText(scoreLabel, state.rating.label);
          const { prefix, value } = crackTimeParts(state.crackTime);
          const valueEl = root.createElement('span');
          valueEl.className = 'crack-value';
          valueEl.textContent = value;
          crackTime.replaceChildren(prefix, valueEl);
          pwnedBlock.dataset.status = state.pwned.status;
          pwnedEl.dataset.status = state.pwned.status;
          setText(pwnedEl, pwnedMessage(state.pwned));
          setText(pwnedDetailEl, pwnedDetail(state.pwned));
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
