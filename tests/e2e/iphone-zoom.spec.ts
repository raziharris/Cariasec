import { test, expect } from "@playwright/test";
import { onboard } from "../helpers/onboard";

test("iPhone view blocks page zoom gestures while keeping controls usable", async ({
  browser,
}) => {
  for (const width of [320, 375, 390, 430]) {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      isMobile: true,
      hasTouch: true,
      userAgent:
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
    });
    const page = await context.newPage();
    await page.goto("/");
    const zoom = await page.evaluate(() => {
      const gesture = new Event("gesturestart", { cancelable: true });
      document.dispatchEvent(gesture);
      const finger = new Touch({
        identifier: 1,
        target: document.body,
        clientX: 10,
        clientY: 10,
      });
      const secondFinger = new Touch({
        identifier: 2,
        target: document.body,
        clientX: 30,
        clientY: 30,
      });
      const scroll = new TouchEvent("touchmove", {
        touches: [finger],
        cancelable: true,
      });
      const pinch = new TouchEvent("touchmove", {
        touches: [finger, secondFinger],
        cancelable: true,
      });
      document.dispatchEvent(scroll);
      document.dispatchEvent(pinch);
      return {
        viewport: document.querySelector('meta[name="viewport"]')?.getAttribute("content"),
        gestureBlocked: gesture.defaultPrevented,
        pinchBlocked: pinch.defaultPrevented,
        scrollAllowed: !scroll.defaultPrevented,
        touchAction: getComputedStyle(document.documentElement).touchAction,
        inputFontSize: getComputedStyle(document.querySelector<HTMLInputElement>("#player-name")!).fontSize,
      };
    });
    expect(zoom.viewport).toContain("user-scalable=no");
    expect(zoom.viewport).toContain("maximum-scale=1");
    expect(zoom.gestureBlocked).toBe(true);
    expect(zoom.pinchBlocked).toBe(true);
    expect(zoom.scrollAllowed).toBe(true);
    expect(zoom.touchAction).toBe("pan-x pan-y");
    expect(zoom.inputFontSize).toBe("16px");
    await onboard(page, `Aina ${width}`);
    await page.getByRole("button", { name: "Buka bilik" }).click();
    await expect(page.getByLabel("Nama panggilan")).toBeVisible();
    await expect(page.getByLabel("Nama panggilan")).toHaveCSS("font-size", "16px");
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBe(true);
    await context.close();
  }
});

test("desktop view keeps its normal zoom controls", async ({ page }) => {
  await page.goto("/");
  expect(
    await page.locator('meta[name="viewport"]').getAttribute("content"),
  ).toBe("width=device-width, initial-scale=1.0");
  expect(
    await page.locator("html").evaluate((element) =>
      element.classList.contains("iphone-zoom-locked"),
    ),
  ).toBe(false);
});
