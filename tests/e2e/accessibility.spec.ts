import { onboard } from "../helpers/onboard";
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
test("accessible navigation, keyboard dialog and six-player board", async ({
  browser,
}) => {
  const contexts = await Promise.all(
    Array.from({ length: 6 }, () => browser.newContext()),
  );
  const pages = await Promise.all(contexts.map((c) => c.newPage()));
  const [host, ...others] = pages;
  const audit = async () => {
    for (const selector of [".modal-backdrop", ".turn-message", ".hero-art"])
      if (await host.locator(selector).count())
        await expect(host.locator(selector)).toHaveCSS("opacity", "1");
    const result = await new AxeBuilder({ page: host })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    expect(
      result.violations.map((v) => ({
        id: v.id,
        targets: v.nodes.map((n) => n.target),
      })),
    ).toEqual([]);
  };
  await host.goto("/");
  await onboard(host);
  await expect(host.locator("h1")).toContainText("Kumpul.");
  await host.evaluate(() => document.fonts.ready);
  await audit();
  await host.getByRole("button", { name: "Lihat RIASEC" }).click();
  await audit();
  await host.getByRole("button", { name: "Cara main", exact: true }).click();
  await audit();
  await host.getByRole("button", { name: "Laman utama CARIASEC" }).click();
  await host.getByRole("button", { name: "Buka bilik" }).click();
  await expect(host.getByLabel("Nama panggilan")).toBeFocused();
  await host.keyboard.press("Escape");
  await expect(host.getByRole("dialog")).toHaveCount(0);
  await expect(host.getByRole("button", { name: "Buka bilik" })).toBeFocused();
  await host.getByRole("button", { name: "Buka bilik" }).click();
  await audit();
  await host.getByLabel("Nama panggilan").fill("Aina");
  await host.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  const code = await host.getByTestId("room-code").innerText();
  for (let i = 0; i < others.length; i++) {
    const p = others[i];
    await p.goto("/");
    await onboard(p);
    await p.getByRole("button", { name: "Sertai", exact: true }).click();
    await p.getByLabel("Nama panggilan").fill(`Rakan ${i + 1}`);
    await p.getByLabel("Kod bilik", { exact: true }).fill(code);
    await p.getByRole("button", { name: "Masuk bilik" }).click();
    await p.getByRole("button", { name: "Saya sedia", exact: true }).click();
  }
  await expect(host.locator(".lobby-player")).toHaveCount(6);
  await audit();
  await host.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await host.getByRole("button", { name: "Mula", exact: true }).click();
  await expect(host.locator(".hand-scroll .career-card")).toHaveCount(5);
  await audit();
  await host.screenshot({
    path: "docs/screenshots/board-six-players.png",
    fullPage: true,
  });
  await expect(host.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
  await host.setViewportSize({ width: 320, height: 844 });
  await expect(host.locator('.request-dock')).toBeInViewport();
  expect(await host.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(host.locator('.target-choice')).toHaveCount(5);
  await audit();
  await host.screenshot({ path: 'docs/screenshots/ui-upgrade-six-players-320.png', fullPage: true });
  await host.setViewportSize({ width: 1280, height: 900 });
  await host.getByRole("button", { name: "RIASEC", exact: true }).click();
  for (const name of [
    "R · Realistik",
    "I · Investigatif",
    "A · Artistik",
    "S · Sosial",
    "E · Enterprising",
    "C · Konvensional",
  ]) {
    await host.getByRole("tab", { name, exact: true }).click();
    await expect(host.getByRole("tab", { name, exact: true })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  }
  await host.getByRole("button", { name: "Bilik", exact: true }).click();
  await host.getByRole("button", { name: "Keluar", exact: true }).click();
  for (const c of contexts) await c.close();
});
