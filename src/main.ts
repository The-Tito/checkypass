import './styles/main.css';
import { createPwnedClient } from './core/pwned.ts';
import { loadStrengthAnalyzer } from './core/strength.ts';
import { createController } from './ui/controller.ts';
import { byId } from './ui/dom.ts';
import { bindPasswordInput } from './ui/input.ts';
import { createView } from './ui/view.ts';

const view = createView(document);
const controller = createController({
  loadAnalyzer: loadStrengthAnalyzer,
  pwnedClient: createPwnedClient(),
  render: view.render,
});

bindPasswordInput({
  input: byId(document, 'password', HTMLInputElement),
  toggle: byId(document, 'toggle', HTMLButtonElement),
  controller,
});

view.render({ kind: 'empty' });
