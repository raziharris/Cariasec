import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const base = process.env.LIVE_URL ?? "http://127.0.0.1:5173/";
async function noOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    )
    .toBe(true);
}
async function create(page: Page, name: string, beginner = false) {
  await page.goto(base);
  await page.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  await page.getByLabel("Nama panggilan").fill(name);
  if (beginner) await page.getByLabel("Mod permainan").selectOption("beginner");
  else
    await page
      .getByLabel("Format", { exact: true })
      .selectOption("three-round");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cipta bilik", exact: true })
    .click();
  await expect(page.getByTestId("room-code")).toBeVisible();
  return (await page.getByTestId("room-code").innerText()).trim();
}
async function join(page: Page, code: string, name: string) {
  await page.goto(`${base}?bilik=${code}`);
  await page.getByLabel("Nama panggilan").fill(name);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Masuk bilik", exact: true })
    .click();
  await expect(page.getByTestId("room-code")).toHaveText(code);
}
test("responsive home, tutorial, settings and optional career learning", async ({
  page,
}) => {
  await page.goto(base);
  for (const width of [320, 375, 390, 430, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
    await page.screenshot({
      path: `docs/screenshots/rentak-home-${width}.png`,
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "Cuba tutorial", exact: false })
    .click();
  await page.getByRole("button", { name: "I-3-1", exact: true }).click();
  await page
    .getByRole("button", { name: "Main & seterusnya", exact: false })
    .click();
  await page.getByRole("button", { name: "R-teduh", exact: true }).click();
  await page
    .getByRole("button", { name: "Main & seterusnya", exact: false })
    .click();
  await page.getByRole("button", { name: "I-3-1", exact: true }).click();
  await page.getByRole("button", { name: "I-4-1", exact: true }).click();
  await page
    .getByRole("button", { name: "Sedia bermain!", exact: false })
    .click();
  await page.getByRole("button", { name: "Tetapan", exact: true }).click();
  await page.getByLabel("Bahasa", { exact: true }).selectOption("en");
  await page.getByLabel("Reduced motion", { exact: true }).check();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Find your match. Make your move." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Explore RIASEC", exact: true })
    .first()
    .click();
  await expect(page.locator(".rt-careers article")).toHaveCount(6);
  const accessibility = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    accessibility.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});
