import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { cards, cardById, type Room, type Player } from "../shared/game.js";
import {
  startGame,
  requestCard,
  drawWithoutTarget,
  collect,
  timeoutTurn,
  assertInvariant,
  viewFor,
  shuffle,
} from "../backend/src/game/engine.js";
function player(name: string): Player {
  return {
    id: randomUUID(),
    name,
    tokenHash: "secret",
    connected: true,
    disconnectedAt: null,
    ready: true,
    hand: [],
    families: [],
  };
}
function room(count = 2): Room {
  const players = Array.from({ length: count }, (_, i) =>
    player(`Pemain ${i + 1}`),
  );
  return {
    code: "ABC234",
    host: players[0].id,
    players,
    settings: { turnSeconds: 60, maxActions: 120 },
    phase: "lobby",
    deck: [],
    turn: null,
    version: 0,
    actions: 0,
    log: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    deadline: null,
    winners: [],
    reason: null,
    processed: [],
  };
}
function arranged(hands: string[][]): Room {
  const r = room(hands.length);
  r.phase = "playing";
  r.players.forEach((p, i) => (p.hand = hands[i]));
  r.deck = cards.map((c) => c.id).filter((id) => !hands.flat().includes(id));
  r.turn = r.players[0].id;
  r.deadline = Date.now() + 60_000;
  return r;
}
const ask = (r: Room, target: string, card: string) =>
  requestCard(r, r.turn!, target, card, r.version, randomUUID());
