import { expect, type Page } from "@playwright/test";
export async function onboard(page: Page, name = "Pemain Ujian") {
  await expect(page.locator("#player-name")).toBeVisible();
  await page.locator("#player-name").fill(name);
  await page.getByRole("radio", { name: "Bahasa Malaysia" }).check();
  await page.getByRole("button", { name: "Teruskan", exact: true }).click();
  await expect(page.locator(".welcome-screen")).toHaveCount(0);
}
