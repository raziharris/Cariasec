import { test } from "node:test";
import assert from "node:assert/strict";
import { Client, MatchMakeError } from "@colyseus/sdk";
import type { Room as ColyseusRoom } from "@colyseus/sdk";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { createApp, type Options } from "../backend/src/server.js";
import {
  cards,
  cardById,
  type View,
  type Command,
  type Reply,
  type Session,
} from "../shared/game.js";
import type { ChatMessage, ChatReply } from '../shared/chat';
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
async function until(check: () => boolean) {
  for (let i = 0; i < 100; i++) {
    if (check()) return;
    await delay(20);
  }
  assert.ok(check(), "condition timed out");
}
async function harness(options: Options = {}) {
  const app = createApp({ dbPath: ":memory:", tickMs: 20, ...options });
  await app.listen(0, "127.0.0.1");
  const address = app.http.address() as { port: number };
  const url = `http://127.0.0.1:${address.port}`;
  const clients: Array<{ room: ColyseusRoom | null }> = [];
  async function client() {
    const basePath = options.basePath
      ? `/${options.basePath.replace(/^\/+|\/+$/g, "")}`
      : "";
    const sdk = new Client(`${url}${basePath}`);
    const c = {
      room: null as ColyseusRoom | null,
      view: null as View | null,
      session: null as Session | null,
      chat: [] as ChatMessage[],
      async send(command: Command): Promise<Reply> {
        try {
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
                  `${url}${basePath}/api/rooms/${command.code}`,
                );
                if (!exists.ok) throw error;
                room = await sdk.joinOrCreate("cariasec", command);
              }
            }
            c.room = room;
            room.reconnection.enabled = false;
            room.onMessage<View>("state", (view) => (c.view = view));
            room.onMessage<string>("removed", () => undefined);
            room.onMessage<ChatMessage>('chat-message', message => c.chat.push(message));
            c.session = await room.request<never, Session>("session");
            c.view = await room.request<never, View>("sync");
            return { ok: true, session: c.session };
          }
          if (!c.room)
            return { ok: false, error: "Sila sertai bilik terlebih dahulu." };
          return await c.room.request<Command, Reply>("command", command, {
            timeout: 2000,
          });
        } catch (error) {
          return {
            ok: false,
            error: error instanceof Error ? error.message : "Sambungan gagal.",
          };
        }
      },
      socket: {
        disconnect() {
          if (!c.room) return;
          c.room.reconnection.enabled = false;
          void c.room.leave(false);
        },
      },
    };
    clients.push(c);
    return c;
  }
  return {
    ...app,
    url,
    client,
    async dispose() {
      for (const client of clients) void client.room?.leave().catch(() => 0);
      await app.close();
    },
  };
}
const settings = { turnSeconds: 60, maxActions: 60 } as const;
test('room chat is authenticated, isolated, deduplicated, unrestricted by new cooldowns and independent of gameplay', async () => {
  const h = await harness();
  try {
    const host = await h.client(), guest = await h.client(), outsider = await h.client();
    await host.send({ type: 'create', nickname: 'Aina', settings });
    await guest.send({ type: 'join', nickname: 'Razi', code: host.session!.code });
    await outsider.send({ type: 'create', nickname: 'Other', settings });
    const baseline = structuredClone(h.rooms.get(host.session!.code)!);
    const input = { id: randomUUID(), text: '  Hai 👋  ' };
    const reply = await host.room!.request<unknown, ChatReply>('chat-send', input);
    assert.ok(reply.ok);
    if (reply.ok) { assert.equal(reply.message.name, 'Aina'); assert.equal(reply.message.playerId, host.view!.you); assert.equal(reply.message.text, 'Hai 👋'); }
    await until(() => guest.chat.length === 1 && host.chat.length === 1);
    await host.room!.request('chat-send', input);
    await delay(40);
    assert.equal(guest.chat.length, 1);
    assert.equal(outsider.chat.length, 0);
    assert.deepEqual(await outsider.room!.request('chat-sync'), []);
    for (const text of ['', '   ', 'x'.repeat(241), 'bad\u0000text', 'bad\u202Etext']) assert.equal((await host.room!.request<unknown, ChatReply>('chat-send', { id: randomUUID(), text })).ok, false);
    assert.equal((await guest.room!.request<unknown, ChatReply>('chat-send', input)).ok, false);
    assert.equal((await guest.room!.request<unknown, ChatReply>('chat-send', { id: randomUUID(), text: 'spoof', name: 'Aina' })).ok, false);
    await delay(1100); // Existing transport-wide messages/sec guard is unchanged.
    for (let i = 0; i < 8; i++) assert.equal((await guest.room!.request<unknown, ChatReply>('chat-send', { id: randomUUID(), text: `Spam ${i}` })).ok, true);
    await until(() => host.chat.length === 9);
    assert.deepEqual(h.rooms.get(host.session!.code), baseline);
    assert.equal((await host.room!.request<never, ChatMessage[]>('chat-sync')).length, 9);
    const session = guest.session!;
    guest.socket.disconnect();
    await until(() => !host.view!.players.find(player => player.name === 'Razi')!.connected);
    const resumed = await h.client();
    await resumed.send({ type: 'resume', ...session });
    assert.equal((await resumed.room!.request<never, ChatMessage[]>('chat-sync')).length, 9);
  } finally { await h.dispose(); }
});

