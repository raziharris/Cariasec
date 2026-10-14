import { gameAction } from '../helpers/gameUi';
import { test, expect } from '@playwright/test';
import { onboard } from '../helpers/onboard';

test('touch card flow without characters, rendered Phaser board and motion settings', async ({ browser }) => {
  const hostContext = await browser.newContext({ viewport: { width: 375, height: 844 }, isMobile: true, hasTouch: true });
  const guestContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const host = await hostContext.newPage(), guest = await guestContext.newPage();
  const errors: string[] = [];
  let boardImports = 0;
  await host.route('**/frontend/src/components/PhaserBoard.tsx*', async route => {
    boardImports++;
    if (boardImports === 1) await route.abort('internetdisconnected');
    else await route.continue();
  });
  for (const p of [host, guest]) p.on('pageerror', e => errors.push(e.message));
  try {
    await host.goto('/');
    await expect(host.locator('.avatar-picker, .character-avatar')).toHaveCount(0);
    await expect(host.getByText('Pilih watak anda', { exact: true })).toHaveCount(0);
    await onboard(host, 'Aina');
    await host.getByRole('button', { name: 'Buka bilik' }).click();
    await host.getByRole('button', { name: 'Cipta bilik', exact: true }).click();
    const code = await host.getByTestId('room-code').innerText();
    await guest.goto('/');
    await expect(guest.locator('.avatar-picker, .character-avatar')).toHaveCount(0);
    await onboard(guest, 'Razi');
    await guest.getByRole('button', { name: 'Sertai', exact: true }).click();
    await guest.getByLabel('Kod bilik', { exact: true }).fill(code);
    await guest.getByRole('button', { name: 'Masuk bilik' }).click();
    await expect(guest.locator('.lobby-player').filter({ hasText: 'Aina' }).locator('.avatar')).toHaveText('A');
    await expect(host.locator('.lobby-player').filter({ hasText: 'Razi' }).locator('.avatar')).toHaveText('R');
    await expect(host.locator('.lobby-player img')).toHaveCount(0);
    for (const p of [host, guest]) await p.getByRole('button', { name: 'Saya sedia', exact: true }).click();
    await host.getByRole('button', { name: 'Mula', exact: true }).click();
    for (const p of [host, guest]) {
      await expect(p.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
      await expect(p.locator('.board-loading')).toHaveCount(0);
      await expect(p.locator('.phaser-board canvas')).toBeVisible();
      await expect(p.locator('.collection-badge')).toHaveCount(6);
      expect(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
    expect(boardImports).toBeGreaterThan(1);
    await expect(host.locator('.request-dock')).toBeInViewport();
    await expect(host.getByTestId('advanced-selection')).not.toHaveAttribute('open', '');
    await host.getByRole('button', { name: 'Pilih Razi', exact: true }).click();
    await host.locator('.family-choices button').last().click();
    const chosen = host.locator('.request-card').last();
    await chosen.click();
    await expect(chosen).toHaveAttribute('aria-pressed', 'true');
    const title = await chosen.locator('b').innerText();
    await expect(host.locator('.request-dock strong')).toContainText(title);
    await host.locator('.card-preview-button').last().click();
    await expect(host.getByRole('dialog')).toBeVisible();
    await host.getByRole('button', { name: 'Tutup butiran kad' }).click();
    await host.getByRole('button', { name: 'Minta kad', exact: true }).click();
    for (const p of [host, guest]) await expect(p.locator('.table-top')).toContainText('1 / 120');
    await host.waitForTimeout(1600);
    await host.screenshot({ path: 'docs/screenshots/ui-upgrade-game-375.png', fullPage: true });
    await guest.screenshot({ path: 'docs/screenshots/ui-upgrade-game-desktop.png', fullPage: true });
    await gameAction(host, 'Tetapan');
    await expect(host.locator('.avatar-picker, .character-avatar')).toHaveCount(0);
    await host.getByLabel('Kurangkan animasi').check();
    await expect(host.getByRole('dialog')).toHaveCount(1);
    await expect(host.getByRole('dialog', { name: 'Butiran kad' })).toHaveCount(0);
    await host.getByRole('button', { name: 'Tutup', exact: true }).click();
    await host.reload();
    await expect(host.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
    await expect(host.locator('html')).toHaveAttribute('data-motion', 'reduced');
    await expect(guest.locator('.target-choice').filter({ hasText: 'Aina' }).locator('.player-mark')).toHaveText('A');
    await gameAction(host, 'Tetapan');
    await expect(host.getByLabel('Kurangkan animasi')).toBeChecked();
    await host.getByRole('button', { name: 'Tutup', exact: true }).click();
    await gameAction(host, 'Keluar');
    await expect(guest.locator('.results')).toBeVisible();
    expect(errors).toEqual([]);
  } finally { await hostContext.close(); await guestContext.close(); }
});
