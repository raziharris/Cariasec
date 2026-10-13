import { test, expect } from '@playwright/test';
import { onboard } from '../helpers/onboard';
import AxeBuilder from '@axe-core/playwright';
test.use({ browserName: process.env.CHAT_BROWSER === 'webkit' ? 'webkit' : 'chromium' });

test('minimal room chat: shared messages, no new cooldown, history, isolation and gameplay on iPhone widths', async ({ browser }) => {
  const hostContext = await browser.newContext({ viewport: { width: 375, height: 844 }, isMobile: true, hasTouch: true });
  const guestContext = await browser.newContext();
  const otherContext = await browser.newContext();
  const host = await hostContext.newPage(), guest = await guestContext.newPage(), other = await otherContext.newPage();
  const errors: string[] = [];
  const dialogs: string[] = [];
  const sdkWarnings: string[] = [];
  for (const page of [host, guest, other]) {
    page.on('pageerror', error => {
      // WebKit reports Colyseus's caught Node-signature probe; retain the
      // known diagnostic separately, as in the iPhone card regression.
      if (browser.browserType().name() === 'webkit' && error.message === "Wrong protocol for WebSocket '[object Object]'") sdkWarnings.push(error.message);
      else errors.push(error.message);
    });
    page.on('dialog', dialog => { dialogs.push(dialog.message()); void dialog.dismiss(); });
  }
  try {
    for (const page of [host, guest, other]) await page.goto(process.env.LIVE_URL ?? '/');
    await onboard(host, 'Aina'); await onboard(guest, 'Razi'); await onboard(other, 'Other');
    for (const page of [host, other]) {
      await page.getByRole('button', { name: 'Buka bilik', exact: true }).click();
      await page.getByRole('button', { name: 'Cipta bilik', exact: true }).click();
    }
    const code = await host.getByTestId('room-code').innerText();
    await guest.getByRole('button', { name: 'Sertai', exact: true }).click();
    await guest.getByLabel('Kod bilik', { exact: true }).fill(code);
    await guest.getByRole('button', { name: 'Masuk bilik', exact: true }).click();
    await expect(host.locator('.chat-toggle')).toHaveAttribute('aria-expanded', 'false');
    await host.locator('.chat-toggle').click();
    await other.locator('.chat-toggle').click();
    await expect(host.getByRole('button', { name: 'Hantar mesej' })).toBeDisabled();
    await host.getByLabel('Tulis mesej', { exact: true }).fill('Hai Razi 👋');
    await host.getByLabel('Tulis mesej', { exact: true }).press('Enter');
    await expect(host.locator('.chat-message')).toHaveCount(1);
    await expect(guest.locator('.chat-unread')).toHaveText('1');
    await guest.locator('.chat-toggle').click();
    await expect(guest.locator('.chat-message')).toHaveCount(1);
    await expect(guest.locator('.chat-message header b')).toHaveText('Aina');
    await expect(other.locator('.chat-message')).toHaveCount(0);
    const literal = '<img src=x onerror=alert(1)> 👋';
    await guest.getByLabel('Tulis mesej', { exact: true }).fill(literal);
    await guest.getByRole('button', { name: 'Hantar mesej' }).click();
    await expect(host.locator('.chat-message p').last()).toHaveText(literal);
    await expect(host.locator('.room-chat img')).toHaveCount(0);
    for (let i = 0; i < 8; i++) {
      await guest.getByLabel('Tulis mesej', { exact: true }).fill(`Spam ${i}`);
      await guest.getByRole('button', { name: 'Hantar mesej' }).click();
      await expect(guest.getByLabel('Tulis mesej', { exact: true })).toHaveValue('');
    }
    await expect(host.locator('.chat-message')).toHaveCount(10);
    await expect(other.locator('.chat-message')).toHaveCount(0);
    for (const width of [320, 375, 390, 430]) {
      await host.setViewportSize({ width, height: 844 });
      await expect(host.getByLabel('Tulis mesej', { exact: true })).toHaveCSS('font-size', '16px');
      expect(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    await host.screenshot({ path: `docs/screenshots/room-chat-iphone-${browser.browserType().name()}.png`, fullPage: true });
    const audit = await new AxeBuilder({ page: host }).include('.room-chat').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(audit.violations).toEqual([]);
    await guest.reload();
    await expect(guest.getByTestId('room-code')).toHaveText(code);
    await guest.locator('.chat-toggle').click();
    await expect(guest.locator('.chat-message')).toHaveCount(10);
    for (const page of [host, guest]) await page.getByRole('button', { name: 'Saya sedia', exact: true }).click();
    await host.getByRole('button', { name: 'Mula', exact: true }).click();
    for (const page of [host, guest]) await expect(page.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
    await host.getByLabel('Tulis mesej', { exact: true }).fill('Jom main!');
    await host.getByRole('button', { name: 'Hantar mesej' }).click();
    await expect(guest.locator('.chat-message p').last()).toHaveText('Jom main!');
    for (const page of [host, guest]) await expect(page.locator('.table-top')).toContainText('0 / 120');
    await host.getByLabel('Tulis mesej', { exact: true }).fill('Draft offline');
    await hostContext.setOffline(true);
    await expect(host.getByRole('button', { name: 'Hantar mesej' })).toBeDisabled();
    await expect(host.getByLabel('Tulis mesej', { exact: true })).toHaveValue('Draft offline');
    await guest.getByLabel('Tulis mesej', { exact: true }).fill('Jumpa selepas reconnect');
    await guest.getByRole('button', { name: 'Hantar mesej' }).click();
    await hostContext.setOffline(false);
    await expect(host.locator('.chat-message p').last()).toHaveText('Jumpa selepas reconnect');
    await expect(host.getByLabel('Tulis mesej', { exact: true })).toHaveValue('Draft offline');
    await host.locator('.chat-toggle').click();
    await host.getByRole('button', { name: 'Minta kad', exact: true }).click();
    for (const page of [host, guest]) await expect(page.locator('.table-top')).toContainText('1 / 120');
    await guest.locator('.language-switch').selectOption('en');
    await expect(guest.locator('.chat-toggle')).toContainText('Room chat');
    await expect(guest.locator('.chat-message p').last()).toHaveText('Jumpa selepas reconnect');
    await host.getByRole('button', { name: 'Keluar', exact: true }).click();
    await expect(guest.locator('.results')).toBeVisible();
    await other.getByRole('button', { name: 'Keluar', exact: true }).click();
    expect(errors).toEqual([]); expect(dialogs).toEqual([]);
    if (sdkWarnings.length) await test.info().attach('caught-colyseus-webkit-probe', { body: JSON.stringify(sdkWarnings), contentType: 'application/json' });
  } finally { await hostContext.close(); await guestContext.close(); await otherContext.close(); }
});
