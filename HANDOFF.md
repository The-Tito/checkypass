# HANDOFF

Registro de cada implementación: qué se hizo, por qué, y cómo continuar. La entrada más reciente va arriba.

- Plan general y decisiones de arquitectura: ver la sección "Estado y decisiones" al final.
- Brief original: [docs/brief-verificador-contrasenas.md](docs/brief-verificador-contrasenas.md) (referencia, no regla).

---

## 2026-10-03 · Fase 5 — Pruebas E2E de privacidad y comportamiento

**Rama:** `feature/e2e-privacy` → PR a `develop`

**Qué se hizo**
- `@playwright/test` 1.63.0; `playwright.config.ts` con 3 proyectos: `chromium-mobile` (Pixel 7), `webkit-mobile` (iPhone 13), `chromium-desktop`. El servidor es `vite preview` con las cabeceras reales de `public/_headers`.
- `tests/e2e/helpers.ts` (Sonnet): HIBP simulado con relleno y contraseñas "filtradas" declarables, registro de peticiones, captura de violaciones de CSP (`securitypolicyviolation`) y errores de consola.
- `privacy.spec.ts`: sin peticiones externas al abrir y zxcvbn solo tras enfocar; solo `GET /range/{5 HEX}` con `add-padding`, sin cuerpo; ninguna petición contiene la contraseña, el hash ni el sufijo; prefijo correcto; almacenamiento, cookies e IndexedDB vacíos; la contraseña no aparece en el DOM ni en la URL; sin violaciones de CSP; teclear rápido = 1 consulta; al volver atrás el campo está vacío.
- `behavior.spec.ts`: estados vacío / filtrada / limpia / HIBP caído / HIBP lento, calibración en navegador real, mostrar/ocultar, Escape.
- `a11y.spec.ts`: etiqueta accesible, `aria-describedby`, orden de tabulación, `aria-live`, `lang`, un solo `h1`, sin scroll horizontal y objetivos táctiles ≥ 44 px en móvil.
- CI: job `e2e` (después de `check`) con caché de navegadores; sube el informe solo si falla.

**Bug encontrado y corregido (Opus)**
- En WebKit, si HIBP no respondía, `AbortSignal.any([signal, AbortSignal.timeout(5000)])` no cortaba el `fetch` y la UI se quedaba en "Revisando filtraciones…" para siempre.
- `src/core/pwned.ts` ahora usa un `AbortController` propio con `setTimeout` y compite contra una promesa que rechaza al abortar, así el timeout funciona aunque el navegador ignore la señal. Se añadieron 2 pruebas unitarias y se quitó el `fixme` de WebKit.

**Resultado:** 96 unitarias; E2E 69 pasan y 3 se omiten (2 son solo de móvil en el proyecto de escritorio; 1 es Tab→botón en WebKit sobre macOS, donde Tab no enfoca botones por defecto; en CI/Linux sí corre). ~17 s en local.

**Cómo verificar:** `npm run check && npm run test:e2e` (la primera vez: `npx playwright install chromium webkit`).

**Pendiente**
- Proponer que `e2e` sea check obligatorio en la protección de ramas.
- Probar en Safari real de iOS antes de publicar.

**Siguiente:** Fase 6 (`release/0.1.0`).

---

## 2026-10-03 · Fase 4 — Interfaz provisional

**Rama:** `feature/ui-base` → PR a `develop`

