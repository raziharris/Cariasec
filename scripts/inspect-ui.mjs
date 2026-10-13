import { onboard } from "./onboarding.mjs";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdirSync, writeFileSync } from "node:fs";
mkdirSync("docs/screenshots", { recursive: true });
const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
await page.goto("http://127.0.0.1:5173");
await onboard(page);
await page.evaluate(() => document.fonts.ready);
await page.screenshot({
  path: "docs/screenshots/home-desktop.png",
  fullPage: true,
});
const audit = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
  .analyze();
writeFileSync(
  "docs/accessibility.json",
  JSON.stringify(
    audit.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      description: v.description,
      nodes: v.nodes.map((n) => ({
        target: n.target,
        summary: n.failureSummary,
      })),
    })),
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    audit.violations.map((v) => ({
      id: v.id,
      count: v.nodes.length,
      examples: v.nodes
        .slice(0, 3)
        .map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
    null,
    2,
  ),
);
await page.setViewportSize({ width: 320, height: 844 });
await page.screenshot({
  path: "docs/screenshots/home-320.png",
  fullPage: true,
});
console.log(
  "Overflow",
  await page.evaluate(() => ({
    width: innerWidth,
    scroll: document.documentElement.scrollWidth,
    overflow: [...document.querySelectorAll("body *")]
      .filter((e) => {
        const r = e.getBoundingClientRect();
        return (
          r.right > innerWidth + 1 &&
          getComputedStyle(e).position !== "absolute"
        );
      })
      .slice(0, 15)
      .map((e) => ({
        tag: e.tagName,
        cls: e.className,
        width: e.getBoundingClientRect().width,
      })),
  })),
);
await browser.close();
