import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "tests/e2e",
  // Earlier specs describe the retired family-request UI; Rentak replaces that flow.
  testMatch: "rentak.spec.ts",
  timeout: 180_000,
  expect: { timeout: 10_000 },
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.LIVE_URL ?? "http://127.0.0.1:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: process.env.LIVE_URL
    ? undefined
    : {
        command: `${process.platform === "win32" ? "npm.cmd" : "npm"} run dev`,
        url: "http://127.0.0.1:5173",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
