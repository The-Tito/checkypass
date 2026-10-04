# Changelog

Formato basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y [SemVer](https://semver.org/lang/es/).

## [0.2.0] — 2026-10-04

### Cambiado
- Rediseño completo "Señal / constelación": una columna minimalista, oscuro predeterminado y claro según el sistema, medidor en barra con marcas de regla y fondo con orbes difuminados que cambian a naranja si la contraseña está filtrada.
- Tipografía Instrument Sans + JetBrains Mono, autoalojadas (OFL); la CSP no cambia.
- Estado de filtraciones con texto principal y explicación breve; "¿Cómo sé que es seguro?" en 5 pasos.

### Añadido
- Microanimaciones (deriva del fondo, entrada escalonada, llenado de la barra, pulso y escaneo al revisar, conteo del puntaje). Se desactivan con "reducir movimiento".

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
