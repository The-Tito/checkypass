import { expect, test } from '@playwright/test';
import { mockHibp, readScore, typePassword, waitForResult } from './helpers.ts';

const CLEAN_PHRASE = 'nube-tinta-cobre-delfin-4827';

test.describe('comportamiento', () => {
  test('estado vacío: resultado oculto y mensaje visible', async ({ page }) => {
    await mockHibp(page);
    await page.goto('/');
    await expect(page.locator('#result')).toBeHidden();
    await expect(page.locator('#status-message')).toBeVisible();
    await expect(page.locator('#status-message')).toContainText('Esperando');
  });

  test('contraseña filtrada: puntaje 1, descifrado al instante y consejo de cambiarla', async ({
    page,
  }) => {
    await mockHibp(page, { leaked: { america2024: 245 } });
    await page.goto('/');
    await typePassword(page, 'america2024');
    await waitForResult(page, 'found');

    expect(await readScore(page)).toBe(1);
    await expect(page.locator('#result')).toHaveAttribute('data-score', '1');
    await expect(page.locator('#score-value')).toHaveText('01');
    await expect(page.locator('#crack-time')).toContainText('al instante');
    await expect(page.locator('#pwned-detail')).toContainText('atacantes prueban primero');
    await expect(page.locator('html')).toHaveAttribute('data-tone', 'signal');
    await expect(page.locator('#pwned-status')).toContainText('245');
    await expect(page.locator('#tips li').first()).toContainText('cámbiala');
  });

  test('contraseña limpia: puntaje alto, buenas prácticas y sin afirmar que es segura', async ({
    page,
  }) => {
    await mockHibp(page);
    await page.goto('/');
    await typePassword(page, CLEAN_PHRASE);
    await waitForResult(page, 'clean');

    expect(await readScore(page)).toBeGreaterThanOrEqual(8);
    await expect(page.locator('html')).toHaveAttribute('data-tone', 'accent');
    await expect(page.locator('#tips-title')).toHaveText('Buenas prácticas');
    const resultText = await page.locator('#result').innerText();
    expect(resultText.toLowerCase()).not.toContain('es segura');
    expect(resultText.toLowerCase()).not.toContain('es segur');
  });

  test('con movimiento reducido el número llega directo al valor final', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await mockHibp(page, { leaked: { america2024: 245 } });
    await page.goto('/');
    await typePassword(page, 'america2024');
    await waitForResult(page, 'found');
    // Sin esperas ni reintentos: no hay animación de conteo.
    expect(await page.locator('#score-value').innerText()).toBe('01');
    const animation = await page
      .locator('.orb-a')
      .evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');
  });

  test('HIBP caído: el puntaje se muestra y se avisa que no se pudo revisar', async ({ page }) => {
    await mockHibp(page, { handler: (route) => route.abort() });
    await page.goto('/');
    await typePassword(page, CLEAN_PHRASE);
    await waitForResult(page, 'unavailable');

    await expect(page.locator('#score-value')).toBeVisible();
    expect(await readScore(page)).toBeGreaterThanOrEqual(1);
    await expect(page.locator('#pwned-status')).toContainText('No se pudo revisar filtraciones');
  });

  // Regresión: en WebKit un fetch colgado no se abortaba con AbortSignal.any + timeout.
  test('HIBP lento: tras el tiempo límite del cliente queda como no disponible', async ({
    page,
  }) => {
    test.setTimeout(20_000);
    // El handler nunca responde; el cliente aborta a los 5 s.
    await mockHibp(page, { handler: () => new Promise<void>(() => {}) });
    await page.goto('/');
    await typePassword(page, CLEAN_PHRASE);

    // Mientras espera, el puntaje local ya se ve y el estado es "checking".
    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#pwned-status')).toHaveAttribute('data-status', 'checking');
    await waitForResult(page, 'unavailable', 12_000);
    await expect(page.locator('#pwned-status')).toContainText('No se pudo revisar filtraciones');
  });

  test.describe('calibración en navegador real', () => {
    const cases: readonly { password: string; min?: number; max?: number }[] = [
      { password: '123456', max: 1 },
      { password: 'Password123!', max: 3 },
      { password: 'correcto caballo batería grapa', min: 8 },
    ];

    for (const { password, min, max } of cases) {
      test(`puntaje de «${password}»`, async ({ page }) => {
        await mockHibp(page);
        await page.goto('/');
        await typePassword(page, password);
        await waitForResult(page, 'clean');
        const score = await readScore(page);
        if (min !== undefined) expect(score).toBeGreaterThanOrEqual(min);
        if (max !== undefined) expect(score).toBeLessThanOrEqual(max);
      });
    }
  });

  test('mostrar/ocultar alterna el tipo, aria-pressed, el texto y conserva el foco', async ({
    page,
  }) => {
    await mockHibp(page);
    await page.goto('/');
    const input = page.locator('#password');
    const toggle = page.locator('#toggle');
    await typePassword(page, 'algo-de-prueba');

    await toggle.click();
    await expect(input).toHaveAttribute('type', 'text');
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    await expect(toggle).toHaveText('Ocultar');
    await expect(input).toBeFocused();

    await toggle.click();
    await expect(input).toHaveAttribute('type', 'password');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(toggle).toHaveText('Mostrar');
    await expect(input).toBeFocused();
  });

  test('Escape limpia el campo y oculta el resultado', async ({ page }) => {
    await mockHibp(page);
    await page.goto('/');
    await typePassword(page, CLEAN_PHRASE);
    await waitForResult(page, 'clean');

    await page.locator('#password').press('Escape');
    await expect(page.locator('#password')).toHaveValue('');
    await expect(page.locator('#result')).toBeHidden();
    await expect(page.locator('#status-message')).toBeVisible();
  });
});