**Qué se hizo**
- `src/ui/controller.ts` (Opus): orquesta el análisis. Fuerza local a los 150 ms, HIBP a los 600 ms; cada tecla invalida lo anterior (número de secuencia + `AbortController`), así nunca se pinta el resultado de un valor viejo. Si la contraseña está filtrada, el tiempo de descifrado se muestra "al instante". Estado `loading` solo si de verdad hay que esperar la descarga de zxcvbn; `engine-error` si falla.
- `src/ui/state.ts`: `ViewState` (`empty` | `loading` | `engine-error` | `result`), sin la contraseña.
- `index.html` (Sonnet): toda la estructura es estática en el HTML; campo fuera de `<form>` con atributos anti-autocompletado/gestores; botón mostrar/ocultar con `aria-pressed`; región `aria-live` aparte; `<details>` "¿Cómo sé que es seguro?"; créditos y aviso de privacidad.
- `src/ui/view.ts`: pinta el estado solo con `textContent`/`replaceChildren`/`dataset`; `summarize()` puro para el lector de pantalla (anuncia solo resultados finales). El título de la lista cambia a "Buenas prácticas" con puntaje ≥ 8.
- `src/ui/input.ts`: precarga zxcvbn al enfocar/tocar el campo; Escape limpia; `pagehide`/`pageshow` (bfcache) borran el valor.
- Estilos provisionales móvil primero con tokens por nivel en claro/oscuro, `:focus-visible`, `prefers-reduced-motion`.
- Pruebas: `controller.test.ts` (10, con temporizadores simulados), `view.test.ts` (6). Total 94.
- Ajuste: el tip de filtración ya no repite el conteo que muestra la alerta.

**Tamaños del build**
- Carga inicial: HTML 5 kB + CSS 4.5 kB + JS 11.5 kB (5 kB gzip).
- Diferido al enfocar el campo: zxcvbn + diccionarios ≈ 1.3 MB (≈ 630 kB gzip).

**Verificación en navegador real** (Chromium, viewport iPhone 13, `vite preview` con la CSP de producción)
- Sin errores de consola ni violaciones de CSP/Trusted Types.
- Peticiones externas: solo `GET api.pwnedpasswords.com/range/{5 hex}`.
- `localStorage`/`sessionStorage`/cookies vacíos; URL sin cambios; sin scroll horizontal.
- `america2024` → 1/10, "al instante", 245 filtraciones. Frase de 4 palabras + número → 10/10, limpia.
- Con HIBP bloqueado: puntaje local + aviso. Escape vacía el campo.

**Pendiente:** convertir estas comprobaciones en E2E permanentes en CI (fase 5). Probar en WebKit/iOS.

**Siguiente:** Fase 5 (`feature/e2e-privacy`).

---

## 2026-10-03 · Fase 3 — Fuerza, puntaje, tiempo de crackeo y recomendaciones

**Rama:** `feature/core-strength-score` → PR a `develop`

**Qué se hizo**
- Dependencias de runtime: `@zxcvbn-ts/core` 4.2, `language-common` 4.1, `language-es-es` 4.1 (API v4: `new ZxcvbnFactory(options)`).
- `src/core/strength.ts`: `loadStrengthAnalyzer()` carga zxcvbn y diccionarios con `import()` dinámico una sola vez (reintenta si falla). `toStrengthResult()` traduce el resultado a nuestro modelo (`StrengthResult` en `types.ts`), desacoplado de la librería: `guessesLog10`, segundos de crackeo, patrones débiles, palabra única, longitud Unicode. `maxLength` 256.
- `src/core/dict-mx.ts`: ~100 palabras populares en México (equipos, ciudades, comida, apodos, marcas) como diccionario `mx-common`.
- `src/core/score.ts`: tramos explícitos de `guessesLog10` → 1–9, ≥16 → 10. Tope por filtración: máx 2; >100 apariciones → 1; si HIBP no responde, no se limita. `rateScore()` → Muy débil / Débil / Aceptable / Fuerte / Excelente.
- `src/core/crack-time.ts`: escenario hash lento sin conexión (10⁴ intentos/s), textos propios ("3 horas", "más de un siglo").
- `src/core/tips.ts`: hasta 3 recomendaciones; la filtración siempre primero; con puntaje ≥8 no critica la estructura (una frase de palabras es buena) y da buenas prácticas (no reutilizar, gestor, 2FA).
- Pruebas: `score`, `crack-time`, `strength` (calibración con zxcvbn real + patrones + tips). 78 pruebas en total.

