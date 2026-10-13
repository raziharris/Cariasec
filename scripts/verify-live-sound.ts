import { chromium, expect } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { observeAudio, audioStarts, resetAudio } from '../tests/helpers/audioProbe';
import { onboard } from '../tests/helpers/onboard';
import { avatarUrl } from '../frontend/src/avatars';

const base = 'http://43.156.11.241/Cariasec/';
const browser = await chromium.launch();
const errors: string[] = [];
const failedRequests: string[] = [];
const assets: string[] = [];
try {
  for (const name of ['click', 'confirm', 'back', 'error', 'card', 'win']) {
    const response = await fetch(`${base}sounds/ui-${name}.wav`);
    expect(response.status).toBe(200);
    expect(Buffer.from(await response.arrayBuffer())).toEqual(readFileSync(`public/sounds/ui-${name}.wav`));
    assets.push(name);
  }
  for (const width of [1280, 375]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, ...(width < 400 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    await observeAudio(page);
    await page.goto(base);
    expect(await audioStarts(page)).toEqual([]);
    await page.locator('#player-name').click();
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.decoded.length)).toBe(6);
    await page.getByRole('button', { name: 'Teruskan', exact: true }).click();
    await expect.poll(async () => (await audioStarts(page)).at(-1)?.name).toBe('ui-error.wav');
    await onboard(page, 'Tencent Bunyi');
    await page.getByRole('button', { name: 'Tetapan', exact: true }).click();
    const slider = page.getByLabel('Volume kesan bunyi');
    await expect(slider).toHaveValue('45');
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole('button', { name: 'Cuba bunyi' }).click();
    await expect.poll(async () => (await audioStarts(page)).length).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.gains[0].gain.value)).toBeCloseTo(.45, 2);
    await slider.focus();
    await slider.press('Home');
    for (let i = 0; i < 20; i++) await slider.press('ArrowRight');
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole('button', { name: 'Cuba bunyi' }).click();
    await expect.poll(async () => (await audioStarts(page)).length).toBe(1);
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.gains[0].gain.value)).toBeCloseTo(.2, 2);
    await page.getByRole('button', { name: 'Senyapkan bunyi' }).click();
    await resetAudio(page);
    await page.getByRole('button', { name: 'Tutup', exact: true }).click();
    expect(await audioStarts(page)).toEqual([]);
    await page.reload();
    await page.getByRole('button', { name: 'Tetapan', exact: true }).click();
    await expect(slider).toHaveValue('20');
    await expect(page.getByRole('button', { name: 'Cuba bunyi' })).toBeDisabled();
    await page.getByRole('button', { name: 'Hidupkan bunyi' }).click();
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.gains[0].gain.value)).toBeCloseTo(.2, 2);
    await page.getByRole('button', { name: 'Cuba bunyi' }).click();
    await expect.poll(async () => (await audioStarts(page)).at(-1)?.name).toBe('ui-confirm.wav');
    await page.screenshot({ path: `docs/screenshots/tencent-sound-${width}.png`, fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await context.close();
  }
  const contexts = [await browser.newContext({ viewport: { width: 375, height: 844 }, isMobile: true, hasTouch: true }), await browser.newContext()];
  const [host, guest] = await Promise.all(contexts.map(c => c.newPage()));
  for (const page of [host, guest]) {
    page.on('pageerror', e => errors.push(e.message));
    page.on('requestfailed', r => failedRequests.push(`${r.failure()?.errorText}: ${r.url()}`));
    await observeAudio(page); await page.goto(base);
  }
  await host.getByRole('radio', { name: 'Pelajar perempuan', exact: true }).check();
  await onboard(host, 'Bunyi Hos');
  await host.getByRole('button', { name: 'Buka bilik' }).click();
  await host.getByRole('button', { name: 'Cipta bilik', exact: true }).click();
  const code = await host.getByTestId('room-code').innerText();
  await guest.getByRole('radio', { name: 'Robot', exact: true }).check();
  await onboard(guest, 'Bunyi Tetamu');
  await guest.getByRole('button', { name: 'Sertai', exact: true }).click();
  await guest.getByLabel('Kod bilik', { exact: true }).fill(code);
  await guest.getByRole('button', { name: 'Masuk bilik' }).click();
  for (const page of [host, guest]) {
    await expect(page.locator('.lobby-player').filter({ hasText: 'Bunyi Hos' }).locator('img')).toHaveAttribute('src', avatarUrl('student-girl'));
    await expect(page.locator('.lobby-player').filter({ hasText: 'Bunyi Tetamu' }).locator('img')).toHaveAttribute('src', avatarUrl('robot'));
  }
  for (const page of [host, guest]) await page.getByRole('button', { name: 'Saya sedia', exact: true }).click();
  await host.waitForTimeout(100);
  for (const page of [host, guest]) await resetAudio(page);
  await host.getByRole('button', { name: 'Mula', exact: true }).click();
  for (const page of [host, guest]) {
    await expect(page.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
    await expect(page.locator('.phaser-board canvas')).toBeVisible();
    await expect.poll(async () => (await audioStarts(page)).map(s => s.name)).toEqual(['ui-card.wav']);
  }
  await expect(host.locator('.request-dock')).toBeInViewport();
  await expect(host.locator('.collection-badge')).toHaveCount(6);
  await host.waitForTimeout(1600);
  const active = (await host.locator('.turn-message h2').innerText()) === 'Giliran anda!' ? host : guest;
  await active.locator('.family-choices button').first().click();
  await active.locator('.request-card').first().click();
  await active.waitForTimeout(100);
  for (const page of [host, guest]) await resetAudio(page);
  await active.getByRole('button', { name: 'Minta kad', exact: true }).click();
  for (const page of [host, guest]) {
    await expect(page.locator('.table-top')).toContainText('1 / 120');
    await expect.poll(async () => (await audioStarts(page)).map(s => s.name)).toEqual(['ui-card.wav']);
    expect(await page.evaluate(() => (window as any).__audioProbe.maxActive)).toBe(1);
  }
  await guest.getByRole('button', { name: 'Tetapan', exact: true }).click();
  await guest.getByLabel('Kurangkan animasi').check();
  await guest.getByRole('button', { name: 'Tutup', exact: true }).click();
  await guest.reload();
  await expect(guest.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
  await expect(guest.locator('html')).toHaveAttribute('data-motion', 'reduced');
  await expect(guest.locator('.target-choice').filter({ hasText: 'Bunyi Hos' }).locator('img')).toHaveAttribute('src', avatarUrl('student-girl'));
  expect(await audioStarts(guest)).toEqual([]);
  await host.screenshot({ path: 'docs/screenshots/tencent-ui-upgrade-375.png', fullPage: true });
  await host.getByRole('button', { name: 'Keluar', exact: true }).click();
  await expect(guest.locator('.results')).toBeVisible();
  await Promise.all(contexts.map(c => c.close()));
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
  const result = { date: new Date().toISOString(), url: base, assets, realWebAudioPlayback: true, desktopAndMobileEmulation: true, defaultVolume45: true, liveGain20: true, muteUnmute: true, preferencesPersist: true, phaserDealAndRequestAudio: true, twoPlayerMultiplayer: true, sharedChosenAvatars: true, stickyMobileAction: true, sixFamilyProgressBadges: true, motionPreferencePersists: true, actualPhaserFrameReady: true, reconnectSilent: true, noDuplicateOrOverlappingSources: true, errors, failedRequests, limitations: 'Chromium desktop and mobile emulation; physical speakers and actual Safari/iPhone not tested.' };
  writeFileSync('docs/tencent-sound-smoke.json', JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
