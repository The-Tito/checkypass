import { expect, test } from '@playwright/test';
import { mockHibp, typePassword, waitForResult } from './helpers.ts';

test.describe('accesibilidad', () => {
  test('el campo tiene nombre accesible y descripción de privacidad', async ({ page }) => {
    await mockHibp(page);
    await page.goto('/');
    const input = page.getByLabel('Contraseña');
    await expect(input).toHaveCount(1);
    await expect(input).toHaveAttribute('id', 'password');
    await expect(input).toHaveAttribute('aria-describedby', 'privacy-note');
    await expect(page.locator('#privacy-note')).toContainText('no sale de este dispositivo');
  });

  test('con el teclado, Tab llega al campo y luego al botón mostrar', async ({
    page,
    browserName,
  }) => {
    test.skip(
      browserName === 'webkit' && process.platform === 'darwin',
      'WebKit en macOS no enfoca botones con Tab salvo que el acceso total con teclado esté activo; en Linux (CI) sí',
    );
    await mockHibp(page);
    await page.goto('/');
    await page.keyboard.press('Tab');
    await expect(page.locator('#password')).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.locator('#toggle')).toBeFocused();
  });

  test('el anunciador es polite, calla en «checking» y anuncia el puntaje final', async ({
    page,
  }) => {
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    await mockHibp(page, {
      handler: async (route) => {
        await gate;
        await route.fulfill({
          status: 200,
          contentType: 'text/plain',
          headers: { 'access-control-allow-origin': '*' },
          body: '',
        });
      },
    });
    await page.goto('/');
    const announcer = page.locator('#announcer');
    await expect(announcer).toHaveAttribute('aria-live', 'polite');

    await typePassword(page, 'nube-tinta-cobre-delfin-4827');
    await expect(page.locator('#result')).toBeVisible();
    await expect(page.locator('#pwned-status')).toHaveAttribute('data-status', 'checking');
    await expect(announcer).toHaveText('');

    release?.();
    await waitForResult(page, 'clean');
    await expect(announcer).toHaveText(/Puntaje \d+ de 10/);
  });

  test('el documento declara es-MX y tiene un único h1', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'es-MX');
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('en móvil no hay scroll horizontal', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Solo aplica a proyectos móviles');
    await mockHibp(page);
    await page.goto('/');
    await typePassword(page, 'nube-tinta-cobre-delfin-4827');
    await waitForResult(page, 'clean');
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test('el campo y el botón miden al menos 44 px de alto en móvil', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Solo aplica a proyectos móviles');
    await page.goto('/');
    for (const selector of ['#password', '#toggle']) {
      const box = await page.locator(selector).boundingBox();
      expect(box?.height ?? 0, selector).toBeGreaterThanOrEqual(44);
    }
  });
});