**Calibración (puntaje local, antes del tope)**
| Contraseña | Puntaje |
|---|---|
| `123456`, `password`, `qwerty123`, `P@ssw0rd` | 1 |
| `Password123!`, `america2024`, `chivas10`, `guadalupe1985` | ≤ 3 |
| `kX9#mQ2$vL` (10 aleatorios) | 6 |
| frase de 4 palabras | ≥ 8 |
| 16 caracteres aleatorios | 10 |

**Decisiones**
- Sin `language-en` por peso; las contraseñas comunes en inglés ya están en `passwords-common`.
- Los tips no incluyen una frase de ejemplo concreta (la gente la copiaría).
- Protección de ramas activada en GitHub para `main` y `develop`: PR obligatorio, check `check` requerido, sin force push ni borrado, 0 aprobaciones (trabajo en solitario). Los administradores pueden saltarla en emergencias.

**Cómo verificar:** `npm run check`.

**Siguiente:** Fase 4 (`feature/ui-base`): pantalla provisional, estados, debounce, accesibilidad y carga diferida al enfocar.

---

## 2026-10-03 · Fase 2 — Cliente de filtraciones (HIBP)

**Rama:** `feature/core-pwned` → PR a `develop`

**Qué se hizo**
- `src/core/pwned.ts` (sin DOM, sin dependencias):
  - `sha1Hex()` con Web Crypto, UTF-8 sin normalizar (igual que HIBP).
  - `parseRangeResponse()` valida el formato (`35 hex:conteo`), ignora el relleno (conteo 0) y rechaza respuestas inesperadas.
  - `createPwnedClient({ fetch?, timeoutMs?, cacheSize? })` → `check(password, signal?)` devuelve `found {count}` | `clean` | `unavailable {reason: network|timeout|http|invalid-response}`. Solo la cancelación del llamador rechaza (`AbortError`), para que la UI descarte peticiones obsoletas.
  - Petición: solo `/range/{5 hex}`, `Add-Padding: true`, `credentials: 'omit'`, `referrerPolicy: 'no-referrer'`, `cache: 'no-store'`, timeout 5 s (`AbortSignal.any`).
  - Caché LRU en memoria por prefijo (64 entradas, solo respuestas públicas de HIBP; los fallos no se cachean).
- `tests/unit/pwned.test.ts` (17 pruebas) + `tests/fixtures/hibp-range-5BAA6.txt`.

**Decisiones**
- Se comprobó con un preflight real que HIBP responde `access-control-allow-headers: Add-Padding` → **no hace falta fallback sin padding** (resuelve un punto de la checklist §11 del brief).
- Se descartó deduplicar peticiones en vuelo: compartir una promesa haría que cancelar una consulta cancelara otra.

**Cómo verificar**
- `npm run check` (20 pruebas en verde).
- Prueba en vivo realizada: `password` → 52 372 427; `Password123!` → 295 389; frase aleatoria → clean.

**Siguiente:** Fase 3 (`feature/core-strength-score`): zxcvbn-ts diferido + diccionario MX, puntaje por tramos, tiempo de crackeo y recomendaciones, con calibración.

---

## 2026-10-03 · Fase 1 — Scaffold, cabeceras de seguridad y CI

**Rama:** `feature/scaffold` → PR a `develop`

