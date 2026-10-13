import { onboard } from "./onboarding.mjs";
import { spawn } from "node:child_process";
import { chromium, expect } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { get as httpsGet } from "node:https";
mkdirSync("tmp/production", { recursive: true });
const base = process.env.PROXY_TEST_ORIGIN ?? "http://127.0.0.1:3002";
const configuredRoute = (process.env.APP_BASE_PATH ?? "").trim();
const route = configuredRoute
  ? `/${configuredRoute.replace(/^\/+|\/+$/g, "")}`
  : "";
const appUrl = `${base}${route}/`;
const throughProxy = Boolean(process.env.PROXY_TEST_ORIGIN);
if (
  throughProxy &&
  (new URL(base).hostname !== "127.0.0.1" ||
    new URL(base).protocol !== "https:")
)
  throw new Error(
    "PROXY_TEST_ORIGIN is restricted to local HTTPS verification.",
  );
const child = spawn(process.execPath, ["dist/server.js"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: "3002",
    PUBLIC_ORIGIN: new URL(base).origin,
    APP_BASE_PATH: route,
    DATABASE_PATH: "tmp/production/game.sqlite",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let browser;
const errors = [],
  failedRequests = [];
let output = "";
try {
  await new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Production startup timeout")),
      15000,
    );
    child.stdout.on("data", (b) => {
      output += b.toString();
      if (output.includes("tersedia")) {
        clearTimeout(timer);
        resolve();
      }
    });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code) reject(new Error(`Production exited ${code}`));
    });
  });
  const response = throughProxy
    ? await new Promise((resolve, reject) => {
        httpsGet(
          `${base}${route}/api/health`,
          { rejectUnauthorized: false },
          (res) => {
            res.resume();
            resolve({
              ok: res.statusCode === 200,
              status: res.statusCode,
              headers: new Headers(
                Object.entries(res.headers).map(([key, value]) => [
                  key,
                  String(value),
                ]),
              ),
            });
          },
        ).on("error", reject);
      })
    : await fetch(`${base}${route}/api/health`);
  if (!response.ok) throw new Error("Health failed");
  const headers = Object.fromEntries(response.headers);
  if (!headers["content-security-policy"]) throw new Error("CSP missing");
  browser = await chromium.launch();
  const contexts = await Promise.all([
    browser.newContext({ ignoreHTTPSErrors: throughProxy }),
    browser.newContext({ ignoreHTTPSErrors: throughProxy }),
  ]);
  const [a, b] = await Promise.all(contexts.map((c) => c.newPage()));
  const websocketUrls = [];
  let receivedWebsocketFrames = 0;
  for (const p of [a, b])
    p.on("websocket", (s) => {
      websocketUrls.push(s.url());
      s.on("framereceived", () => receivedWebsocketFrames++);
    });
  for (const p of [a, b]) {
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("requestfailed", (r) =>
      failedRequests.push({ url: r.url(), error: r.failure()?.errorText }),
    );
  }
  await a.goto(appUrl);
  await onboard(a);
  await expect(a.locator("h1")).toContainText("Kumpul.");
  await a.getByRole("button", { name: "Buka bilik" }).click();
  await a.getByLabel("Nama panggilan").fill("Produksi A");
  await a.getByRole("button", { name: "Cipta bilik", exact: true }).click();
  const code = await a.getByTestId("room-code").innerText();
  await b.goto(appUrl);
  await onboard(b);
  await b.getByRole("button", { name: "Sertai", exact: true }).click();
  await b.getByLabel("Nama panggilan").fill("Produksi B");
  await b.getByLabel("Kod bilik", { exact: true }).fill(code);
  await b.getByRole("button", { name: "Masuk bilik" }).click();
  await a.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await b.getByRole("button", { name: "Saya sedia", exact: true }).click();
  await a.getByRole("button", { name: "Mula", exact: true }).click();
  await expect(a.locator(".hand-scroll .career-card")).toHaveCount(7);
  await expect(b.locator(".hand-scroll .career-card")).toHaveCount(7);
  await a.getByRole("button", { name: "Minta kad", exact: true }).click();
  await expect(a.locator(".table-top")).toContainText("1 / 120");
  await expect(b.locator(".table-top")).toContainText("1 / 120");
  const hand = await b.locator(".card-title").allTextContents();
  await b.reload();
  await expect(b.locator(".card-title")).toHaveText(hand);
  await a.screenshot({
    path: "docs/screenshots/production-board.png",
    fullPage: true,
  });
  await a.getByRole("button", { name: "Keluar", exact: true }).click();
  expect(errors).toEqual([]);
  expect(failedRequests).toEqual([]);
  const result = {
    date: new Date().toISOString(),
    runtime: process.version,
    build: "dist/server.js + dist/public",
    origin: appUrl,
    health: response.status,
    cspPresent: true,
    twoBrowserGameplay: true,
    refreshRestored: true,
    pageErrors: errors,
    failedRequests,
    limitations:
      "Local HTTP production bundle smoke test; not Docker/Nginx/HTTPS/WSS or Tencent verification.",
  };
  if (throughProxy) {
    expect(websocketUrls.some((url) => url.startsWith("wss://"))).toBe(true);
    expect(receivedWebsocketFrames).toBeGreaterThan(3);
    Object.assign(result, {
      selfSignedLocalTls: true,
      websocketUrls,
      receivedWebsocketFrames,
      limitations:
        "Local native Windows Nginx with temporary self-signed TLS; Docker DNS, Linux containers, public certificates and Tencent are unverified.",
    });
  }
  writeFileSync(
    throughProxy ? "docs/proxy-smoke.json" : "docs/production-smoke.json",
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser?.close();
  child.kill();
}
