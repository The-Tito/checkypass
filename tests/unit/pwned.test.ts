import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createPwnedClient, parseRangeResponse, sha1Hex } from '../../src/core/pwned.ts';

// SHA-1("password") = 5BAA6 1E4C9B93F3F0682250B6CF8331B7EE68FD8
const RANGE_5BAA6 = readFileSync(
  new URL('../fixtures/hibp-range-5BAA6.txt', import.meta.url),
  'utf8',
).replaceAll('\n', '\r\n');

function okResponse(body: string): Response {
  return new Response(body, { status: 200 });
}

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<Response>) {
  return vi.fn<typeof fetch>((input, init) => impl(String(input), init));
}

describe('sha1Hex', () => {
  it('coincide con SHA-1 en mayúsculas', async () => {
    expect(await sha1Hex('password')).toBe('5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });

  it('usa UTF-8 sin normalizar', async () => {
    expect(await sha1Hex('contraseña')).toBe('8C31B65BDECDC9F18B695D7318186FD1FEED690D');
  });
});

describe('parseRangeResponse', () => {
  it('ignora el relleno (conteo 0) y normaliza a mayúsculas', () => {
    const entries = parseRangeResponse(`abcdef0123456789abcdef0123456789abc:7\r\n${RANGE_5BAA6}`);
    expect(entries?.get('ABCDEF0123456789ABCDEF0123456789ABC')).toBe(7);
    expect(entries?.get('1E4C9B93F3F0682250B6CF8331B7EE68FD8')).toBe(52372427);
    expect(entries?.has('227F6F64788919B73DA0C323024B9C2EB7C')).toBe(false);
  });

  it('rechaza formatos inesperados', () => {
    expect(parseRangeResponse('<html>error</html>')).toBeNull();
    expect(parseRangeResponse('1E4C9B93:5')).toBeNull();
  });

  it('acepta una respuesta vacía', () => {
    expect(parseRangeResponse('')?.size).toBe(0);
  });
});

describe('createPwnedClient', () => {
  it('detecta una contraseña filtrada con su conteo', async () => {
    const fetch = mockFetch(async () => okResponse(RANGE_5BAA6));
    const client = createPwnedClient({ fetch });
    expect(await client.check('password')).toEqual({ status: 'found', count: 52372427 });
  });

  it('solo envía el prefijo de 5 caracteres, con padding y sin credenciales', async () => {
    const fetch = mockFetch(async () => okResponse(RANGE_5BAA6));
    await createPwnedClient({ fetch }).check('password');

    expect(fetch).toHaveBeenCalledTimes(1);
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    expect(new Headers(init?.headers).get('Add-Padding')).toBe('true');
    expect(init?.credentials).toBe('omit');
    expect(init?.referrerPolicy).toBe('no-referrer');
    expect(JSON.stringify(init)).not.toContain('password');
    expect(String(url)).not.toContain('1E4C9B93F3F0682250B6CF8331B7EE68FD8');
  });

  it('devuelve clean si el sufijo no aparece o solo aparece como relleno', async () => {
    const fetch = mockFetch(async () => okResponse('227F6F64788919B73DA0C323024B9C2EB7C:0'));
    const client = createPwnedClient({ fetch });
    expect(await client.check('password')).toEqual({ status: 'clean' });
  });

  it('reutiliza la respuesta en caché para el mismo prefijo', async () => {
    const fetch = mockFetch(async () => okResponse(RANGE_5BAA6));
    const client = createPwnedClient({ fetch });
    await client.check('password');
    await client.check('password');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('respeta el tamaño máximo de la caché', async () => {
    const fetch = mockFetch(async () => okResponse(''));
    const client = createPwnedClient({ fetch, cacheSize: 1 });
    await client.check('password');
    await client.check('otra-contraseña');
    await client.check('password');
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('no guarda en caché los fallos', async () => {
    const fetch = mockFetch(async () => new Response('', { status: 503 }));
    const client = createPwnedClient({ fetch });
    await client.check('password');
    await client.check('password');
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it.each([
    ['http', async () => new Response('', { status: 503 })],
    ['network', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['invalid-response', async () => okResponse('<html></html>')],
  ] as const)('reporta %s como unavailable', async (reason, impl) => {
    const client = createPwnedClient({ fetch: mockFetch(impl) });
    expect(await client.check('password')).toEqual({ status: 'unavailable', reason });
  });

  it('reporta timeout si HIBP no responde a tiempo', async () => {
    const fetch = mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const client = createPwnedClient({ fetch, timeoutMs: 20 });
    expect(await client.check('password')).toEqual({ status: 'unavailable', reason: 'timeout' });
  });

  it('propaga la cancelación del llamador como AbortError', async () => {
    const controller = new AbortController();
    const fetch = mockFetch(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
        }),
    );
    const pending = createPwnedClient({ fetch }).check('password', controller.signal);
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('no hace la petición si ya está cancelado', async () => {
    const fetch = mockFetch(async () => okResponse(RANGE_5BAA6));
    const controller = new AbortController();
    controller.abort();
    await expect(
      createPwnedClient({ fetch }).check('password', controller.signal),
    ).rejects.toThrow();
    expect(fetch).not.toHaveBeenCalled();
  });
});
