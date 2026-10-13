import { test, expect, type Page } from '@playwright/test';
import { onboard } from '../helpers/onboard';

const url = process.env.LIVE_URL ?? '/';
async function createRoom(page: Page) {
  await page.goto(url);
  await onboard(page, 'Copy Test');
  await page.getByRole('button', { name: 'Buka bilik', exact: true }).click();
  await page.getByRole('button', { name: 'Cipta bilik', exact: true }).click();
  return page.getByTestId('room-code').innerText();
}
async function pastedCode(page: Page) {
  // Paste from the real browser clipboard rather than trusting the success icon.
  await page.evaluate(() => {
    const field = document.createElement('textarea');
    field.id = 'clipboard-paste-probe';
    document.body.appendChild(field);
  });
  const field = page.locator('#clipboard-paste-probe');
  await field.focus();
  await field.press('Control+V');
  const value = await field.inputValue();
  await field.evaluate(element => element.remove());
  return value;
}

for (const width of [1280, 375]) {
  test(`room code really copies without Clipboard API at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, ...(width < 400 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined }));
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    try {
      const code = await createRoom(page);
      for (const button of [page.locator('.room-code'), page.locator('.lobby-intro .secondary')]) {
        await button.click();
        await expect(page.locator('.copy-feedback')).toHaveText('Kod disalin');
        await expect(button).toBeFocused();
        expect(await pastedCode(page)).toBe(code);
        await expect(page.locator('#manual-room-code')).toHaveCount(0);
        await expect(page.locator('textarea')).toHaveCount(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.getByRole('button', { name: 'Keluar', exact: true }).click();
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}

test('secure Clipboard API writes the exact code', async ({ browser }) => {
  test.skip(!!process.env.LIVE_URL, 'Current live origin uses HTTP; secure API checked locally.');
  const context = await browser.newContext({ permissions: ['clipboard-read', 'clipboard-write'] });
  const page = await context.newPage();
  try {
    const code = await createRoom(page);
    expect(await page.evaluate(() => isSecureContext)).toBe(true);
    await page.locator('.room-code').click();
    await expect(page.locator('.copy-feedback')).toHaveText('Kod disalin');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(code);
    await page.getByRole('button', { name: 'Keluar', exact: true }).click();
  } finally { await context.close(); }
});

test('denied modern API falls back to real selection copy', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: () => Promise.reject(new DOMException('Denied', 'NotAllowedError')) },
  }));
  const code = await createRoom(page);
  await page.locator('.room-code').click();
  await expect(page.locator('.copy-feedback')).toHaveText('Kod disalin');
  expect(await pastedCode(page)).toBe(code);
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
});

test('blocked clipboard shows selectable code, never false success', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    document.execCommand = () => false;
  });
  const code = await createRoom(page);
  await page.locator('.room-code').click();
  await expect(page.locator('.copy-feedback')).toHaveCount(0);
  const field = page.getByLabel('KOD BILIK', { exact: true });
  await expect(field).toHaveValue(code);
  await expect(field).toBeFocused();
  expect(await field.evaluate((input: HTMLInputElement) => input.selectionEnd! - input.selectionStart!)).toBe(code.length);
  await expect(page.locator('.manual-copy')).toContainText('Browser menyekat salinan automatik');
  await page.getByRole('button', { name: 'Keluar', exact: true }).click();
});
