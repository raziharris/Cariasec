import { gameAction, selectLanguage } from './game-ui.mjs';
import { onboard } from "./onboarding.mjs";
import { chromium, expect } from "@playwright/test";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";

const base = process.env.LIVE_URL ?? "http://43.156.11.241/Cariasec/";
const target = new URL(base);
if (target.protocol !== "http:" && target.protocol !== "https:")
  throw new Error("LIVE_URL must use HTTP or HTTPS.");

const fetchWithRetry = async (url, attempts = 3) => {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      lastError = error;
      if (attempt < attempts)
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError;
};

mkdirSync("docs/screenshots", { recursive: true });
const health = await fetchWithRetry(new URL("api/health", target));
if (!health.ok) throw new Error(`Live health failed with ${health.status}`);
const cards = JSON.parse(readFileSync("shared/cards.json", "utf8"));
const salaries = JSON.parse(readFileSync("shared/salaries.json", "utf8"));
const ringgit = new Intl.NumberFormat("ms-MY");
const salaryText = (id) =>
  `RM${ringgit.format(salaries[id].min)}–RM${ringgit.format(salaries[id].max)}`;
const cardAssets = [];
for (let offset = 0; offset < cards.length; offset += 6) {
  const batch = await Promise.all(
    cards.slice(offset, offset + 6).map(async (card) => {
      const response = await fetchWithRetry(
        new URL(`cards/${card.id}.webp`, target),
      );
      await response.body?.cancel();
      return {
        id: card.id,
        status: response.status,
        type: response.headers.get("content-type"),
      };
    }),
  );
  cardAssets.push(...batch);
}
expect(cardAssets).toHaveLength(36);
expect(cardAssets.filter((asset) => asset.status !== 200)).toEqual([]);
expect(cardAssets.filter((asset) => asset.type !== "image/webp")).toEqual([]);
const browser = await chromium.launch();
const errors = [];
const failedRequests = [];
const httpErrors = [];
const websocketUrls = [];
let receivedFrames = 0;
try {
  const contexts = await Promise.all([
    browser.newContext(),
    browser.newContext(),
  ]);
  const [host, guest] = await Promise.all(
    contexts.map((context) => context.newPage()),
  );
  for (const page of [host, guest]) {
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) =>
      failedRequests.push({
        url: request.url(),
        error: request.failure()?.errorText,
      }),
    );
    page.on("response", (response) => {
      if (
        response.status() >= 400 &&
        new URL(response.url()).origin === target.origin
      )
        httpErrors.push({ url: response.url(), status: response.status() });
    });
    page.on("websocket", (socket) => {
      websocketUrls.push(socket.url());
      socket.on("framereceived", () => receivedFrames++);
    });
  }

  await host.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await onboard(host, "Tencent Hos");
  await expect(host.locator("h1")).toContainText("Kumpul.");
  await expect(host.locator(".steps-strip")).toHaveCount(0);
  await host.waitForFunction(() =>
    [...document.querySelectorAll(".hero-art img")].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  await host.locator(".hero-art .career-card").first().click();
  await expect(host.locator(".card-detail small")).toHaveCount(0);
  await expect(host.getByTestId("salary-band")).toContainText(
    "Anggaran gaji bulanan",
  );
  await host.getByRole("button", { name: "Tutup butiran kad" }).click();
  await host.getByRole("button", { name: "Lihat RIASEC" }).click();
  await expect(host.locator(".source-details")).toHaveCount(0);
  for (const [index, family] of ["R", "I", "A", "S", "E", "C"].entries()) {
    await host.locator(".family-tabs button").nth(index).click();
    for (const [cardIndex, card] of cards
      .filter((item) => item.category === family)
      .entries()) {
      await host.locator(".learning-cards .career-card").nth(cardIndex).click();
      await expect(host.getByTestId("career-description").locator("li")).toHaveText(card.description.split(/(?<=[.!?])\s+/));
      await expect(host.getByTestId("salary-band")).toContainText(
        salaryText(card.id),
      );
      await host.getByRole("button", { name: "Tutup butiran kad" }).click();
    }
  }
  await host.getByRole("button", { name: "Kembali" }).click();
  await host.getByRole("button", { name: "Buka bilik" }).click();
  await expect(host.getByLabel("Nama panggilan")).toHaveValue("Tencent Hos");
  await host.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  await host.waitForFunction(() =>
    [...document.querySelectorAll(".lobby-card-fan img")].every(
      (image) => image.complete && image.naturalWidth > 0,
    ),
  );
  const code = await host.getByTestId("room-code").innerText();

  await guest.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await onboard(guest, "Tencent Guest", "en");
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await expect(guest.getByLabel("Nickname")).toHaveValue("Tencent Guest");
  await guest.getByLabel("Room code", { exact: true }).fill(code);
  await guest.getByRole("button", { name: "Join room" }).click();
  await host.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await guest.getByRole("button", { name: "I'm ready", exact: true }).click();
  await host.getByRole("button", { name: "Mula", exact: true }).click();
  await expect(host.locator(".hand-scroll .career-card")).toHaveCount(7);
  await expect(guest.locator(".hand-scroll .career-card")).toHaveCount(7);
  for (const page of [host, guest]) await expect(page.getByTestId('board-container')).toHaveAttribute('aria-busy', 'false');
  const guestHand = await guest.locator(".card-title").allTextContents();
  await guest.reload();
  await expect(guest.locator(".card-title")).toHaveText(guestHand);
  await expect(guest.locator("html")).toHaveAttribute("lang", "en");
  await expect(guest.locator(".table-event")).toContainText(
    "Tencent Guest is back.",
  );
  await selectLanguage(guest, 'ms');
  await expect(guest.getByTestId("room-code")).toHaveText(code);
  await expect(guest.locator(".turn-message h2")).toContainText("Giliran");
  await selectLanguage(guest, 'en');
  await expect(guest.locator(".card-title")).toHaveText(guestHand);
  await host.screenshot({
    path: "docs/screenshots/tencent-live-board.png",
    fullPage: true,
  });
  await gameAction(host, 'Keluar');

  const mobileWidths = [320, 375, 390, 430];
  for (const width of mobileWidths) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
    });
    const page = await context.newPage();
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
    if (width === 375) {
      await expect(page.locator(".welcome-screen")).toBeVisible();
      await page.locator(".welcome-logo").evaluate((image) => image.decode());
      await page.screenshot({
        path: "docs/screenshots/tencent-live-welcome-375.png",
        fullPage: true,
      });
    }
    await onboard(page);
    await expect(page.locator("h1")).toContainText("Kumpul.");
    await expect(page.locator(".connection-banner")).toHaveCount(0, {
      timeout: 15_000,
    });
    await page.waitForFunction(() =>
      [...document.querySelectorAll(".hero-art img")].every(
        (image) => image.complete && image.naturalWidth > 0,
      ),
    );
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    if (width === 375)
      await page.screenshot({
        path: "docs/screenshots/tencent-live-mobile-375.png",
        fullPage: true,
        animations: "disabled",
      });
    await selectLanguage(page, 'en');
    await expect(page.locator("h1")).toContainText("Collect.");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth - innerWidth,
      ),
    ).toBeLessThanOrEqual(0);
    if (width === 375)
      await page.screenshot({
        path: "docs/screenshots/tencent-live-english-375.png",
        fullPage: true,
        animations: "disabled",
      });
    await context.close();
  }
  const iphoneContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
  });
  const iphone = await iphoneContext.newPage();
  await iphone.goto(base, { waitUntil: "domcontentloaded", timeout: 60000 });
  await expect(iphone.locator("#player-name")).toBeVisible();
  const iphoneZoom = await iphone.evaluate(() => {
    const gesture = new Event("gesturestart", { cancelable: true });
    document.dispatchEvent(gesture);
    return {
      viewport: document.querySelector('meta[name="viewport"]')?.content,
      gestureBlocked: gesture.defaultPrevented,
      touchAction: getComputedStyle(document.documentElement).touchAction,
      inputFontSize: getComputedStyle(document.querySelector("#player-name"))
        .fontSize,
    };
  });
  expect(iphoneZoom.viewport).toContain("user-scalable=no");
  expect(iphoneZoom.gestureBlocked).toBe(true);
  expect(iphoneZoom.touchAction).toBe("pan-x pan-y");
  expect(iphoneZoom.inputFontSize).toBe("16px");
  await iphoneContext.close();

  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
  expect(httpErrors).toEqual([]);
  expect(
    websocketUrls.some((url) =>
      /^wss?:\/\/[^/]+\/Cariasec\/[A-Za-z0-9_-]+\/[A-Z2-9]{6}\?/.test(url),
    ),
  ).toBe(true);
  expect(receivedFrames).toBeGreaterThan(3);
  const result = {
    date: new Date().toISOString(),
    url: base,
    health: health.status,
    twoBrowserGameplay: true,
    gameStartSynchronized: true,
    refreshRestored: true,
    languagesVerified: ["ms", "en"],
    profileOnboarding: true,
    sourceReferencesRemoved: true,
    languageSwitchKeepsRoom: true,
    mobileWidthsWithoutOverflow: mobileWidths,
    cardAssetsVerified: cardAssets.length,
    salaryRangesVerified: cards.length,
    iphoneZoomGuardVerified: true,
    websocketUrls,
    receivedFrames,
    pageErrors: errors,
    failedRequests,
    httpErrors,
  };
  writeFileSync(
    "docs/tencent-live-smoke.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
