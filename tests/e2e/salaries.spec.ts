import { test, expect } from "@playwright/test";
import { onboard } from "../helpers/onboard";
import { readFileSync } from "node:fs";

const cards = JSON.parse(readFileSync("shared/cards.json", "utf8")) as {
  id: string;
  category: string;
}[];
const salaries = JSON.parse(readFileSync("shared/salaries.json", "utf8")) as Record<
  string,
  { min: number; max: number }
>;
const ringgit = new Intl.NumberFormat("ms-MY");

test("all 36 career details show their Malaysian range on a narrow phone", async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 320, height: 700 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto("/");
  await onboard(page, "Aina");
  await page.getByRole("button", { name: "Lihat RIASEC" }).click();
  for (const [index, family] of ["R", "I", "A", "S", "E", "C"].entries()) {
    await page.locator(".family-tabs button").nth(index).click();
    const familyCards = cards.filter((card) => card.category === family);
    await expect(page.locator(".learning-cards .career-card")).toHaveCount(6);
    for (const [cardIndex, card] of familyCards.entries()) {
      await page.locator(".learning-cards .career-card").nth(cardIndex).click();
      const band = page.getByTestId("salary-band");
      const salary = salaries[card.id];
      await expect(band).toContainText(
        `RM${ringgit.format(salary.min)}–RM${ringgit.format(salary.max)}`,
      );
      await expect(band).toContainText("Malaysia · sebulan");
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      ).toBe(true);
      await page.getByRole("button", { name: "Tutup butiran kad" }).click();
    }
  }
  await page.locator(".language-switch").selectOption("en");
  await page.locator(".learning-cards .career-card").first().click();
  await expect(page.getByTestId("salary-band")).toContainText(
    "Estimated monthly salary",
  );
  await expect(page.getByTestId("salary-band")).toContainText(
    "Malaysia · per month",
  );
  await context.close();
});
