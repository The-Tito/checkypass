/**
 * Parser del formato `_headers` de Cloudflare Pages.
 * Solo extrae el bloque global `/*`.
 */
export function parseGlobalHeaders(source: string): Record<string, string> {
  const headers: Record<string, string> = {};
  let inGlobalBlock = false;

  for (const rawLine of source.split(/\r?\n/)) {
    if (rawLine.trim() === '' || rawLine.trimStart().startsWith('#')) continue;

    // Una línea sin sangría es una ruta; con sangría es una cabecera de la ruta actual.
    if (!/^\s/.test(rawLine)) {
      inGlobalBlock = rawLine.trim() === '/*';
      continue;
    }
    if (!inGlobalBlock) continue;

    const line = rawLine.trim();
    const separator = line.indexOf(':');
    if (separator <= 0) continue;
    headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }

  return headers;
}
