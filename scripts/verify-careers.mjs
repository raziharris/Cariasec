import { chromium, webkit, expect } from '@playwright/test';
import { readFileSync, mkdirSync } from 'node:fs';
import { careerDescriptions } from '../frontend/src/careerDescriptions.ts';
import { onboard } from './onboarding.mjs';

const base = process.env.LIVE_URL ?? 'http://127.0.0.1:3002/';
const cards = JSON.parse(readFileSync('shared/cards.json', 'utf8'));
const salaryLevels = JSON.parse(readFileSync('shared/salary-levels.json', 'utf8'));
const money = new Intl.NumberFormat('ms-MY');
mkdirSync('tmp/career-verification', { recursive: true });
for (const [engine, browserType] of [['chromium', chromium], ['webkit', webkit]]) {
  const browser = await browserType.launch();
  try {
    for (const language of ['ms', 'en']) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(base);
      await onboard(page, 'Career Check', language);
      await page.getByRole('button', { name: language === 'ms' ? 'Lihat RIASEC' : 'Explore RIASEC', exact: true }).click();
      for (const [index, family] of ['R', 'I', 'A', 'S', 'E', 'C'].entries()) {
        await page.locator('.family-tabs button').nth(index).click();
        for (const [cardIndex, card] of cards.filter(card => card.category === family).entries()) {
          await page.locator('.learning-cards .career-card').nth(cardIndex).click();
          await expect(page.getByTestId('career-description')).toHaveText(language === 'ms' ? card.description : careerDescriptions[card.id]);
          const levels = salaryLevels[card.id];
          for (const key of ['junior', 'senior', 'management']) {
            const row = page.getByTestId(`salary-${key}`);
            const level = levels[key];
            if (key === 'management' && !level) {
              await expect(row).toHaveCount(0);
            } else {
              const missing = levels.notApplicable ? (language === 'ms' ? 'Tidak berkenaan' : 'Not applicable') : (language === 'ms' ? 'Data belum tersedia' : 'Data not available');
              await expect(row).toContainText(level ? `RM${money.format(level.min)}–RM${money.format(level.max)}` : missing);
            }
          }
          await page.getByRole('button', { name: language === 'ms' ? 'Tutup butiran kad' : 'Close card details' }).click();
        }
      }
      await page.locator('.family-tabs button').first().click();
      for (const width of [320, 375, 390, 430]) {
        await page.setViewportSize({ width, height: 844 });
        await page.locator('.learning-cards .career-card').first().click();
        await expect(page.getByTestId('career-description')).toHaveText(language === 'ms' ? cards[0].description : careerDescriptions.R1);
        const fits = await page.locator('.card-detail').evaluate(el => el.scrollWidth <= el.clientWidth && el.getBoundingClientRect().left >= 0 && el.getBoundingClientRect().right <= innerWidth);
        expect(fits).toBe(true);
        await page.getByTestId('career-description').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `tmp/career-verification/${engine}-${language}-${width}.png` });
        await page.getByTestId('salary-levels').scrollIntoViewIfNeeded();
        await page.screenshot({ path: `tmp/career-verification/salary-${engine}-${language}-${width}.png` });
        expect(await page.locator('.card-detail').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
        await page.getByRole('button', { name: language === 'ms' ? 'Faham' : 'Got it', exact: true }).click();
        await expect(page.locator('.card-detail')).toHaveCount(0);
      }
      expect(errors).toEqual([]);
      await context.close();
      console.log(`${engine} ${language}: all 36 descriptions, salary levels and 320/375/390/430px dialogs passed`);
    }
  } finally { await browser.close(); }
}