test("dataset: 36 unique cards, six per category, traceable source", () => {
  assert.equal(cards.length, 36);
  assert.equal(new Set(cards.map((c) => c.id)).size, 36);
  for (const code of "RIASEC")
    assert.equal(cards.filter((c) => c.category === code).length, 6);
  for (const c of cards) {
    assert.ok(c.source.page > 0);
    assert.ok(c.description.trim().length > 0, `${c.id} needs a career description`);
  }
});
test("shuffle preserves complete deck without mutating input", () => {
  const original = cards.map((c) => c.id);
  const copy = [...original];
  assert.deepEqual(shuffle(original).sort(), copy.sort());
  assert.deepEqual(
    original,
    cards.map((c) => c.id),
  );
});
test("deals correctly for 2 through 6 players and conserves all cards", () => {
  for (let n = 2; n <= 6; n++) {
    const r = room(n);
    startGame(r, r.host);
    const count = n === 2 ? 7 : 5;
    assert.equal(r.deck.length, 36 - count * n);
    assert.equal(r.turn, r.host);
    assertInvariant(r);
    for (const p of r.players)
      assert.equal(p.hand.length + p.families.length * 6, count);
  }
});
test("only ready lobby with two players and host can start", () => {
  const r = room();
  assert.throws(() => startGame(r, r.players[1].id));
  r.players[1].ready = false;
  assert.throws(() => startGame(r, r.host));
  assert.throws(() => startGame(room(1), "unknown"));
});
test("successful request transfers only the requested card and retains turn", () => {
  const r = arranged([["R1"], ["R2", "A1"]]);
  ask(r, r.players[1].id, "R2");
  assert.deepEqual(r.players[0].hand, ["R1", "R2"]);
  assert.deepEqual(r.players[1].hand, ["A1"]);
  assert.equal(r.turn, r.host);
  assertInvariant(r);
});
test("invalid ownership, target, turn, version and family requests are rejected without mutation", () => {
  const r = arranged([["R1"], ["R2", "A1"]]);
  for (const args of [
    [r.host, r.host, "R2", 0],
    [r.players[1].id, r.host, "R1", 0],
    [r.host, r.players[1].id, "R1", 0],
    [r.host, r.players[1].id, "A1", 0],
    [r.host, r.players[1].id, "R2", 9],
    [r.host, "bad", "R2", 0],
  ] as const) {
    const before = JSON.stringify(r);
    assert.throws(() =>
      requestCard(r, args[0], args[1], args[2], args[3], randomUUID()),
    );
    assert.equal(JSON.stringify(r), before);
  }
});
test("duplicate action rejected even if request would otherwise be valid", () => {
  const r = arranged([["R1"], ["R2", "R3"]]);
  const id = randomUUID();
  requestCard(r, r.host, r.players[1].id, "R2", 0, id);
  assert.throws(() => requestCard(r, r.host, r.players[1].id, "R3", 0, id));
});
test("miss draws privately and advances turn; exact requested draw retains turn", () => {
  for (const match of [false, true]) {
    const r = arranged([["R1"], ["A1"]]);
    const drawn = match ? "R2" : "I1";
    r.deck = r.deck.filter((id) => id !== drawn);
    r.deck.push(drawn);
    ask(r, r.players[1].id, "R2");
    assert.ok(r.players[0].hand.includes(drawn));
    assert.equal(r.turn, match ? r.host : r.players[1].id);
    assert.ok(
      !JSON.stringify(viewFor(r, r.players[1].id).hand).includes(drawn),
    );
    assertInvariant(r);
  }
});
test("six cards form a family worth one point and are removed from hand", () => {
  const r = arranged([
    ["R1", "R2", "R3", "R4", "R5"],
    ["R6", "I1"],
  ]);
  ask(r, r.players[1].id, "R6");
  assert.deepEqual(r.players[0].families, ["R"]);
  assert.equal(r.players[0].hand.length, 1);
  assertInvariant(r);
});
test("empty deck on a miss passes the turn; empty players skipped", () => {
  const r = arranged([["R1"], ["R2"], []]);
  r.deck = [];
  ask(r, r.players[1].id, "R3");
  assert.equal(r.turn, r.players[1].id);
  ask(r, r.players[0].id, "R3");
  assert.equal(r.turn, r.host);
});
test("all families complete ends game with legitimate winner", () => {
  const r = arranged([["R1", "R2", "R3", "R4", "R5"], ["R6"]]);
  r.deck = [];
  r.players[0].families = ["I", "A", "S"];
  r.players[1].families = ["E", "C"];
  ask(r, r.players[1].id, "R6");
  assert.equal(r.phase, "finished");
  assert.deepEqual(r.winners, [r.host]);
  assertInvariant(r);
});
test("action limit uses card count tie-break then shared victory", () => {
  for (const tie of [true, false]) {
    const r = arranged([["R1"], tie ? ["I1"] : ["I1", "I2"]]);
    r.deck = [];
    r.actions = 119;
    ask(r, r.players[1].id, "R2");
    assert.equal(r.phase, "finished");
    assert.equal(r.winners.length, tie ? 2 : 1);
    if (!tie) assert.deepEqual(r.winners, [r.players[1].id]);
  }
});
test("timeout draws and passes; paused room cannot act or timeout", () => {
  const r = arranged([["R1"], ["I1"]]);
  r.deadline = 1;
  assert.equal(timeoutTurn(r), true);
  assert.equal(r.turn, r.players[1].id);
  r.players[0].connected = false;
  r.deadline = 1;
  assert.equal(timeoutTurn(r), false);
  assert.throws(() => ask(r, r.players[0].id, "I2"));
});
test("view excludes deck order, credentials and other hands", () => {
  const r = room();
  startGame(r, r.host);
  const v = viewFor(r, r.host);
  assert.equal(v.hand.length, 7);
  assert.ok(!("deck" in v));
  assert.ok(!("processed" in v));
  for (const p of v.players) {
    assert.ok(!("hand" in p));
    assert.ok(!("tokenHash" in p));
  }
});
test("no-target draw advances play immediately and cannot be used to avoid a valid request", () => {
  const r = arranged([["R1"], []]);
  drawWithoutTarget(r, r.host, r.version, randomUUID());
  assert.equal(r.actions, 1);
  assert.equal(r.players[0].hand.length, 2);
  assert.equal(r.players[1].hand.length, 1);
  assert.equal(r.turn, r.players[1].id);
  assertInvariant(r);
  assert.throws(() =>
    drawWithoutTarget(r, r.players[1].id, r.version, randomUUID()),
  );
});
test("300 complete randomized games conserve cards, remain legal and terminate", () => {
  for (let trial = 0; trial < 300; trial++) {
    const r = room(2 + (trial % 5));
    startGame(r, r.host);
    while (r.phase === "playing") {
      const p = r.players.find((p) => p.id === r.turn)!;
      const targets = r.players.filter((t) => t !== p && t.hand.length);
      const available = cards.filter(
        (c) =>
          !p.hand.includes(c.id) &&
          p.hand.some((id) => cardById[id].category === c.category),
      );
      if (!targets.length || !available.length) {
        r.deadline = 1;
        timeoutTurn(r);
      } else {
        ask(
          r,
          targets[Math.floor(Math.random() * targets.length)].id,
          available[Math.floor(Math.random() * available.length)].id,
        );
      }
      assertInvariant(r);
    }
    assert.ok(r.winners.length);
    assert.ok(r.actions <= 120);
  }
});
