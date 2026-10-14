import { gameAction } from '../helpers/gameUi';
import { test, expect } from '@playwright/test';
import { onboard } from '../helpers/onboard';
test.use({ browserName: process.env.READABILITY_BROWSER === 'webkit' ? 'webkit' : 'chromium' });

for (const width of [320, 375, 390, 430]) {
  test(`iPhone ${width}px: sharp full cards, swipe, complete hand and large preview`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const guestContext = await browser.newContext();
    const host = await context.newPage(), guest = await guestContext.newPage();
    const errors: string[] = [];
    const sdkWarnings: string[] = [];
    for (const page of [host, guest]) page.on('pageerror', e => {
      // WebKit reports the SDK's caught Node-WebSocket constructor probe as a
      // pageerror even though its browser fallback succeeds. Reproduced in an
      // isolated try/catch; retain it separately instead of hiding app errors.
      if (browser.browserType().name() === 'webkit' && e.message === "Wrong protocol for WebSocket '[object Object]'") sdkWarnings.push(e.message);
      else errors.push(e.message);
    });
    try {
      for (const page of [host, guest]) await page.goto(process.env.LIVE_URL ?? '/');
      await onboard(host, 'Kad Hos'); await onboard(guest, 'Kad Tetamu');
      await host.getByRole('button', { name: 'Buka bilik', exact: true }).click();
      await host.getByRole('button', { name: 'Cipta bilik', exact: true }).click();
      const code = await host.getByTestId('room-code').innerText();
      await guest.getByRole('button', { name: 'Sertai', exact: true }).click();
      await guest.getByLabel('Kod bilik', { exact: true }).fill(code);
      await guest.getByRole('button', { name: 'Masuk bilik', exact: true }).click();
      for (const page of [host, guest]) await page.getByRole('button', { name: 'Saya sedia', exact: true }).click();
      await host.getByRole('button', { name: 'Mula', exact: true }).click();
      const board = host.getByTestId('board-container');
      await expect(board).toHaveAttribute('aria-busy', 'false');
      await host.waitForTimeout(1400);
      const canvas = host.locator('.phaser-board canvas');
      await canvas.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      const pixels = await canvas.evaluate((element: HTMLCanvasElement) => ({ width: element.width, css: element.getBoundingClientRect().width }));
      expect(pixels.width / pixels.css).toBeCloseTo(2, 1);
      const cardWidth = Number(await board.getAttribute('data-card-width'));
      const cardHeight = Number(await board.getAttribute('data-card-height'));
      expect(cardWidth).toBeGreaterThanOrEqual(110);
      expect(cardHeight).toBeGreaterThanOrEqual(202);
      const previous = host.getByRole('button', { name: 'Kad sebelumnya', exact: true });
      const next = host.getByRole('button', { name: 'Kad seterusnya', exact: true });
      while (await previous.isEnabled()) await previous.click();
      const seen = new Set<string>();
      for (;;) {
        const ids = (await board.getAttribute('data-hand-cards'))!.split(',');
        expect(ids.length).toBeLessThanOrEqual(2);
        ids.forEach(id => seen.add(id));
        if (await next.isDisabled()) break;
        const page = Number(await board.getAttribute('data-hand-page'));
        await next.click();
        await expect(board).toHaveAttribute('data-hand-page', String(page + 1));
      }
      expect([...seen].sort()).toEqual((await host.locator('.phaser-hand-mirror .card-source').allTextContents()).map(value => value.trim().split(/\s+/)[0]).sort());
      while (await previous.isEnabled()) await previous.click();
      await canvas.evaluate(element => element.scrollIntoView({ block: 'start', behavior: 'instant' }));
      let bounds = (await canvas.boundingBox())!;
      const y = bounds.y + bounds.height - 42 - cardHeight / 2;
      if (browser.browserType().name() === 'chromium') {
        const touch = await context.newCDPSession(host);
        await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bounds.x + bounds.width - 30, y }] });
        for (let step = 1; step <= 5; step++) await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bounds.x + bounds.width - 30 - step * 32, y }] });
        await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await host.mouse.move(bounds.x + bounds.width - 30, y);
        await host.mouse.down();
        await host.waitForTimeout(50);
        await host.mouse.move(bounds.x + bounds.width - 190, y, { steps: 5 });
        await host.waitForTimeout(50);
        await host.mouse.up();
      }
      await expect(board).toHaveAttribute('data-hand-page', '1');
      await expect(host.getByRole('dialog')).toHaveCount(0);
      await host.screenshot({ path: `docs/screenshots/iphone-cards-${width}-${browser.browserType().name()}.png` });
      bounds = (await canvas.boundingBox())!;
      const firstId = (await board.getAttribute('data-hand-cards'))!.split(',')[0];
      const expectedTitle = await host.locator('.phaser-hand-mirror .career-card').filter({ has: host.locator('.card-source', { hasText: firstId }) }).locator('.card-title').innerText();
      await host.touchscreen.tap(bounds.x + (bounds.width - cardWidth * 2 - 12) / 2 + cardWidth / 2, bounds.y + bounds.height - 42 - cardHeight / 2);
      await expect(host.getByRole('dialog', { name: 'Butiran kad' })).toBeVisible();
      await expect(host.locator('.card-detail h2')).toHaveText(expectedTitle);
      await expect(host.locator('.card-detail .career-card img')).toHaveCSS('object-fit', 'contain');
      await host.waitForTimeout(450);
      expect(await host.locator('.card-detail .close').evaluate(element => {
        const r = element.getBoundingClientRect();
        return element.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
      })).toBe(true);
      await host.screenshot({ path: `docs/screenshots/iphone-card-preview-${width}-${browser.browserType().name()}.png` });
      await host.getByRole('button', { name: 'Tutup butiran kad', exact: true }).click();
      expect(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await host.setViewportSize({ width: 844, height: 390 });
      await expect(board).toHaveAttribute('aria-busy', 'false');
      await expect.poll(async () => canvas.evaluate((element: HTMLCanvasElement) => element.width / element.getBoundingClientRect().width)).toBeCloseTo(2, 1);
      expect(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await gameAction(host, 'Keluar');
      await expect(guest.locator('.results')).toBeVisible();
      expect(errors).toEqual([]);
      if (sdkWarnings.length) await test.info().attach('caught-colyseus-webkit-probe', { body: JSON.stringify(sdkWarnings), contentType: 'application/json' });
    } finally { await context.close(); await guestContext.close(); }
  });
}
