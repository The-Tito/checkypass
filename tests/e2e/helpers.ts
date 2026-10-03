import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { expect, type Page, type Request, type Route } from '@playwright/test';

export const HIBP_ORIGIN = 'https://api.pwnedpasswords.com';
export const HIBP_RANGE_URL = `${HIBP_ORIGIN}/range/`;
export const APP_ORIGIN = 'http://localhost:4173';

const FIXTURE_5BAA6 = readFileSync(
  new URL('../fixtures/hibp-range-5BAA6.txt', import.meta.url),
  'utf8',
);

/** SHA-1 en hexadecimal mayúsculas, igual que HIBP. */
export function sha1(text: string): string {
  return createHash('sha1').update(text, 'utf8').digest('hex').toUpperCase();
}

/** Contraseñas "filtradas" de prueba y su conteo: `{ 'america2024': 245 }`. */
export type LeakedPasswords = Readonly<Record<string, number>>;

export interface HibpRequestLog {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly postData: string | null;
}

export type HibpHandler = (route: Route, request: Request) => Promise<void> | void;

export interface HibpMock {
  /** Peticiones a HIBP interceptadas (sin incluir preflights). */
  readonly requests: HibpRequestLog[];
  /** Prefijos solicitados, en orden. */
  prefixes(): string[];
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
};

/** Relleno determinista (sufijos de 35 hex con conteo 0), como hace `Add-Padding`. */
function paddingLines(prefix: string, count: number): string[] {
  const lines: string[] = [];
  for (let i = 0; i < count; i++) {
    lines.push(`${sha1(`relleno-${prefix}-${i}`).slice(0, 35)}:0`);
  }
  return lines;
}

function buildRangeBody(prefix: string, leaked: LeakedPasswords): string {
  if (prefix === '5BAA6') return FIXTURE_5BAA6;
  const lines = paddingLines(prefix, 20);
  for (const [password, count] of Object.entries(leaked)) {
    const hash = sha1(password);
    if (hash.startsWith(prefix)) lines.push(`${hash.slice(5)}:${count}`);
  }
  return `${lines.join('\r\n')}\r\n`;
}

/**
 * Intercepta `https://api.pwnedpasswords.com/range/*`. Por defecto responde 200 text/plain
 * con CORS; `handler` permite sustituir la respuesta (abort, lentitud, errores HTTP...).
 */
export async function mockHibp(
  page: Page,
  options: { leaked?: LeakedPasswords; handler?: HibpHandler } = {},
): Promise<HibpMock> {
  const leaked = options.leaked ?? {};
  const requests: HibpRequestLog[] = [];

  await page.route(`${HIBP_RANGE_URL}*`, async (route, request) => {
    if (request.method() === 'OPTIONS') {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    requests.push({
      url: request.url(),
      method: request.method(),
      headers: await request.allHeaders(),
      postData: request.postData(),
    });
    if (options.handler) {
      await options.handler(route, request);
      return;
    }
    const prefix = new URL(request.url()).pathname.split('/').pop() ?? '';
    await route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      headers: CORS,
      body: buildRangeBody(prefix.toUpperCase(), leaked),
    });
  });

  return {
    requests,
    prefixes: () => requests.map((r) => new URL(r.url).pathname.split('/').pop() ?? ''),
  };
}

declare global {
  interface Window {
    __cspViolations?: string[];
  }
}

export interface Problems {
  /** Errores de consola, errores de página y mensajes de CSP / Trusted Types. */
  readonly messages: string[];
  /** Violaciones de CSP reportadas por `securitypolicyviolation`. */
  cspViolations(): Promise<string[]>;
}

const CSP_PATTERN = /Content Security Policy|Refused|TrustedHTML|Trusted ?Type/i;

/** Llamar antes de `page.goto`. */
export async function collectProblems(page: Page): Promise<Problems> {
  const messages: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error' || CSP_PATTERN.test(msg.text())) {
      messages.push(`[console.${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (error) => messages.push(`[pageerror] ${error.message}`));

  // Los init scripts de Playwright no pasan por la CSP de la página.
  await page.addInitScript(() => {
    window.__cspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__cspViolations?.push(`${event.violatedDirective} ${event.blockedURI}`);
    });
  });

  return {
    messages,
    cspViolations: async () =>
      (await page.evaluate(() => window.__cspViolations ?? [])) as string[],
  };
}

export interface TrackedRequest {
  readonly url: string;
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly postData: string | null;
  readonly resourceType: string;
}

export function trackRequests(page: Page): TrackedRequest[] {
  const list: TrackedRequest[] = [];
  page.on('request', (request) => {
    list.push({
      url: request.url(),
      method: request.method(),
      headers: request.headers(),
      postData: request.postData(),
      resourceType: request.resourceType(),
    });
  });
  return list;
}

/** Peticiones http(s) a orígenes distintos del sitio. */
export function externalRequests(requests: readonly TrackedRequest[]): TrackedRequest[] {
  return requests.filter((r) => /^https?:/.test(r.url) && new URL(r.url).origin !== APP_ORIGIN);
}

export async function typePassword(page: Page, value: string): Promise<void> {
  await page.locator('#password').fill(value);
}

export type PwnedStatus = 'checking' | 'found' | 'clean' | 'unavailable';

export async function waitForResult(
  page: Page,
  status: PwnedStatus,
  timeout = 10_000,
): Promise<void> {
  await expect(page.locator(`#pwned-status[data-status="${status}"]`)).toBeAttached({ timeout });
  await expect(page.locator('#result')).toBeVisible({ timeout });
}

export async function readScore(page: Page): Promise<number> {
  return Number(await page.locator('#score-value').innerText());
}
