# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.1.1] — 2026-10-03

### Cambiado
- Nombre visible: **checkypass** (título de la pestaña, encabezado y README).
- Repositorio renombrado a `The-Tito/checkypass`; enlace "Código fuente" actualizado.

### Rendimiento
- Caché inmutable de un año para `/assets/*` (archivos con hash): las visitas repetidas no vuelven a descargar JS, CSS ni diccionarios.

### Mantenimiento
- Dependabot ya no propone versiones mayores de `@types/node` (deben coincidir con Node 24).

## [0.1.0] — 2026-10-03

Primera versión funcional con diseño provisional.

### Añadido
- Puntaje 1–10 calculado en el navegador con zxcvbn-ts (diccionarios en español + palabras populares en México).
- Consulta de filtraciones en Have I Been Pwned por k-anonimato (prefijo de 5 caracteres del SHA-1, con relleno). Tope del puntaje si la contraseña está filtrada.
- Tiempo estimado de descifrado y hasta 3 recomendaciones en español.
- Interfaz móvil primero, accesible, con mostrar/ocultar y la sección "¿Cómo sé que es seguro?".
- CSP estricta con Trusted Types, sin scripts de terceros ni almacenamiento.
- Pruebas unitarias (Vitest) y de navegador (Playwright en Chromium y WebKit) que verifican la privacidad en cada cambio.

### Corregido
- En WebKit, una consulta a HIBP sin respuesta no expiraba y dejaba la interfaz en "Revisando filtraciones…".
