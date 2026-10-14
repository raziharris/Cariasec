export async function gameAction(page, name) {
  if (await page.locator('.game-menu-trigger').isVisible() && !await page.locator('.game-menu').isVisible()) await page.locator('.game-menu-trigger').click();
  await page.getByRole('button', { name, exact: true }).click();
}
export async function selectLanguage(page, language) {
  if (!await page.locator('.language-switch').isVisible()) await page.locator('.game-menu-trigger').click();
  await page.locator('.language-switch').selectOption(language);
  if (await page.locator('.game-menu').isVisible()) await page.locator('.game-menu .close').click();
}
export async function prepareRequest(page) {
  if (await page.locator('.target-choices').isVisible()) await page.locator('.target-choice:enabled').first().click();
  if (await page.locator('.family-choices').isVisible()) await page.locator('.family-choices button:enabled').first().click();
  if (await page.locator('.request-card-choices').isVisible()) await page.locator('.request-card').first().click();
}
