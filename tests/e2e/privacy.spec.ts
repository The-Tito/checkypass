import { expect, test } from '@playwright/test';
import {
  APP_ORIGIN,
  collectProblems,
  externalRequests,
  HIBP_RANGE_URL,
  mockHibp,
  sha1,
  trackRequests,
  typePassword,
  waitForResult,
} from './helpers.ts';

// Contraseña de prueba distintiva: cualquier fuga en URL, cabeceras, DOM o almacenamiento se nota.
const SECRET = 'Zq-marmota-7391-xylofono';

test.describe('privacidad', () => {
  test('al abrir la página no hay peticiones externas ni se descarga zxcvbn', async ({ page }) => {
    const requests = trackRequests(page);
    await mockHibp(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(externalRequests(requests)).toEqual([]);

    const scriptsBefore = new Set(
      requests.filter((r) => /\.js(\?|$)/.test(r.url)).map((r) => r.url),
    );
    expect([...scriptsBefore].some((url) => /\/dist-[\w-]+\.js/.test(url))).toBe(false);
    expect([...scriptsBefore].some((url) => /zxcvbn/i.test(url))).toBe(false);

    await page.locator('#password').focus();
    await expect
      .poll(() => {
        const after = requests.filter((r) => /\.js(\?|$)/.test(r.url)).map((r) => r.url);
        return after.filter((url) => !scriptsBefore.has(url)).length;
      })
      .toBeGreaterThan(0);

    const newScripts = requests
      .filter((r) => /\.js(\?|$)/.test(r.url) && !scriptsBefore.has(r.url))
      .map((r) => r.url);
    expect(newScripts.some((url) => /\/dist-[\w-]+\.js/.test(url))).toBe(true);
    expect(externalRequests(requests)).toEqual([]);
  });

  test('solo se envía el prefijo k-anónimo de 5 caracteres a HIBP', async ({ page }) => {
    const requests = trackRequests(page);
    const hibp = await mockHibp(page);
    await page.goto('/');
    await typePassword(page, SECRET);
    await waitForResult(page, 'clean');

    const external = externalRequests(requests);
    expect(external.length).toBeGreaterThan(0);

    const hash = sha1(SECRET);
    const suffix = hash.slice(5);
    for (const request of external) {
      expect(request.url).toMatch(new RegExp(`^${HIBP_RANGE_URL}[0-9A-F]{5}$`));
      expect(request.method).toBe('GET');
      expect(request.postData).toBeNull();
      expect(request.headers['add-padding']).toBe('true');
    }

    // Ninguna parte de ninguna petición contiene la contraseña, el hash ni el sufijo.
    const everything = JSON.stringify(
      [...requests, ...hibp.requests].map((r) => [r.url, r.headers, r.postData]),
    ).toLowerCase();
    for (const forbidden of [SECRET, encodeURIComponent(SECRET), hash, suffix]) {
      expect(everything).not.toContain(forbidden.toLowerCase());
    }
  });

  test('el prefijo enviado son los 5 primeros caracteres del SHA-1 real', async ({ page }) => {
    const hibp = await mockHibp(page);
    await page.goto('/');
    await typePassword(page, SECRET);
    await waitForResult(page, 'clean');

    expect(hibp.prefixes()).toEqual([sha1(SECRET).slice(0, 5)]);
  });

  test('no queda nada guardado ni en la URL ni en el DOM', async ({ page, context }) => {
    const startUrl = new URL('/', APP_ORIGIN).href;
    await mockHibp(page);
    await page.goto('/');
    await typePassword(page, SECRET);
    await waitForResult(page, 'clean');
    await page.locator('#toggle').click();

    const state = await page.evaluate(async (secret) => {
      const attributeHits: string[] = [];
      for (const el of document.querySelectorAll('*')) {
        for (const attr of el.getAttributeNames()) {
          if (`${attr}=${el.getAttribute(attr)}`.includes(secret)) {
            attributeHits.push(`${el.tagName.toLowerCase()}[${attr}]`);
          }
        }
      }
      const databases =
        'databases' in indexedDB ? (await indexedDB.databases()).map((d) => d.name) : null;
      return {
        localStorage: localStorage.length,
        sessionStorage: sessionStorage.length,
        cookie: document.cookie,
        databases,
        attributeHits,
        html: document.documentElement.outerHTML.includes(secret),
        text: document.body.innerText.includes(secret),
        href: location.href,
      };
    }, SECRET);

    expect(state.localStorage).toBe(0);
    expect(state.sessionStorage).toBe(0);
    expect(state.cookie).toBe('');
    expect(await context.cookies()).toEqual([]);
    // WebKit puede no exponer indexedDB.databases(): en ese caso no se comprueba.
    if (state.databases !== null) expect(state.databases).toEqual([]);
    expect(state.attributeHits).toEqual([]);
    expect(state.html).toBe(false);
    expect(state.text).toBe(false);
    expect(state.href).toBe(startUrl);
    expect(page.url()).toBe(startUrl);
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
  });

  test('no hay violaciones de CSP ni errores de consola en todo el flujo', async ({ page }) => {
    const problems = await collectProblems(page);
    await mockHibp(page);
    await page.goto('/');
    await typePassword(page, SECRET);
    await waitForResult(page, 'clean');
    await page.locator('#toggle').click();
    await page.locator('#toggle').click();
    await page.locator('#password').press('Escape');
    await expect(page.locator('#result')).toBeHidden();

    expect(await problems.cspViolations()).toEqual([]);
    expect(problems.messages).toEqual([]);
  });

  test('la respuesta incluye la CSP con Trusted Types y connect-src restringido', async ({
    page,
  }) => {
    const response = await page.goto('/');
    const csp = response?.headers()['content-security-policy'] ?? '';
    expect(csp).toContain("require-trusted-types-for 'script'");
    expect(csp).toContain('connect-src https://api.pwnedpasswords.com;');
    expect(csp).toContain("default-src 'none'");
  });

  test('escribir rápido produce una sola consulta HIBP', async ({ page }) => {
    const hibp = await mockHibp(page);
    await page.goto('/');
    const value = 'rapido-7391-Qz';
    await page.locator('#password').pressSequentially(value, { delay: 30 });
    await waitForResult(page, 'clean');
    // Margen para detectar consultas tardías o duplicadas.
    await page.waitForTimeout(1200);

    expect(hibp.prefixes()).toEqual([sha1(value).slice(0, 5)]);
  });

  test('pagehide: al volver a la página el campo está vacío y el resultado oculto', async ({
    page,
  }) => {
    await mockHibp(page);
    await page.goto('/');
    await typePassword(page, SECRET);
    await waitForResult(page, 'clean');

    await page.goto('about:blank');
    await page.goBack();

    // Con bfcache o con recarga completa el resultado es el mismo.
    await expect(page.locator('#password')).toHaveValue('');
    await expect(page.locator('#result')).toBeHidden();
  });
});
