import './styles/main.css';

const app = document.getElementById('app');
if (app) {
  const title = document.createElement('h1');
  title.textContent = 'Verifica tu password';
  app.replaceChildren(title);
}