**Qué se hizo**
- Vite 8.3 + TypeScript 7.0 (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Biome 2.5 (preset recomendado), Vitest 5. Versiones exactas, cero dependencias de runtime.
- `public/_headers`: CSP `default-src 'none'`, `script-src 'self'`, `connect-src https://api.pwnedpasswords.com`, `require-trusted-types-for 'script'; trusted-types 'none'`, HSTS, COOP/CORP, `X-Frame-Options: DENY`, etc.
- `vite.config.ts`: plugin `verifica-preview-headers` aplica `_headers` en `vite preview` (no en `dev`). Parser en `scripts/headers.ts`, con prueba.
- Build sin inline: `modulePreload.polyfill: false`, `assetsInlineLimit: 0`, sin sourcemaps.
- `scripts/guard.mjs`: falla si `src/` o `index.html` usan `innerHTML`, almacenamiento, cookies, `console.*`, `eval`, `sendBeacon` o URLs a hosts no permitidos.
- CI (`.github/workflows/ci.yml`): lint, typecheck, guard, tests, `npm audit`, build y comprobación de que `dist/index.html` no trae `<script>`/`<style>` inline. Dependabot semanal hacia `develop`.
- `index.html` con `lang="es-MX"`, `<noscript>` y `<meta name="referrer" content="no-referrer">`; `main.ts` placeholder.

**Decisiones**
- `@types/node` añadido (config y guard usan `node:fs`).
- `allowImportingTsExtensions` (necesario con TS 7 + Vite 8 para importar `.ts` en la config).
- `trusted-types 'none'`: no se permite crear políticas, porque no se usará ningún sink HTML.

**Cómo verificar**
- `npm ci && npm run check && npm run build`
- `npm run preview` y `curl -sI http://localhost:4173/` → aparece la CSP.

**Pendiente**
- Comprobar en navegador real que la CSP no bloquea nada (se automatiza en la fase 5 con Playwright).
- Proteger `main`/`develop` en GitHub (requiere confirmación del usuario).

**Siguiente:** Fase 2 (`feature/core-pwned`): SHA-1 + cliente HIBP con padding, abort, caché, timeout y tests.

---

## 2026-10-03 · Fase 0 — Inicialización del repositorio

**Rama:** `main` → `develop`

**Qué se hizo**
- `git init` con `main` y `develop`; remoto `origin` → `git@github.com:The-Tito/verifica-tu-password.git`.
- Archivos base: `README.md`, `LICENSE` (MIT), `.gitignore`, `.npmrc` (`save-exact`, `engine-strict`), `.node-version` (24).
- El brief se movió a `docs/`.
- Este `HANDOFF.md`.

**Cómo verificar**
- `git branch -a` muestra `main`, `develop` y sus remotos.

**Siguiente**
- Fase 1 (`feature/scaffold`): Vite + TS estricto, Biome, Vitest, `public/_headers` con CSP, `vite preview` aplicando las cabeceras, `scripts/guard.mjs`, CI de GitHub Actions y Dependabot.

---

## Estado y decisiones

| Tema | Decisión |
|---|---|
| Arquitectura | Sitio 100 % estático; la contraseña nunca sale del navegador. Única conexión externa: `api.pwnedpasswords.com/range/{5 hex}`. |
| Stack | Vite + TypeScript estricto sin framework; zxcvbn-ts (+ es-es + diccionario MX propio) con carga diferida; Web Crypto SHA-1. |
| Puntaje | 1–10 por tramos explícitos de `guessesLog10` (calibrados con fixtures); filtrada → máx 2; >100 apariciones → 1. |
| Seguridad | CSP estricta con Trusted Types, cero scripts de terceros, sin almacenamiento, guardia estática en CI, E2E de privacidad con Playwright. |
| Calidad | Biome, Vitest, Playwright, `npm audit` en CI, Dependabot. |
| Hosting | Cloudflare Pages (integración Git: `develop` → preview, `main` → producción). Build `npm run build`, salida `dist`. |
| Git | Gitflow: `feature/*` → PR a `develop`; `release/*` → PR a `main` + tag. Conventional Commits. |
| Modelos | Opus: lógica `core/`, seguridad, revisión. Sonnet: UI, E2E, CI. Haiku: docs y tareas mecánicas. |

**Pendientes del usuario:** nombre/dominio final (P1), identidad visual (P7), aviso al profesor (P6), conectar el proyecto en Cloudflare Pages.
