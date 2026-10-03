# HANDOFF

Registro de cada implementación: qué se hizo, por qué, y cómo continuar. La entrada más reciente va arriba.

- Plan general y decisiones de arquitectura: ver la sección "Estado y decisiones" al final.
- Brief original: [docs/brief-verificador-contrasenas.md](docs/brief-verificador-contrasenas.md) (referencia, no regla).

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
