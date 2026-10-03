/** Helpers mínimos y seguros: solo textContent, nunca HTML como cadena. */

export function byId<T extends HTMLElement>(root: Document, id: string, ctor: new () => T): T {
  const el = root.getElementById(id);
  if (!(el instanceof ctor)) throw new Error(`Falta el elemento #${id}`);
  return el;
}

export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}
