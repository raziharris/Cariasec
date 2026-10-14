import { gameAction, prepareRequest } from '../helpers/gameUi';
import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { observeAudio, audioStarts, resetAudio } from "../helpers/audioProbe";
import { onboard } from "../helpers/onboard";
import AxeBuilder from "@axe-core/playwright";

test("kit WAV assets are intact, short, softly mastered and served correctly", async ({ request }) => {
  const hashes: Record<string, string> = {
    click: "d63873e42f5c3800c37addf99e05852d82a1c8ed4794d08eada928bb4c73edb7",
    confirm: "10d8556c727fd56007869009f65a6ef07962d6b75bc2f93b774180eb383512fc",
    back: "00551ae6bd580570b3c9c22e7999823fab0639400299d189a84c819b0207ec96",
    error: "80065de638e90a14f9f44f2b269a4c42c41a20da70f2d34c1297ca42ccac8f10",
    card: "4517fd6808ad18dacdd1c279e6709152b007e6a2fbfe4bcd24daef3d1dce56eb",
    win: "7f5667e5e03bc8aea5276a4d9aab31ad3d9f55a01551f224970bb46eecad8210",
  };
  for (const name of ["click", "confirm", "back", "error", "card", "win"]) {
    const path = `public/sounds/ui-${name}.wav`;
    const file = readFileSync(path);
    expect(createHash("sha256").update(file).digest("hex")).toBe(hashes[name]);
    expect(file.subarray(0, 4).toString()).toBe("RIFF");
    expect(file.readUInt16LE(34)).toBe(16);
    expect((file.length - 44) / file.readUInt32LE(28)).toBeLessThan(0.7);
    let peak = 0;
    for (let i = 44; i < file.length - 1; i += 2) peak = Math.max(peak, Math.abs(file.readInt16LE(i)) / 32768);
    expect(peak).toBeGreaterThan(0.01);
    expect(peak).toBeLessThan(0.95);
    const response = await request.get(`/sounds/ui-${name}.wav`);
    expect(response.ok()).toBe(true);
    expect(await response.body()).toEqual(file);
  }
});

test("real button audio, volume gain, mute, persistence and gesture unlock on desktop and phone", async ({ browser }) => {
  const availability = await browser.newPage();
  const hasAudio = await availability.evaluate(() => typeof AudioContext !== "undefined");
  await availability.close();
  test.skip(!hasAudio, "This browser port does not expose Web Audio; real audio playback cannot be measured.");
  for (const viewport of [{ width: 1280, height: 900 }, { width: 320, height: 844 }, { width: 375, height: 844 }]) {
    const context = await browser.newContext({ viewport, ...(viewport.width < 400 ? { isMobile: true, hasTouch: true } : {}) });
    const page = await context.newPage();
    await observeAudio(page);
    await page.goto("/");
    expect(await audioStarts(page)).toEqual([]);
    await page.locator("#player-name").click();
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.decoded.length)).toBe(6);
    await page.getByRole("button", { name: "Teruskan", exact: true }).click();
    await expect.poll(async () => (await audioStarts(page)).map((entry) => entry.name)).toEqual(["ui-error.wav"]);
    await onboard(page, "Audio Ujian");
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole("button", { name: "Buka bilik" }).click();
    await expect.poll(async () => (await audioStarts(page)).map((entry) => entry.name)).toEqual(["ui-click.wav"]);
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await expect.poll(async () => (await audioStarts(page)).at(-1)?.name).toBe("ui-back.wav");
    await gameAction(page, 'Tetapan');
    const slider = page.getByLabel("Volume kesan bunyi");
    await expect(slider).toHaveValue("45");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const audit = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(audit.violations.map((violation) => violation.id)).toEqual([]);
    await page.screenshot({ path: `docs/screenshots/sound-settings-${viewport.width}.png`, fullPage: true });
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole("button", { name: "Cuba bunyi" }).click();
    await expect.poll(async () => (await audioStarts(page)).length).toBe(1);
    expect((await audioStarts(page))[0].gain).toBeCloseTo(0.45, 2);
    await slider.focus();
    await slider.press("Home");
    for (let i = 0; i < 20; i++) await slider.press("ArrowRight");
    await expect(slider).toHaveValue("20");
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole("button", { name: "Cuba bunyi" }).click();
    await expect.poll(async () => (await audioStarts(page)).length).toBe(1);
    expect((await audioStarts(page))[0].gain).toBeCloseTo(0.2, 2);
    await page.getByRole("button", { name: "Senyapkan bunyi" }).click();
    await expect(page.getByRole("button", { name: "Cuba bunyi" })).toBeDisabled();
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    await gameAction(page, 'Tetapan');
    expect(await audioStarts(page)).toEqual([]);
    await page.reload();
    await gameAction(page, 'Tetapan');
    await expect(slider).toHaveValue("20");
    await expect(page.getByRole("button", { name: "Hidupkan bunyi" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Hidupkan bunyi" }).click();
    await expect.poll(async () => (await audioStarts(page)).length).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => (window as any).__audioProbe.gains[0].gain.value)).toBeCloseTo(0.2, 2);
    await slider.focus();
    await slider.press("End");
    await expect(slider).toHaveValue("100");
    await slider.press("Home");
    await expect(slider).toHaveValue("0");
    await expect(page.getByRole("button", { name: "Cuba bunyi" })).toBeDisabled();
    await page.waitForTimeout(100);
    await resetAudio(page);
    await page.getByRole("button", { name: "Tutup", exact: true }).click();
    expect(await audioStarts(page)).toEqual([]);
    await context.close();
  }
});

