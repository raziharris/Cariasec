import { onboard } from "../helpers/onboard";
import { observeAudio, audioStarts } from "../helpers/audioProbe";
import { test, expect, type Page } from "@playwright/test";
test("two independent browsers play a full round, recover refresh/network, verify winner and rematch", async ({
  browser,
}) => {
  const ca = await browser.newContext(),
    cb = await browser.newContext();
  const a = await ca.newPage(),
    b = await cb.newPage();
  const errors: string[] = [];
  await observeAudio(a);
  await observeAudio(b);
  for (const p of [a, b]) p.on("pageerror", (e) => errors.push(e.message));
  await a.goto("/");
  await onboard(a);
  await a.getByRole("button", { name: "Buka bilik" }).click();
  await a.getByLabel("Nama panggilan").fill("Aina");
  await a.getByLabel("Had tindakan").selectOption("60");
  await a.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  const code = await a.getByTestId("room-code").innerText();
  await b.goto("/");
  await onboard(b);
  await b.getByRole("button", { name: "Sertai", exact: true }).click();
  await b.getByLabel("Nama panggilan").fill("Badrul");
  await b.getByLabel("Kod bilik", { exact: true }).fill(code);
  await b.getByRole("button", { name: "Masuk bilik" }).click();
  await expect(a.locator(".lobby-player")).toHaveCount(2);
  await expect(b.locator(".lobby-player")).toHaveCount(2);
  await a.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await b.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await a.getByRole("button", { name: "Mula", exact: true }).click();
  await expect(a.locator(".hand-scroll .career-card")).toHaveCount(7);
  await expect(b.locator(".hand-scroll .career-card")).toHaveCount(7);
  const original = await b
    .locator(".hand-scroll .card-title")
    .allTextContents();
  await b.reload();
  await expect(b.locator(".hand-scroll .card-title")).toHaveText(original);
  await cb.setOffline(true);
  await expect(a.getByText("Menunggu rakan.")).toBeVisible();
  await cb.setOffline(false);
  await expect(a.getByText("Menunggu rakan.")).toBeHidden({
    timeout: 20000,
  });
  await expect(b.locator(".hand-scroll .card-title")).toHaveText(original);
  await a.screenshot({
    path: "docs/screenshots/board-desktop.png",
    fullPage: true,
  });
  let actions = 0;
  const statsA = { families: 0, cards: 0 },
    statsB = { families: 0, cards: 0 };
  while (await a.locator(".game-table").count()) {
    const active =
      (await a.locator(".turn-message h2").innerText()) === "Giliran anda!"
        ? a
        : b;
    const other = active === a ? b : a;
    if (
      await active
        .getByRole("button", { name: "Ambil kad", exact: true })
        .count()
    ) {
      await active
        .getByRole("button", { name: "Ambil kad", exact: true })
        .click();
      actions++;
      await active.waitForTimeout(400);
      continue;
    }
    await expect(
      active.getByRole("button", { name: "Minta kad", exact: true }),
    ).toBeEnabled();
    const familyOptions = await active
      .locator("#family option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    await active
      .locator("#family")
      .selectOption(familyOptions[actions % familyOptions.length]);
    const options = await active
      .locator("#requested option")
      .evaluateAll((opts) => opts.map((o) => (o as HTMLOptionElement).value));
    await active
      .locator("#requested")
      .selectOption(options[actions % options.length]);
    const previousText = await active.locator(".table-top").innerText();
    await active
      .getByRole("button", { name: "Minta kad", exact: true })
      .click();
    actions++;
    await expect(async () => {
      if (await active.locator(".game-table").count())
        expect(await active.locator(".table-top").innerText()).not.toBe(
          previousText,
        );
      else await expect(active.locator(".results")).toBeVisible();
    }).toPass();
    if (await active.locator(".game-table").count()) {
      await expect(other.locator(".table-top")).toHaveText(
        await active.locator(".table-top").innerText(),
        { useInnerText: true },
      );
      await expect(other.locator(".turn-message h2")).toHaveText(
        (await active.locator(".turn-message h2").innerText()) ===
          "Giliran anda!"
          ? `Giliran ${active === a ? "Aina" : "Badrul"}`
          : "Giliran anda!",
      );
    }
    expect(actions).toBeLessThanOrEqual(60);
    await active.waitForTimeout(350);
  }
  await expect(b.locator(".results")).toBeVisible();
  for (const page of [a, b]) {
    if (await page.locator(".result-list .winner").filter({ hasText: page === a ? "Aina" : "Badrul" }).count()) {
      await expect.poll(async () => (await audioStarts(page)).at(-1)?.name).toBe("ui-win.wav");
    }
  }
  await expect(a.locator(".result-list")).toHaveText(
    await b.locator(".result-list").innerText(),
    { useInnerText: true },
  );
  const rows = await a.locator(".result-list>div").evaluateAll((nodes) =>
    nodes.map((n) => ({
      name: n.querySelector("b")!.textContent!,
      score: parseInt(n.querySelector("strong")!.textContent!),
      cards: parseInt(n.lastElementChild!.textContent!),
      winner: n.classList.contains("winner"),
    })),
  );
  const best = Math.max(...rows.map((r) => r.score * 100 + r.cards));
  for (const r of rows) expect(r.winner).toBe(r.score * 100 + r.cards === best);
  expect(
    rows.reduce((n, r) => n + r.score * 6 + r.cards, 0),
  ).toBeLessThanOrEqual(36);
  await a.screenshot({
    path: "docs/screenshots/results-desktop.png",
    fullPage: true,
  });
  await a.getByRole("button", { name: "Main lagi" }).click();
  await expect(a.locator(".lobby-player")).toHaveCount(2);
  await expect(b.locator(".lobby-player")).toHaveCount(2);
  expect(errors).toEqual([]);
  await ca.close();
  await cb.close();
});
test("responsive home, learning, room creation and game board at 320, 375, 390, 430", async ({
  browser,
}) => {
  for (const width of [320, 375, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    await p.goto("/");
    await onboard(p);
    await expect(p.locator("h1")).toContainText("Kumpul.");
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({
      path: `docs/screenshots/home-${width}.png`,
      fullPage: true,
    });
    await p.getByRole("button", { name: "Lihat RIASEC" }).click();
    await expect(p.locator(".learning-cards .career-card")).toHaveCount(6);
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.getByRole("button", { name: "Laman utama CARIASEC" }).click();
    await p.getByRole("button", { name: "Buka bilik" }).click();
    await p.getByLabel("Nama panggilan").fill("Aina");
    await p.getByRole("button", { name: "Cipta bilik", exact: true }).click();
    const code = await p.getByTestId("room-code").innerText();
    const peer = await browser.newContext();
    const b = await peer.newPage();
    await b.goto("/");
    await onboard(b);
    await b.getByRole("button", { name: "Sertai", exact: true }).click();
    await b.getByLabel("Nama panggilan").fill("Badrul");
    await b.getByLabel("Kod bilik", { exact: true }).fill(code);
    await b.getByRole("button", { name: "Masuk bilik" }).click();
    await p.getByRole("button", { name: "Saya sedia", exact: true }).click();
    await b.getByRole("button", { name: "Saya sedia", exact: true }).click();
    await p.getByRole("button", { name: "Mula", exact: true }).click();
    await expect(p.locator(".game-table")).toBeVisible();
    expect(
      await p.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await p.screenshot({
      path: `docs/screenshots/board-${width}.png`,
      fullPage: true,
    });
    await p.getByRole("button", { name: "Minta kad", exact: true }).click();
    await expect(p.locator(".table-top")).toContainText("1 / 120");
    await p.getByRole("button", { name: "Keluar", exact: true }).click();
    await context.close();
    await peer.close();
  }
});