test('chat history is bounded, survives server restart and is removed with its room', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'cariasec-chat-'));
  const dbPath = join(directory, 'chat.sqlite');
  const first = await harness({ dbPath });
  let session: Session;
  try {
    const host = await first.client();
    await host.send({ type: 'create', nickname: 'Aina', settings });
    session = host.session!;
    const history = Array.from({ length: 60 }, (_, sequence) => ({ id: randomUUID(), playerId: host.view!.you, name: 'Aina', text: `Mesej ${sequence}`, sequence: sequence + 1, sentAt: Date.now() }));
    first.store.saveChat(session.code, history);
    assert.equal(first.store.loadChat(session.code).length, 50);
  } finally { await first.dispose(); }
  const second = await harness({ dbPath });
  try {
    const resumed = await second.client();
    await resumed.send({ type: 'resume', ...session! });
    const history = await resumed.room!.request<never, ChatMessage[]>('chat-sync');
    assert.equal(history.length, 50);
    assert.equal(history[0].text, 'Mesej 10');
    const reply = await resumed.room!.request<unknown, ChatReply>('chat-send', { id: randomUUID(), text: 'Selepas restart' });
    assert.ok(reply.ok);
    if (reply.ok) assert.equal(reply.message.sequence, 61);
    assert.equal(second.store.loadChat(session!.code).length, 50);
    second.store.delete(session!.code);
    assert.deepEqual(second.store.loadChat(session!.code), []);
  } finally { await second.dispose(); rmSync(directory, { recursive: true, force: true }); }
});
test('legacy character metadata is ignored and player identity survives authenticated resume', async () => {
  const h = await harness();
  try {
    const host = await h.client(), guest = await h.client();
    assert.equal((await host.send({ type: 'create', nickname: 'Aina', avatar: 'student-girl', settings } as unknown as Command)).ok, true);
    const code = host.session!.code;
    assert.equal((await guest.send({ type: 'join', nickname: 'Razi', avatar: 'robot', code } as unknown as Command)).ok, true);
    await until(() => host.view!.players.length === 2);
    assert.deepEqual(host.view!.players.map(p => p.name), ['Aina', 'Razi']);
    assert.ok(host.view!.players.every(p => !('avatar' in p)));
    assert.ok(guest.view!.players.every(p => !('avatar' in p)));
    assert.equal(host.view!.players.length, 2);
    const session = host.session!;
    const playerId = host.view!.you;
    host.socket.disconnect();
    await until(() => !guest.view!.players[0].connected);
    const resumed = await h.client();
    assert.equal((await resumed.send({ type: 'resume', ...session })).ok, true);
    const player = resumed.view!.players.find(p => p.id === resumed.view!.you)!;
    assert.equal(player.name, 'Aina');
    assert.equal(player.id, playerId);
    assert.ok(!('avatar' in player));
  } finally { await h.dispose(); }
});
test("custom base path scopes health and Colyseus", async () => {
  const h = await harness({ basePath: "/Cariasec/" });
  try {
    const health = await fetch(`${h.url}/Cariasec/api/health`);
    assert.equal(health.status, 200);
    assert.ok(
      !health.headers
        .get("content-security-policy")
        ?.includes("upgrade-insecure-requests"),
    );
    assert.equal((await fetch(`${h.url}/api/health`)).status, 404);
    const player = await h.client();
    assert.equal(
      (await player.send({ type: "create", nickname: "Laluan", settings })).ok,
      true,
    );
  } finally {
    await h.dispose();
  }
});
test("authenticated reconnect survives a shared-IP admission burst", async () => {
  const h = await harness({ joinLimitPerMinute: 5 });
  try {
    const owner = await h.client();
    await owner.send({ type: "create", nickname: "Aina", settings });
    const session = owner.session!;
    owner.socket.disconnect();
    for (let n = 0; n < 2; n++) {
      const noisy = await h.client();
      for (let i = 0; i < 3; i++)
        await noisy.send({
          type: "join",
          nickname: "Aina",
          code: session.code,
        });
    }
    const newPlayer = await h.client();
    const denied = await newPlayer.send({
      type: "create",
      nickname: "Baharu",
      settings,
    });
    assert.equal(denied.ok, false);
    if (!denied.ok) assert.match(denied.error, /Terlalu banyak cubaan/);
    const resumed = await h.client();
    assert.equal((await resumed.send({ type: "resume", ...session })).ok, true);
    assert.equal(resumed.view!.code, session.code);
  } finally {
    await h.dispose();
  }
});
test("room lifecycle, private hands, valid/invalid action, resume and independent rooms", async () => {
  const h = await harness();
  try {
    const a = await h.client(),
      b = await h.client(),
      intruder = await h.client();
    assert.equal(
      (await a.send({ type: "create", nickname: "Aina", settings })).ok,
      true,
    );
    const code = a.session!.code;
    assert.equal(
      (await b.send({ type: "join", nickname: "Badrul", code })).ok,
      true,
    );
    await until(() => a.view?.players.length === 2);
    assert.equal(
      (await intruder.send({ type: "resume", code, token: "a".repeat(64) })).ok,
      false,
    );
    assert.equal((await intruder.send({ type: "start" })).ok, false);
    await intruder.send({ type: "create", nickname: "Citra", settings });
    assert.notEqual(intruder.view!.code, code);
    assert.equal(intruder.view!.players.length, 1);
    assert.equal((await b.send({ type: "start" })).ok, false);
    await a.send({ type: "ready", ready: true });
    await b.send({ type: "ready", ready: true });
    assert.equal((await a.send({ type: "start" })).ok, true);
    await until(() => b.view?.phase === "playing");
    assert.equal(a.view!.hand.length, 7);
    assert.equal(b.view!.hand.length, 7);
    assert.ok(!a.view!.hand.some((id) => b.view!.hand.includes(id)));
    assert.ok(!("deck" in a.view!));
    assert.ok(!("hand" in a.view!.players[1]));
    assert.ok(!JSON.stringify(a.view).includes("tokenHash"));
    const available = cards.filter(
      (c) =>
        !a.view!.hand.includes(c.id) &&
        a.view!.hand.some((id) => cardById[id].category === c.category),
    );
    const action = {
      type: "request",
      target: b.view!.you,
      card: available[0].id,
      version: a.view!.version,
      actionId: randomUUID(),
    } as const;
    assert.equal((await b.send({ ...action, target: a.view!.you })).ok, false);
    assert.equal((await a.send(action)).ok, true);
    assert.equal((await a.send(action)).ok, false);
    await until(() => b.view?.version === a.view?.version);
    assert.equal(b.view!.actions, 1);
    const hand = [...b.view!.hand],
      session = b.session!;
    b.socket.disconnect();
    await until(() => a.view!.paused);
    const reconnect = await h.client();
    assert.equal(
      (await reconnect.send({ type: "resume", ...session })).ok,
      true,
    );
    assert.deepEqual(reconnect.view!.hand, hand);
    assert.equal(reconnect.view!.you, b.view!.you);
    await until(() => !a.view!.paused);
    assert.equal(intruder.view!.phase, "lobby");
    assert.equal((await reconnect.send({ type: "leave" })).ok, true);
    await until(() => a.view!.phase === "cancelled");
    assert.deepEqual(a.view!.winners, []);
    await a.send({ type: "again" });
    assert.equal(a.view!.phase, "lobby");
    assert.equal(a.view!.players.length, 1);
  } finally {
    await h.dispose();
  }
});
test("restart restores exact private hands using hashed reconnect credentials", async () => {
  const dir = mkdtempSync(join(tmpdir(), "cariasec-"));
  const dbPath = join(dir, "game.sqlite");
  let h = await harness({ dbPath });
  try {
    const a = await h.client(),
      b = await h.client();
    await a.send({ type: "create", nickname: "Aina", settings });
    await b.send({ type: "join", nickname: "Badrul", code: a.session!.code });
    await a.send({ type: "ready", ready: true });
    await b.send({ type: "ready", ready: true });
    await a.send({ type: "start" });
    await until(() => b.view!.phase === "playing");
    const sa = a.session!,
      sb = b.session!,
      handA = [...a.view!.hand],
      handB = [...b.view!.hand];
    const rows = h.store.db.prepare("SELECT snapshot FROM rooms").all();
    assert.ok(!(rows[0].snapshot as string).includes(sa.token));
    await h.dispose();
    h = await harness({ dbPath });
    const aa = await h.client(),
      bb = await h.client();
    await aa.send({ type: "resume", ...sa });
    await bb.send({ type: "resume", ...sb });
    assert.deepEqual(aa.view!.hand, handA);
    assert.deepEqual(bb.view!.hand, handB);
    await until(() => !aa.view!.paused);
    assert.equal(aa.view!.turn, aa.view!.you);
  } finally {
    await h.dispose();
    assert.equal(dirname(resolve(dir)), resolve(tmpdir()));
    assert.ok(resolve(dir).startsWith(join(resolve(tmpdir()), "cariasec-")));
    rmSync(dir, { recursive: true, force: true });
  }
});
test("disconnect timeout cancels active game; lobby expiry transfers host; empty rooms expire", async () => {
  const h = await harness({ disconnectMs: 100, roomTtlMs: 400 });
  try {
    const a = await h.client(),
      b = await h.client();
    await a.send({ type: "create", nickname: "Aina", settings });
    const code = a.session!.code;
    await b.send({ type: "join", nickname: "Badrul", code });
    a.socket.disconnect();
    await until(() => b.view?.players.length === 1);
    assert.equal(b.view!.host, b.view!.you);
    const c = await h.client();
    await c.send({ type: "join", nickname: "Citra", code });
    await b.send({ type: "ready", ready: true });
    await c.send({ type: "ready", ready: true });
    await b.send({ type: "start" });
    c.socket.disconnect();
    await until(() => b.view!.phase === "cancelled");
    assert.equal(b.view!.winners.length, 0);
    await until(() => !h.rooms.has(code));
  } finally {
    await h.dispose();
  }
});
test("validation, capacity, duplicate names, secure origin and event rate limits", async () => {
  const h = await harness({ maxRooms: 1 });
  try {
    const a = await h.client(),
      b = await h.client();
    const bad = await a.send({
      type: "create",
      nickname: "<script>",
      settings,
    });
    assert.equal(bad.ok, false);
    await a.send({ type: "create", nickname: "Aina", settings });
    assert.equal(
      (await b.send({ type: "create", nickname: "Badrul", settings })).ok,
      false,
    );
    assert.equal(
      (await b.send({ type: "join", nickname: "aina", code: a.session!.code }))
        .ok,
      false,
    );
    assert.equal(
      (await b.send({ type: "join", nickname: "Badrul", code: "ZZZZZZ" })).ok,
      false,
    );
    let rejected = 0;
    for (let i = 0; i < 40; i++) {
      const r = await a.send({ type: "ready", ready: true });
      if (!r.ok) rejected++;
    }
    assert.ok(rejected > 0);
    const evil = new Client(h.url, {
      headers: { Origin: "https://evil.invalid" },
    });
    await assert.rejects(() =>
      evil.create("cariasec", {
        type: "create",
        nickname: "Penceroboh",
        settings,
      }),
    );
  } finally {
    await h.dispose();
  }
});