test("Phaser cues match server actions, deduplicate, and remain silent on refresh", async ({ browser }) => {
  const availability = await browser.newPage();
  const hasAudio = await availability.evaluate(() => typeof AudioContext !== "undefined");
  await availability.close();
  test.skip(!hasAudio, "This browser port does not expose Web Audio; real audio playback cannot be measured.");
  const contexts = [await browser.newContext(), await browser.newContext()];
  const [host, guest] = await Promise.all(contexts.map((context) => context.newPage()));
  for (const page of [host, guest]) { await observeAudio(page); await page.goto("/"); }
  await onboard(host, "Audio Aina");
  await host.getByRole("button", { name: "Buka bilik" }).click();
  await host.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  const code = await host.getByTestId("room-code").innerText();
  await onboard(guest, "Audio Badrul");
  await guest.getByRole("button", { name: "Sertai", exact: true }).click();
  await guest.getByLabel("Kod bilik", { exact: true }).fill(code);
  await guest.getByRole("button", { name: "Masuk bilik" }).click();
  await host.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await guest.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await host.waitForTimeout(100);
  await resetAudio(host);
  await resetAudio(guest);
  await host.getByRole("button", { name: "Mula", exact: true }).click();
  for (const page of [host, guest]) {
    await expect(page.locator(".phaser-board canvas")).toBeVisible();
    await expect.poll(async () => (await audioStarts(page)).map((entry) => entry.name)).toEqual(["ui-card.wav"]);
  }
  await host.waitForTimeout(1600);
  await prepareRequest(host);
  await host.waitForTimeout(250);
  await resetAudio(host);
  await resetAudio(guest);
  await host.getByRole("button", { name: "Minta kad", exact: true }).click();
  for (const page of [host, guest]) {
    await expect(page.locator(".table-top")).toContainText("1 / 120");
    await expect.poll(async () => (await audioStarts(page)).map((entry) => entry.name)).toEqual(["ui-card.wav"]);
  }
  await guest.reload();
  await expect(guest.locator(".phaser-board canvas")).toBeVisible();
  expect(await audioStarts(guest)).toEqual([]);
  await host.evaluate(async () => {
    const modulePath = "/frontend/src/audio/SoundManager.ts";
    const { soundManager } = await import(modulePath);
    soundManager.playSound("win", "repeat-test");
    soundManager.playSound("win", "repeat-test");
  });
  await expect.poll(async () => (await audioStarts(host)).filter((entry) => entry.name === "ui-win.wav").length).toBe(1);
  expect(await host.evaluate(() => (window as any).__audioProbe.maxActive)).toBe(1);
  await gameAction(host, 'Keluar');
  await expect(guest.locator(".results")).toBeVisible();
  await Promise.all(contexts.map((context) => context.close()));
});