for (const beginner of [false, true])
  test(`${beginner ? "Beginner" : "Normal"}: real two-browser round, private hands, responsive table, reconnect, chat and rematch`, async ({
    browser,
  }) => {
    test.setTimeout(360_000);
    const contexts = await Promise.all([
      browser.newContext(),
      browser.newContext(),
    ]);
    const pages = await Promise.all(contexts.map((c) => c.newPage()));
    const [a, b] = pages;
    const errors: string[] = [];
    for (const p of pages) p.on("pageerror", (e) => errors.push(e.message));
    try {
      const code = await create(a, `Hos ${beginner ? "B" : "N"}`, beginner);
      await join(b, code, `Rakan ${beginner ? "B" : "N"}`);
      await a
        .getByRole("button", { name: "Saya bersedia", exact: true })
        .click();
      await b
        .getByRole("button", { name: "Saya bersedia", exact: true })
        .click();
      await a
        .getByRole("button", { name: "Mulakan permainan", exact: false })
        .click();
      for (const p of pages) {
        await expect(p.locator(".rt-hand-card")).toHaveCount(7);
        await expect(p.locator(".rt-phaser canvas")).toBeVisible();
      }
      const handA = await a
        .locator("[data-card-id]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-card-id")),
        );
      const handB = await b
        .locator("[data-card-id]")
        .evaluateAll((nodes) =>
          nodes.map((n) => n.getAttribute("data-card-id")),
        );
      expect(handA.filter((id) => handB.includes(id))).toEqual([]);
      const a11y = await new AxeBuilder({ page: a })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
        .analyze();
      expect(
        a11y.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      ).toEqual([]);
      for (const width of [320, 375, 390, 430]) {
        await a.setViewportSize({ width, height: 900 });
        await noOverflow(a);
        await a.screenshot({
          path: `docs/screenshots/rentak-${beginner ? "beginner" : "normal"}-${width}.png`,
          fullPage: true,
        });
      }
      await a.reload();
      await expect(a.locator(".rt-hand-card")).toHaveCount(7);
      expect(
        await a
          .locator("[data-card-id]")
          .evaluateAll((nodes) =>
            nodes.map((n) => n.getAttribute("data-card-id")),
          ),
      ).toEqual(handA);
      await a.getByRole("button", { name: /Chat bilik/ }).click();
      await a.getByLabel("Tulis mesej", { exact: true }).fill("Jom Rentak!");
      await a
        .getByRole("button", { name: "Hantar mesej", exact: true })
        .click();
      await expect(a.getByText("Jom Rentak!", { exact: true })).toBeVisible();
      await a.getByRole("button", { name: "Tutup chat", exact: true }).click();
      await b.getByRole("button", { name: /Chat bilik/ }).click();
      await expect(b.getByText("Jom Rentak!", { exact: true })).toBeVisible();
      await b.getByRole("button", { name: "Tutup chat", exact: true }).click();
      let actions = 0,
        pairs = 0;
      for (let round = 1; round <= (beginner ? 1 : 3); round++) {
        let roundActions = 0;
        while (
          !(await a.locator(".rt-results").count()) &&
          roundActions++ < 500
        ) {
          const actor = (await a.locator(".your-turn").count())
            ? a
            : (await b.locator(".your-turn").count())
              ? b
              : null;
          if (!actor) {
            await a.waitForTimeout(100);
            continue;
          }
          const legal = actor.locator("[data-card-id][data-legal=true]");
          let didPair = false;
          if (!beginner) {
            const rentak = actor.getByRole("button", { name: /Rentak 1\/1/ });
            if ((await rentak.count()) && (await rentak.isEnabled())) {
              const all = await actor
                .locator("[data-card-id]")
                .evaluateAll((nodes) =>
                  nodes.map((n) => ({
                    id: n.getAttribute("data-card-id")!,
                    legal: n.getAttribute("data-legal") === "true",
                  })),
                );
              const first = all.find(
                (c) =>
                  c.legal &&
                  /^[RIASEC]-[1-6]-/.test(c.id) &&
                  all.some(
                    (other) =>
                      other.id[0] === c.id[0] &&
                      Math.abs(Number(other.id[2]) - Number(c.id[2])) === 1,
                  ),
              );
              const second =
                first &&
                all.find(
                  (c) =>
                    c.id[0] === first.id[0] &&
                    Math.abs(Number(c.id[2]) - Number(first.id[2])) === 1,
                );
              if (first && second) {
                await rentak.click();
                await actor.locator(`[data-card-id="${first.id}"]`).click();
                await actor.locator(`[data-card-id="${second.id}"]`).click();
                await actor
                  .getByRole("button", { name: "Rentak!", exact: false })
                  .click();
                didPair = true;
                pairs++;
              }
            }
          }
          if (!didPair) {
            if (await legal.count()) {
              await legal.first().click();
              if (await actor.locator(".rt-colors").count())
                await actor.locator(".rt-colors button").first().click();
              await actor
                .getByRole("button", { name: "Main kad", exact: false })
                .click();
            } else {
              const pass = actor.getByRole("button", {
                name: "Simpan & tamat",
                exact: true,
              });
              if (await pass.count()) await pass.click();
              else
                await actor
                  .getByRole("button", { name: /^Ambil [12]$/ })
                  .click();
            }
          }
          actions++;
          await a.waitForTimeout(400);
        }
        await expect(a.locator(".rt-results")).toBeVisible();
        await expect(b.locator(".rt-results")).toBeVisible();
        expect(await a.locator(".rt-results h1").innerText()).toEqual(
          await b.locator(".rt-results h1").innerText(),
        );
        await a.screenshot({
          path: `docs/screenshots/rentak-${beginner ? "beginner" : "party"}-round-${round}.png`,
          fullPage: true,
        });
        await a
          .getByRole("button", {
            name: beginner || round === 3 ? "Main lagi" : "Pusingan seterusnya",
            exact: false,
          })
          .click();
        await expect(
          a.getByRole("button", { name: "Mulakan permainan", exact: false }),
        ).toBeDisabled();
        await expect(
          b.getByRole("button", { name: "Saya bersedia", exact: true }),
        ).toBeVisible();
        if (!beginner && round < 3) {
          await a
            .getByRole("button", { name: "Saya bersedia", exact: true })
            .click();
          await b
            .getByRole("button", { name: "Saya bersedia", exact: true })
            .click();
          await a
            .getByRole("button", { name: "Mulakan permainan", exact: false })
            .click();
          await expect(a.locator(".rt-hand-card")).toHaveCount(7);
        }
      }
      console.log(JSON.stringify({ pairs }));
      await a
        .getByRole("button", { name: "Keluar bilik", exact: true })
        .click();
      await b
        .getByRole("button", { name: "Keluar bilik", exact: true })
        .click();
      expect(errors).toEqual([]);
      console.log(
        JSON.stringify({
          mode: beginner ? "beginner" : "normal",
          actions,
          code,
          complete: true,
        }),
      );
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }
  });
