/**
 * Consulta de filtraciones en Have I Been Pwned (Pwned Passwords) por k-anonimato.
 *
 * Solo sale del navegador el prefijo de 5 caracteres del SHA-1. La comparación del
 * sufijo se hace localmente. La contraseña y el hash completo nunca se envían.
 */

const API_BASE = 'https://api.pwnedpasswords.com/range/';
const PREFIX_LENGTH = 5;
const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_CACHE_SIZE = 64;

export type PwnedResult =
  | { readonly status: 'found'; readonly count: number }
  | { readonly status: 'clean' }
  | { readonly status: 'unavailable'; readonly reason: PwnedFailure };

export type PwnedFailure = 'network' | 'timeout' | 'http' | 'invalid-response';

export interface PwnedClientOptions {
  /** Inyectable para pruebas. */
  readonly fetch?: typeof fetch;
  readonly timeoutMs?: number;
  /** Número máximo de prefijos en caché (memoria de la pestaña). */
  readonly cacheSize?: number;
}

export interface PwnedClient {
  /**
   * Revisa si la contraseña aparece en filtraciones.
   * Rechaza con `AbortError` solo si `signal` se cancela; el resto de fallos
   * se devuelven como `{ status: 'unavailable' }`.
   */
  check(password: string, signal?: AbortSignal): Promise<PwnedResult>;
}

/** SHA-1 en hexadecimal mayúsculas sobre los bytes UTF-8, sin normalizar (igual que HIBP). */
export async function sha1Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  let hex = '';
  for (const byte of new Uint8Array(digest)) hex += byte.toString(16).padStart(2, '0');
  return hex.toUpperCase();
}

/**
 * Convierte la respuesta de `/range/{prefijo}` en un mapa sufijo → apariciones.
 * Ignora las entradas de relleno (conteo 0). Devuelve `null` si el formato no es válido.
 */
export function parseRangeResponse(body: string): Map<string, number> | null {
  const entries = new Map<string, number>();
  for (const rawLine of body.split('\n')) {
    const line = rawLine.trim();
    if (line === '') continue;
    const match = /^([0-9A-Fa-f]{35}):(\d+)$/.exec(line);
    if (!match) return null;
    const count = Number(match[2]);
    if (count > 0) entries.set((match[1] as string).toUpperCase(), count);
  }
  return entries;
}

export function createPwnedClient(options: PwnedClientOptions = {}): PwnedClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const cacheSize = options.cacheSize ?? DEFAULT_CACHE_SIZE;
  // Solo se guardan respuestas públicas de HIBP por prefijo, nunca la contraseña.
  const cache = new Map<string, Map<string, number>>();

  function remember(prefix: string, entries: Map<string, number>): void {
    cache.delete(prefix);
    cache.set(prefix, entries);
    while (cache.size > cacheSize) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
  }

  async function fetchRange(
    prefix: string,
    signal: AbortSignal | undefined,
  ): Promise<Map<string, number> | PwnedFailure> {
    // Controlador propio con temporizador manual: WebKit no siempre aborta un fetch
    // colgado con AbortSignal.any + AbortSignal.timeout. Además se compite contra una
    // promesa que rechaza al abortar, por si el fetch ignora la señal.
    const controller = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort(new DOMException('Tiempo de espera agotado', 'TimeoutError'));
    }, timeoutMs);
    const forwardAbort = (): void => controller.abort(signal?.reason);
    signal?.addEventListener('abort', forwardAbort, { once: true });
    const aborted = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), {
        once: true,
      });
    });
    aborted.catch(() => {}); // Evita "unhandled rejection" si nadie la espera.

    const failure = (): PwnedFailure => {
      if (signal?.aborted) throw signal.reason;
      return timedOut ? 'timeout' : 'network';
    };

    try {
      let response: Response;
      try {
        response = await Promise.race([
          doFetch(API_BASE + prefix, {
            method: 'GET',
            headers: { 'Add-Padding': 'true' },
            signal: controller.signal,
            cache: 'no-store',
            credentials: 'omit',
            referrerPolicy: 'no-referrer',
            mode: 'cors',
          }),
          aborted,
        ]);
      } catch {
        return failure();
      }

      if (!response.ok) return 'http';

      let body: string;
      try {
        body = await Promise.race([response.text(), aborted]);
      } catch {
        return failure();
      }

      return parseRangeResponse(body) ?? 'invalid-response';
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', forwardAbort);
    }
  }

  return {
    async check(password, signal) {
      signal?.throwIfAborted();
      const hash = await sha1Hex(password);
      signal?.throwIfAborted();

      const prefix = hash.slice(0, PREFIX_LENGTH);
      const suffix = hash.slice(PREFIX_LENGTH);

      let entries = cache.get(prefix);
      if (entries) {
        remember(prefix, entries);
      } else {
        const result = await fetchRange(prefix, signal);
        if (typeof result === 'string') return { status: 'unavailable', reason: result };
        entries = result;
        remember(prefix, entries);
      }

      const count = entries.get(suffix);
      return count ? { status: 'found', count } : { status: 'clean' };
    },
  };
}
