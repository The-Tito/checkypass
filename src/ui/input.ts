/** Conecta el campo de contraseña con el controlador. */
import type { Controller } from './controller.ts';

export interface PasswordInputDeps {
  readonly input: HTMLInputElement;
  readonly toggle: HTMLButtonElement;
  readonly controller: Controller;
}

export function bindPasswordInput({ input, toggle, controller }: PasswordInputDeps): void {
  const hide = (): void => {
    input.type = 'password';
    toggle.setAttribute('aria-pressed', 'false');
    toggle.textContent = 'Mostrar';
  };

  const clear = (): void => {
    input.value = '';
    hide();
    controller.reset();
  };

  input.addEventListener('input', () => controller.update(input.value));

  const prepare = (): void => controller.prepare();
  input.addEventListener('focus', prepare, { once: true });
  input.addEventListener('pointerenter', prepare, { once: true });
  input.addEventListener('touchstart', prepare, { once: true, passive: true });

  toggle.addEventListener('click', () => {
    const show = input.type === 'password';
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.textContent = show ? 'Ocultar' : 'Mostrar';
    input.focus();
    if (start !== null && end !== null) input.setSelectionRange(start, end);
  });

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') clear();
  });

  window.addEventListener('pagehide', clear);
  window.addEventListener('pageshow', (event) => {
    if (event.persisted) clear();
  });
}
