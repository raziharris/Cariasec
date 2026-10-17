import { fork } from "node:child_process";
import { mkdirSync, writeFileSync, mkdtempSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { Client, MatchMakeError } from "@colyseus/sdk";
import type { Room as ColyseusRoom } from "@colyseus/sdk";
import {
  cards,
  cardById,
  type View,
  type Command,
  type Reply,
  type Session,
} from "../shared/game.js";
import { deckById, matches } from "../shared/rentak.js";
const players = Number(process.env.PLAYERS ?? 8);
if (![8, 20, 40, 100].includes(players))
  throw new Error("PLAYERS mestilah 8, 20, 40 atau 100.");
mkdirSync("tmp/load", { recursive: true });
mkdirSync("docs/load-results", { recursive: true });
const folder = mkdtempSync(resolve("tmp/load/run-"));
const worker = fork(resolve("scripts/load-worker.ts"), [], {
  execArgv: ["--import", "tsx"],
  env: { ...process.env, LOAD_DB: resolve(folder, "game.sqlite") },
  stdio: ["ignore", "ignore", "inherit", "ipc"],
});
const metrics: { rssMB: number; cpuPercent: number }[] = [];
worker.on("message", (m: any) => {
  if (m.type === "metric") metrics.push(m);
});
const port = await new Promise<number>((resolve, reject) => {
  worker.on("message", (m: any) => {
    if (m.type === "ready") resolve(m.port);
  });
  worker.on("error", reject);
  worker.on("exit", (code) => {
    if (code) reject(new Error(`Worker exited ${code}`));
  });
});
const latencies: number[] = [];
let disconnections = 0,
  failures = 0,
  consistencyChecks = 0,
  ending = false,
  completed = 0;
const clients: ColyseusRoom[] = [];
const started = performance.now();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function client() {
  const sdk = new Client(`http://127.0.0.1:${port}`);
  const c = {
    room: null as ColyseusRoom | null,
    view: null as View | null,
    async send(command: Command) {
      const start = performance.now();
      let reply: Reply;
      if (
        command.type === "create" ||
        command.type === "join" ||
        command.type === "resume"
      ) {
        let room: ColyseusRoom;
        if (command.type === "create") {
          room = await sdk.create("cariasec", command);
        } else {
          try {
            room = await sdk.joinById(command.code, command);
          } catch (error) {
            if (!(error instanceof MatchMakeError) || error.code !== 522)
              throw error;
            const exists = await fetch(
              `http://127.0.0.1:${port}/api/rooms/${command.code}`,
            );
            if (!exists.ok) throw error;
            room = await sdk.joinOrCreate("cariasec", command);
          }
        }
        c.room = room;
        clients.push(room);
        room.onMessage<View>("state", (view) => (c.view = view));
        room.onLeave(() => {
          if (!ending) disconnections++;
        });
        const session = await room.request<never, Session>("session");
        c.view = await room.request<never, View>("sync");
        reply = { ok: true, session };
      } else {
        if (!c.room) throw new Error("Missing Colyseus room");
        reply = await c.room.request<Command, Reply>("command", command, {
          timeout: 5000,
        });
      }
      latencies.push(performance.now() - start);
      if (!reply.ok) {
        failures++;
        throw new Error(reply.error);
      }
      return reply;
    },
  };
  return c;
}
try {
  const pairs = [];
  for (let n = 0; n < players / 2; n++) {
    const a = await client(),
      b = await client();
    const result = await a.send({
      type: "create",
      nickname: `Hos ${n}`,
      settings: { turnSeconds: 60, maxActions: 60 },
    });
    if (!result.ok || !result.session) throw new Error("Missing session");
    await b.send({
      type: "join",
      nickname: `Rakan ${n}`,
      code: result.session.code,
    });
    await a.send({ type: "ready", ready: true });
    await b.send({ type: "ready", ready: true });
    pairs.push([a, b]);
  }
  await Promise.all(
    pairs.map(async ([a, b]) => {
      await a.send({ type: "start" });
      let turns = 0;
      while (a.view?.phase === "playing") {
        await sleep(400);
        const actor = a.view.turn === a.view.you ? a : b;
        const target = actor === a ? b : a;
        const v = actor.view!;
        if (v.phase !== "playing") break;
        const s = v.rentak!;
        const playable = v.hand.find(
          (id) =>
            (!s.drawn || s.drawn === id) &&
            (s.penalty
              ? deckById[id].kind === "teduh"
              : matches(deckById[id], deckById[s.top], s.activeSuit)),
        );
        await actor.send(
          playable
            ? {
                type: "play",
                cardIds: [playable],
                ...(deckById[playable].kind === "prisma"
                  ? { chosenSuit: "I" as const }
                  : {}),
                version: v.version,
                actionId: randomUUID(),
              }
            : {
                type: s.drawn ? "pass" : "draw",
                version: v.version,
                actionId: randomUUID(),
              },
        );
        turns++;
        await sleep(10);
        const av = a.view!,
          bv = b.view!;
        if (
          av.version !== bv.version ||
          av.actions !== bv.actions ||
          av.turn !== bv.turn ||
          av.hand.some((id) => bv.hand.includes(id)) ||
          av.rentak!.top !== bv.rentak!.top
        ) {
          failures++;
          throw new Error("Multiplayer consistency failed");
        }
        consistencyChecks++;
        if (turns > 2000) throw new Error("Round did not terminate");
      }
      if (
        a.view?.phase !== "finished" ||
        JSON.stringify(a.view.winners) !== JSON.stringify(b.view?.winners)
      )
        throw new Error("Invalid result");
      completed++;
    }),
  );
} catch (e) {
  failures++;
  console.error(e);
  process.exitCode = 1;
} finally {
  ending = true;
  const elapsedMs = performance.now() - started;
  for (const room of clients) await room.leave().catch(() => 0);
  worker.send("stop");
  await new Promise<void>((r) => worker.on("exit", () => r()));
  latencies.sort((a, b) => a - b);
  const q = (p: number) =>
    Number(
      (
        latencies[
          Math.min(latencies.length - 1, Math.floor(latencies.length * p))
        ] ?? 0
      ).toFixed(2),
    );
  const result = {
    date: new Date().toISOString(),
    environment:
      "Local Windows; separate Node backend process; SQLite WAL on disk; websocket clients on same machine. Not a Tencent capacity claim.",
    players,
    rooms: players / 2,
    completedRooms: completed,
    elapsedSeconds: Number((elapsedMs / 1000).toFixed(2)),
    commands: latencies.length,
    latencyMs: { median: q(0.5), p95: q(0.95), p99: q(0.99), max: q(1) },
    backend: {
      peakRssMB: Number(Math.max(0, ...metrics.map((m) => m.rssMB)).toFixed(2)),
      averageCpuPercentOfOneCore: Number(
        (
          metrics.reduce((s, m) => s + m.cpuPercent, 0) /
          Math.max(1, metrics.length)
        ).toFixed(2),
      ),
      peakCpuPercentOfOneCore: Number(
        Math.max(0, ...metrics.map((m) => m.cpuPercent)).toFixed(2),
      ),
    },
    unexpectedDisconnections: disconnections,
    eventFailures: failures,
    consistencyChecks,
  };
  writeFileSync(
    `docs/load-results/${players}-players.json`,
    JSON.stringify(result, null, 2) + "\n",
  );
  console.log(JSON.stringify(result, null, 2));
}
