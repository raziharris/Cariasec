import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const url = process.env.LIVE_URL ?? "https://cariasec.site/Cariasec/";
const target = new URL(url);
if (!["http:", "https:"].includes(target.protocol))
  throw Error("HTTP(S) LIVE_URL required.");
const health = await fetch(new URL("api/health", target));
if (!health.ok) throw Error(`Live health failed: ${health.status}`);
const healthBody = await health.json();
for (const file of [
  "rentak-draw.wav",
  "rentak-pintas.wav",
  "rentak-pusing.wav",
  "rentak-beban.wav",
  "rentak-teduh.wav",
  "rentak-pair.wav",
  "rentak-tick.wav",
]) {
  const response = await fetch(new URL(`sounds/${file}`, target));
  if (!response.ok) throw Error(`Missing sound: ${file}`);
  await response.body?.cancel();
}
mkdirSync("tmp", { recursive: true });
mkdirSync("docs/screenshots", { recursive: true });
const output = resolve("tmp/rentak-live-results.json");
const run = spawnSync(
  process.execPath,
  [
    resolve("node_modules/@playwright/test/cli.js"),
    "test",
    "--reporter=list,json",
  ],
  {
    stdio: "inherit",
    env: { ...process.env, LIVE_URL: url, PLAYWRIGHT_JSON_OUTPUT_NAME: output },
  },
);
const report = JSON.parse(readFileSync(output, "utf8"));
writeFileSync(
  "docs/rentak-live-smoke.json",
  JSON.stringify(
    {
      date: new Date().toISOString(),
      url,
      health: healthBody,
      stats: report.stats,
      passed: run.status === 0,
      scope:
        "Chromium browser contexts on one machine, not physical iPhones or separate networks. Mobile viewports 320/375/390/430; tutorial, settings, learning, accessibility, Normal three-round Party Match, Beginner Quick Round, private hands, refresh/reconnect, chat, rematch.",
      errors: report.errors,
    },
    null,
    2,
  ) + "\n",
);
process.exitCode = run.status ?? 1;
