import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { onboard } from '../helpers/onboard';
import { gameAction, selectLanguage } from '../helpers/gameUi';

test.use({ browserName: process.env.FOCUS_BROWSER === 'webkit' ? 'webkit' : 'chromium' });

test('quiet game UI: progressive requests, compact collections, chat and settings at iPhone widths', async ({ browser }) => {
  const contexts = await Promise.all([375, 1280].map(width => browser.newContext({ viewport: { width, height: 844 }, hasTouch: true, isMobile: width < 720 })));
  const [host, guest] = await Promise.all(contexts.map(context => context.newPage()));
  const errors: string[] = [], sdkWarnings: string[] = [];
  for (const page of [host, guest]) page.on('pageerror', error => {
    if (browser.browserType().name() === 'webkit' && error.message === "Wrong protocol for WebSocket '[object Object]'") sdkWarnings.push(error.message);
    else errors.push(error.message);
  });
  try {
    for (const page of [host, guest]) await page.goto(process.env.LIVE_URL ?? '/');
    await onboard(host, 'Aina'); await onboard(guest, 'Razi');
    await host.getByRole('button', { name: 'Buka bilik', exact: true }).click();
    await host.getByRole('button', { name: 'Cipta bilik', exact: true }).click();
    const code = await host.getByTestId('room-code').innerText();
    await guest.getByRole('button', { name: 'Sertai', exact: true }).click();
    await guest.getByLabel('Kod bilik', { exact: true }).fill(code);
    await guest.getByRole('button', { name: 'Masuk bilik', exact: true }).click();
    for (const page of [host, guest]) await page.getByRole('button', { name: 'Saya sedia', exact: true }).click();
    await host.getByRole('button', { name: 'Mula', exact: true }).click();
    for (const page of [host, guest]) {
      await expect(page.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
      await expect(page.locator('.site-header,.room-toolbar')).toHaveCount(0);
      await expect(page.locator('.turn-message h2')).toHaveCount(1);
      await expect(page.locator('.collection-badge')).toHaveCount(6);
      await expect(page.getByTestId('room-code')).toHaveText(code);
      await expect(page.locator('.tap-selection')).toHaveAttribute('data-step', '1');
    }
    await expect(host.getByRole('button', { name: 'Minta kad', exact: true })).toBeDisabled();
    for (const step of await host.locator('.request-steps button').all()) await expect(step).toBeVisible();
    const pageAudit = await new AxeBuilder({ page: host }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(pageAudit.violations).toEqual([]);
    const boardHeight = await host.locator('.phaser-game-table').evaluate(element => element.clientHeight);
    for (const width of [320, 375, 390, 430]) {
      await host.setViewportSize({ width, height: 844 });
      await host.evaluate(() => scrollTo(0, 0));
      await expect(host.locator('.focus-header')).toBeInViewport();
      await expect(host.locator('.chat-toggle')).toBeInViewport();
      await expect(host.locator('.request-dock')).toBeInViewport();
      expect(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const badges = await host.locator('.collection-badge').evaluateAll(nodes => nodes.map(node => node.getBoundingClientRect().top));
      expect(new Set(badges).size).toBe(1);
      await host.screenshot({ path: `docs/screenshots/focus-game-${width}-${browser.browserType().name()}.png`, fullPage: true });
    }
    await host.setViewportSize({ width: 375, height: 844 });
    await host.getByRole('button', { name: 'Pilih Razi', exact: true }).click();
    await expect(host.locator('.target-choices,.request-card-choices')).toHaveCount(0);
    await expect(host.locator('.tap-selection')).toHaveAttribute('data-step', '2');
    await host.locator('.family-choices button').first().click();
    await expect(host.locator('.target-choices,.family-choices')).toHaveCount(0);
    await expect(host.locator('.tap-selection')).toHaveAttribute('data-step', '3');
    await expect(host.getByRole('button', { name: 'Minta kad', exact: true })).toBeDisabled();
    await host.locator('.request-card').first().click();
    await expect(host.getByRole('button', { name: 'Minta kad', exact: true })).toBeEnabled();
    await host.screenshot({ path: `docs/screenshots/focus-request-375-${browser.browserType().name()}.png`, fullPage: true });
    await host.locator('.tap-selection').evaluate(element => scrollTo(0, scrollY + element.getBoundingClientRect().top - 80));
    await host.screenshot({ path: `docs/screenshots/focus-request-viewport-${browser.browserType().name()}.png` });
    await expect(host.locator('.phaser-game-table')).toHaveJSProperty('clientHeight', boardHeight);
    await host.locator('.collection-badge').first().click();
    await expect(host.locator('.collection-detail')).toBeVisible();
    await host.getByRole('button', { name: 'Tutup koleksi' }).click();
    await guest.locator('.chat-toggle').click();
    await guest.getByLabel('Tulis mesej', { exact: true }).fill('Jom main');
    await guest.getByRole('button', { name: 'Hantar mesej', exact: true }).click();
    await expect(host.locator('.chat-unread')).toHaveText('1');
    await guest.getByRole('button', { name: 'Tutup chat' }).click();
    await host.locator('.chat-toggle').click();
    await expect(host.getByRole('dialog', { name: 'Chat bilik', exact: true })).toBeVisible();
    await host.screenshot({ path: `docs/screenshots/focus-chat-375-${browser.browserType().name()}.png` });
    await expect(host.locator('.chat-message p')).toHaveText('Jom main');
    const chatAudit = await new AxeBuilder({ page: host }).include('.chat-dialog').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(chatAudit.violations).toEqual([]);
    await host.keyboard.press('Escape');
    await expect(host.locator('.chat-toggle')).toBeFocused();
    await expect(host.locator('.chat-unread')).toHaveCount(0);
    await host.locator('.game-menu-trigger').click();
    await expect(host.getByRole('dialog', { name: 'Menu permainan' })).toBeVisible();
    await host.screenshot({ path: `docs/screenshots/focus-menu-375-${browser.browserType().name()}.png` });
    const menuAudit = await new AxeBuilder({ page: host }).include('.game-menu').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(menuAudit.violations).toEqual([]);
    await host.keyboard.press('Escape');
    await expect(host.locator('.game-menu-trigger')).toBeFocused();
    await gameAction(host, 'Tetapan');
    await expect(host.getByLabel('Volume kesan bunyi')).toHaveValue('45');
    await host.getByRole('button', { name: 'Tutup', exact: true }).click();
    await selectLanguage(host, 'en');
    await expect(host.locator('.request-steps')).toContainText('Friend');
    await selectLanguage(host, 'ms');
    await host.getByRole('button', { name: 'Minta kad', exact: true }).click();
    for (const page of [host, guest]) await expect(page.locator('.table-top')).toContainText('1 / 120');
    await expect(host.locator('.tap-selection')).toHaveAttribute('data-step', '1');
    await guest.screenshot({ path: `docs/screenshots/focus-game-desktop-${browser.browserType().name()}.png`, fullPage: true });
    await gameAction(host, 'Keluar');
    await expect(guest.locator('.results')).toBeVisible();
    expect(errors).toEqual([]);
    if (sdkWarnings.length) await test.info().attach('caught-colyseus-webkit-probe', { body: JSON.stringify(sdkWarnings), contentType: 'application/json' });
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
