import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { onboard } from "../helpers/onboard";

test("name and language gate, validation, preferences and both mobile languages", async ({
  browser,
}) => {
  for (const width of [320, 375, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.locator(".hero")).toHaveCount(0);
    await page.getByRole("button", { name: "Teruskan", exact: true }).click();
    await expect(page.getByRole("alert")).toBeVisible();
    await page.locator("#player-name").fill("   ");
    await page.getByRole("button", { name: "Teruskan", exact: true }).click();
    await expect(page.locator(".welcome-screen")).toBeVisible();
    await page.getByRole("radio", { name: "English", exact: true }).check();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
    await expect(page.getByRole("alert")).toContainText("2–20 characters");
    await page.getByLabel("Your name").fill("  Mula  ");
    await page.screenshot({
      path: `docs/screenshots/welcome-en-${width}.png`,
      fullPage: true,
    });
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      audit.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
    await page.getByRole("button", { name: "Continue", exact: true }).click();
    await expect(page.locator("h1")).toContainText("Collect.");
    for (const language of ["en", "ms"]) {
      await page.locator(".language-switch").selectOption(language);
      await expect(page.locator("html")).toHaveAttribute("lang", language);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    await page.locator(".language-switch").selectOption("en");
    await page.getByRole("button", { name: "New room", exact: true }).click();
    await expect(page.getByLabel("Nickname")).toHaveValue("Mula");
    await page.getByRole("button", { name: "Close", exact: true }).click();
    await page.reload();
    await expect(page.locator("h1")).toContainText("Collect.");
    await expect(page.locator(".welcome-screen")).toHaveCount(0);
    await page.screenshot({
      path: `docs/screenshots/home-en-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
    // New tab/new launch asks again, with the saved name and language prefilled.
    const reopened = await context.newPage();
    await reopened.goto("/");
    await expect(reopened.getByLabel("Your name")).toHaveValue("Mula");
    await expect(
      reopened.getByRole("radio", { name: "English", exact: true }),
    ).toBeChecked();
    await context.close();
  }
});

test("mixed-language players share one game, translate errors, cards and results without changing identities", async ({
  browser,
}) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext({
    viewport: { width: 375, height: 844 },
    reducedMotion: "reduce",
  });
  const host = await hostContext.newPage(),
    guest = await guestContext.newPage();
  const errors: string[] = [];
  for (const page of [host, guest])
    page.on("pageerror", (e) => errors.push(e.message));
  await host.goto("/");
  await onboard(host, "Mula");
  await host.getByRole("button", { name: "Buka bilik" }).click();
  await expect(host.getByLabel("Nama panggilan")).toHaveValue("Mula");
  await host.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  const code = await host.getByTestId("room-code").innerText();
  await guest.goto("/");
  await guest.getByRole("radio", { name: "English", exact: true }).check();
  await guest.getByLabel("Your name").fill("Mula");
  await guest.getByRole("button", { name: "Continue", exact: true }).click();
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await guest.getByLabel("Room code", { exact: true }).fill(code);
  await guest.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(guest.getByRole("alert")).toContainText("That name is taken");
  await guest.getByLabel("Nickname").fill("Menang");
  await guest.getByRole("button", { name: "Join room", exact: true }).click();
  await expect(guest.locator(".lobby-player").first()).toContainText("Mula");
  await expect(guest.locator(".lobby-card-fan .card-title")).toHaveText([
    "Musician",
    "Politician",
  ]);
  await guest.screenshot({
    path: "docs/screenshots/lobby-en-375.png",
    fullPage: true,
  });
  await host.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await guest.getByRole("button", { name: "I'm ready", exact: true }).click();
  await host.getByRole("button", { name: "Mula", exact: true }).click();
  await expect(guest.locator(".turn-message h2")).toHaveText("Mula's turn");
  await expect(guest.locator(".table-event")).toContainText("Game on!");
  await expect(host.locator(".table-event")).toContainText(
    "Permainan bermula!",
  );
  const guestHand = await guest
    .locator(".hand-scroll .card-title")
    .allTextContents();
  await guest.reload();
  await expect(guest.locator(".hand-scroll .card-title")).toHaveText(guestHand);
  await expect(guest.getByTestId("room-code")).toHaveText(code);
  await expect(guest.locator(".table-event")).toContainText("Menang is back.");
  await guest.locator(".language-switch").selectOption("ms");
  await expect(guest.locator(".turn-message h2")).toHaveText("Giliran Mula");
  await expect(guest.getByTestId("room-code")).toHaveText(code);
  await guest.locator(".language-switch").selectOption("en");
  await expect(guest.locator(".hand-scroll .card-title")).toHaveText(guestHand);
  await guest.screenshot({
    path: "docs/screenshots/board-en-375.png",
    fullPage: true,
    animations: "disabled",
  });
  expect(
    await guest.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page: guest })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      targets: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  await guest.getByRole("button", { name: "How to play", exact: true }).click();
  await expect(guest.locator(".rules")).toContainText("Complete a family");
  await guest.getByRole("button", { name: "CARIASEC home" }).click();
  await guest.getByRole("button", { name: "Explore RIASEC" }).click();
  await expect(guest.locator(".learning-cards .card-title").first()).toHaveText(
    "Engineer",
  );
  await guest
    .getByRole("tab", { name: "I · Investigative", exact: true })
    .click();
  await expect(guest.locator(".learning-cards .card-title")).toHaveText([
    "Lawyer",
    "Scientist",
    "Programmer",
    "Pharmacist",
    "Surgeon",
    "Psychiatrist",
  ]);
  await guest.getByRole("button", { name: "Room", exact: true }).click();
  await host.getByRole("button", { name: "Keluar", exact: true }).click();
  await expect(guest.locator(".results")).toContainText(
    "Mula left the game. Round cancelled with no winner.",
  );
  await expect(guest.locator(".results h1")).toHaveText("See you next round.");
  expect(errors).toEqual([]);
  await hostContext.close();
  await guestContext.close();
});

test("invalid saved preferences cannot bypass the welcome screen", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("cariasec-profile", '{"name":" ","language":"fr"}');
    sessionStorage.setItem("cariasec-onboarded", "yes");
  });
  await page.goto("/");
  await expect(page.locator(".welcome-screen")).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("lang", "ms");
});
