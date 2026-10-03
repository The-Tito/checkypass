// Guardia de privacidad/seguridad: falla si el código fuente usa APIs o URLs prohibidas.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const EXTENSIONS = new Set(['.ts', '.js', '.html', '.css']);
const ALLOWED_HOSTS = new Set([
  'api.pwnedpasswords.com',
  'github.com',
  'haveibeenpwned.com',
  'www.w3.org',
]);

const PATTERNS = [
  ['innerHTML', /innerHTML/],
  ['outerHTML', /outerHTML/],
  ['insertAdjacentHTML', /insertAdjacentHTML/],
  ['document.write', /document\s*\.\s*write/],
  ['eval(', /\beval\s*\(/],
  ['new Function(', /new\s+Function\s*\(/],
  ['localStorage', /localStorage/],
  ['sessionStorage', /sessionStorage/],
  ['indexedDB', /indexedDB/],
  ['document.cookie', /document\s*\.\s*cookie/],
  ['console.*', /console\s*\.\s*(log|info|debug|warn|error|trace)\b/],
  ['sendBeacon', /sendBeacon/],
];

const URL_PATTERN = /https?:\/\/([^\s/'"`)<>:?#]+)/g;

function* walk(dir) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) yield* walk(path);
    else if (EXTENSIONS.has(extname(path))) yield path;
  }
}

const files = [...walk('src'), 'index.html'];
const violations = [];

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const [name, regex] of PATTERNS) {
      if (regex.test(line)) violations.push(`${file}:${index + 1}: patrón prohibido "${name}"`);
    }
    for (const match of line.matchAll(URL_PATTERN)) {
      const host = (match[1] ?? '').toLowerCase();
      if (!ALLOWED_HOSTS.has(host)) {
        violations.push(`${file}:${index + 1}: URL con host no permitido "${host}"`);
      }
    }
  });
}

if (violations.length > 0) {
  console.error('guard: se encontraron patrones prohibidos:');
  for (const v of violations) console.error(`  ${v}`);
  process.exit(1);
}
console.log(`guard: OK (${files.length} archivos revisados)`);
