# checkypass 🔐

*check your password*

Página web que da a tu contraseña una puntuación del 1 al 10, avisa si apareció en filtraciones reales y recomienda cómo mejorarla. Todo se analiza en tu dispositivo. Versión 0.1.0.

**Sitio:** https://checkypass.pages.dev/

## Cómo funciona

- **Fuerza**: zxcvbn-ts en el navegador (diccionarios en español + palabras populares en México). Detecta palabras, nombres, fechas, patrones de teclado, secuencias, repeticiones y sustituciones tipo P@ssw0rd.
- **Filtraciones**: Have I Been Pwned – Pwned Passwords con k-anonimato: se calcula el SHA-1 en tu navegador y solo se envían los primeros 5 caracteres; la comparación del resto se hace localmente. Se pide con relleno (Add-Padding) para que el tamaño de la respuesta no delate nada.
- **Puntaje**: 1–10 según el número estimado de intentos para adivinarla; si aparece en filtraciones, máximo 2 (más de 100 apariciones: 1). Tiempo de descifrado estimado para un ataque sin conexión con hash lento.
- **Si Have I Been Pwned no responde**, se muestra el puntaje local con un aviso.

## Privacidad

- La contraseña nunca se envía ni se guarda: sin cookies, localStorage, sessionStorage ni parámetros en la URL. Se borra del campo al salir de la página.
- Única conexión externa: `api.pwnedpasswords.com/range/XXXXX`.
- Cero scripts de terceros, sin analíticas.
- Política de seguridad de contenido (CSP) estricta con Trusted Types (ver `public/_headers`).

## Compruébalo tú mismo

1. Abre la página.
2. Abre las herramientas de desarrollador (F12 o Cmd+Opción+I) → pestaña Red (Network).
3. Escribe una contraseña de prueba parecida a la tuya.
4. Verás descargas del propio sitio y una única petición a `https://api.pwnedpasswords.com/range/` seguida de 5 caracteres; ni la contraseña ni el hash completo aparecen.
5. En la pestaña Aplicación (Application) → Almacenamiento: no hay cookies ni datos guardados.

Esto mismo se verifica automáticamente en cada cambio con pruebas de navegador (`tests/e2e/privacy.spec.ts`).

## Desarrollo

**Requisitos:** Node 24, npm 11.

```bash
npm ci
npm run dev          # servidor de desarrollo
npm run check        # lint + tipos + guardia de privacidad + pruebas unitarias
npm run build        # compila a dist/
npm run preview      # sirve dist/ con las cabeceras reales de public/_headers
npx playwright install chromium webkit   # solo la primera vez
npm run test:e2e     # pruebas de navegador (privacidad, comportamiento, accesibilidad)
```

**Estructura**
- `src/core`: lógica pura sin DOM (pwned.ts, strength.ts, score.ts, tips.ts, crack-time.ts, dict-mx.ts).
- `src/ui`: controlador y vista.
- `scripts/guard.mjs`: bloquea innerHTML, almacenamiento, cookies, console y dominios no permitidos.
- `tests/unit`: pruebas unitarias.
- `tests/e2e`: pruebas de navegador.
- `public/_headers`: cabeceras de seguridad.

## Despliegue en Cloudflare Pages

1. En el panel de Cloudflare: Workers y Pages → Crear → Pages → Conectar con Git → elegir el repositorio `The-Tito/checkypass`.
2. **Configuración de build:**
   - Framework preset: None
   - Comando: `npm run build`
   - Directorio de salida: `dist`
   - Rama de producción: `main`
   - La versión de Node se toma de `.node-version` (24); si el panel no la detecta, añade la variable de entorno `NODE_VERSION=24`.
3. **Despliegues de vista previa:** activados para `develop` (URL `develop.checkypass.pages.dev`).
4. **No actives** Cloudflare Web Analytics ni ninguna inyección de scripts en el proyecto: la CSP los bloquearía y además contradicen la promesa de privacidad.
5. Tras el primer despliegue, comprueba las cabeceras: `curl -sI https://checkypass.pages.dev/ | grep -i content-security-policy`.
6. **Opcional:** dominio propio en Custom domains (HTTPS automático).

*Nota:* no hay variables secretas ni backend; cada despliegue queda guardado y se puede revertir desde el panel.

## Flujo de trabajo

**Gitflow:** `main` (producción, Cloudflare) — `develop` (integración, vista previa) — `feature/*`, `release/*`, `hotfix/*`.

Todo entra por pull request; las ramas `main` y `develop` están protegidas y exigen los checks `check` y `e2e`. Conventional Commits. Historial de implementación en `HANDOFF.md`.

## Créditos

- Idea inspirada en [password-tester-api](https://github.com/alonsomaciasm/password-tester-api) del MC. José Alonso Macías Montoya, Universidad Politécnica de Chiapas (MIT).
- [zxcvbn-ts](https://github.com/zxcvbn-ts/zxcvbn), MIT, basado en zxcvbn de Dropbox.
- [Have I Been Pwned – Pwned Passwords](https://haveibeenpwned.com/Passwords), de Troy Hunt.

## Licencia

MIT — ver [LICENSE](LICENSE). Cambios por versión en [CHANGELOG.md](CHANGELOG.md).
