# Verifica tu password

🔐 Página web estática que valida la fortaleza de contraseñas y detecta filtraciones en tiempo real. 🚧 En desarrollo.

## Cómo funciona

- **Análisis local de fortaleza**: Usa [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn) para evaluar la complejidad y patrones comunes.
- **Detección de filtraciones**: Consulta [Have I Been Pwned – Pwned Passwords](https://haveibeenpwned.com/Passwords) mediante k-anonimato (solo viajan los primeros 5 caracteres del hash SHA-1).
- **Puntuación 1–10**: Resultado visual y recomendaciones personalizadas en español.

## Privacidad

Tu contraseña **nunca sale del navegador**. No hay backend propio ni almacenamiento (sin localStorage, cookies ni parámetros de URL).

La única conexión externa es con `api.pwnedpasswords.com` para verificar filtraciones por k-anonimato. **Sin scripts de terceros ni analíticas.**

*Nota: Próximamente habrá una guía "Compruébalo tú mismo" para revisar las peticiones de red en tu navegador.*

## Desarrollo

**Requisitos:**
- Node.js 24+
- npm 11+

```bash
npm ci            # instala dependencias exactas del lockfile
npm run dev       # servidor de desarrollo
npm run check     # lint + tipos + guardia de privacidad + pruebas
npm run build     # compila a dist/
npm run preview   # sirve dist/ con las cabeceras de seguridad reales (public/_headers)
```

## Flujo de trabajo

**Rama main** = producción  
**Rama develop** = integración

Ramas temáticas: `feature/*`, `release/*`, `hotfix/*`

**Commits**: [Conventional Commits](https://www.conventionalcommits.org/)  
**Registro de cambios**: ver [`HANDOFF.md`](./HANDOFF.md)

## Créditos

- Inspiración: [password-tester-api](https://github.com/alonsomaciasm/password-tester-api) del MC. José Alonso Macías Montoya (Universidad Politécnica de Chiapas) – MIT
- [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn) – MIT
- [Have I Been Pwned – Pwned Passwords](https://haveibeenpwned.com/Passwords) de Troy Hunt

## Licencia

MIT – Ver [`LICENSE`](./LICENSE)
