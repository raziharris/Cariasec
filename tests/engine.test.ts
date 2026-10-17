import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { Room } from "../shared/game";
import { makeDeck, deckById, matches, isPair, suits } from "../shared/rentak";
import {
  startGame,
  playCards,
  drawWithoutTarget,
  passTurn,
  timeoutTurn,
  assertInvariant,
  viewFor,
  withdraw,
  disconnectPlayer,
  reconnectPlayer,
  settlePause,
} from "../backend/src/game/engine";
const now = 100_000;
function room(count = 2, mode: "normal" | "beginner" = "normal"): Room {
  const players = Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    tokenHash: "secret",
    connected: true,
    disconnectedAt: null,
    ready: true,
    hand: [] as string[],
    families: [],
  }));
  const r: Room = {
    code: "ABC234",
    schemaVersion: 2,
    host: "p0",
    players,
    settings: { mode, format: "quick", turnSeconds: 30, maxActions: 120 },
    phase: "lobby",
    deck: [],
    turn: null,
    version: 0,
    actions: 0,
    log: [],
    createdAt: now,
    updatedAt: now,
    deadline: null,
    winners: [],
    reason: null,
    processed: [],
  };
  startGame(r, r.host, now);
  return r;
}
function rig(r: Room, hands: string[][], top = "R-1-1") {
  r.turn = "p0";
  r.rentak!.discard = [top];
  r.rentak!.activeSuit =
    deckById[top].kind === "prisma"
      ? "R"
      : (deckById[top] as { suit: "R" }).suit;
  r.players.forEach((p, i) => {
    p.hand = hands[i] ?? [`${suits[i]}-6-2`];
  });
  const assigned = [top, ...r.players.flatMap((p) => p.hand)];
  assert.equal(new Set(assigned).size, assigned.length);
  r.deck = makeDeck(r.rentak!.mode)
    .map((c) => c.id)
    .filter((id) => !assigned.includes(id));
  assertInvariant(r);
}
const play = (r: Room, ids: string[], suit?: (typeof suits)[number]) =>
  playCards(r, r.turn!, ids, suit, r.version, randomUUID(), now);
test("decks have unique 102/90 instances; number opening and seven cards for 2–6 players", () => {
  for (const mode of ["normal", "beginner"] as const) {
    assert.equal(makeDeck(mode).length, mode === "normal" ? 102 : 90);
    for (let n = 2; n <= 6; n++)
      for (let repeat = 0; repeat < 10; repeat++) {
        const r = room(n, mode);
        assertInvariant(r);
        assert.ok(r.players.every((p) => p.hand.length === 7));
        assert.equal(deckById[r.rentak!.discard[0]].kind, "number");
        assert.equal(r.deadline, now + (mode === "normal" ? 30_000 : 45_000));
      }
  }
});
test("matching uses suit, number, action; after Prisma only chosen suit or Prisma", () => {
  assert.ok(matches(deckById["I-2-1"], deckById["R-2-1"], "R"));
  assert.ok(matches(deckById["I-pintas"], deckById["R-pintas"], "R"));
  assert.equal(matches(deckById["I-2-1"], deckById["prisma-1"], "R"), false);
  assert.ok(matches(deckById["prisma-2"], deckById["prisma-1"], "R"));
});
test("Pintas skips; Pusing with two players hands turn to opponent; with three reverses", () => {
  for (const n of [2, 3]) {
    const r = room(n);
    rig(r, [["R-pintas", "A-6-1"]]);
    play(r, ["R-pintas"]);
    assert.equal(r.turn, n === 2 ? "p0" : "p2");
    const b = room(n);
    rig(b, [["R-pusing", "A-6-1"]]);
    play(b, ["R-pusing"]);
    assert.equal(b.rentak!.direction, -1);
    assert.equal(b.turn, n === 2 ? "p1" : "p2");
  }
});
test("Beban accepts any Teduh, rejects stacking and Prisma; draw two ends turn", () => {
  const r = room(3);
  rig(r, [
    ["R-beban", "A-6-1"],
    ["I-teduh", "I-beban", "prisma-1"],
  ]);
  play(r, ["R-beban"]);
  assert.equal(r.rentak!.penalty, 2);
  assert.throws(() => play(r, ["I-beban"]));
  assert.throws(() => play(r, ["prisma-1"], "C"));
  play(r, ["I-teduh"]);
  assert.equal(r.rentak!.penalty, 0);
  assert.equal(r.rentak!.activeSuit, "I");
  assert.equal(r.turn, "p2");
  assertInvariant(r);
  const b = room(3);
  rig(b, [["R-beban", "A-6-1"]]);
  play(b, ["R-beban"]);
  const count = b.players[1].hand.length;
  drawWithoutTarget(b, "p1", 0, randomUUID(), now);
  assert.equal(b.players[1].hand.length, count + 2);
  assert.equal(b.turn, "p2");
});
test("Teduh outside penalty is an ordinary match; does not bank a shield", () => {
  const r = room();
  rig(r, [["I-teduh", "R-teduh", "A-6-1"]]);
  assert.throws(() => play(r, ["I-teduh"]));
  play(r, ["R-teduh"]);
  assert.equal(r.rentak!.penalty, 0);
  assert.equal(r.turn, "p1");
});
test("Prisma requires a suit; other cards reject chosenSuit", () => {
  const r = room();
  rig(r, [["prisma-1", "R-3-1"]]);
  assert.throws(() => play(r, ["prisma-1"]));
  assert.throws(() => play(r, ["R-3-1"], "I"));
  play(r, ["prisma-1"], "C");
  assert.equal(r.rentak!.activeSuit, "C");
  assertInvariant(r);
});
test("Rentak is once per round, consecutive either direction, no wrap, and absent in Beginner", () => {
  for (const pair of [
    ["R-3-1", "R-4-1"],
    ["R-4-1", "R-3-1"],
  ]) {
    const r = room();
    rig(r, [[...pair, "A-6-1"]]);
    play(r, pair);
    assert.equal(r.rentak!.used.p0, true);
    assert.equal(r.rentak!.discard.at(-1), pair[1]);
    assert.equal(r.turn, "p1");
    assertInvariant(r);
  }
  assert.equal(isPair(deckById["R-6-1"], deckById["R-1-1"]), false);
  for (const mode of ["normal", "beginner"] as const) {
    const r = room(2, mode);
    rig(r, [["R-3-1", "R-4-1", "A-6-1"]]);
    if (mode === "normal") r.rentak!.used.p0 = true;
    assert.throws(() => play(r, ["R-3-1", "R-4-1"]));
  }
});
test("winning stops effects immediately, including final Rentak and defensive Teduh", () => {
  for (const card of ["R-pintas", "R-pusing", "R-beban", "prisma-1"]) {
    const r = room();
    rig(r, [[card]]);
    play(r, [card], card.startsWith("prisma") ? "I" : undefined);
    assert.equal(r.phase, "finished");
    assert.equal(r.rentak!.penalty, 0);
    assert.equal(r.rentak!.direction, 1);
    assert.deepEqual(r.winners, ["p0"]);
    assertInvariant(r);
  }
  const r = room();
  rig(r, [["R-3-1", "R-4-1"]]);
  play(r, ["R-3-1", "R-4-1"]);
  assert.equal(r.phase, "finished");
  assert.equal(r.rentak!.scores.p0, 1);
  const b = room();
  rig(b, [["I-teduh"]]);
  b.rentak!.penalty = 2;
  play(b, ["I-teduh"]);
  assert.equal(b.phase, "finished");
});
test("draw is voluntary; only the newly drawn matching card may play and deadline stays", () => {
  const r = room();
  rig(r, [["R-3-1", "R-4-1"]]);
  const draw = "R-5-1";
  r.deck = r.deck.filter((id) => id !== draw);
  r.deck.push(draw);
  const deadline = r.deadline;
  drawWithoutTarget(r, "p0", 0, randomUUID(), now);
  assert.equal(r.turn, "p0");
  assert.equal(r.rentak!.drawn, draw);
  assert.equal(r.deadline, deadline);
  assert.throws(() => play(r, ["R-3-1"]));
  assert.throws(() => play(r, ["R-4-1", draw]));
  assert.throws(() => drawWithoutTarget(r, "p0", 0, randomUUID(), now));
  const other = viewFor(r, "p1");
  assert.equal(other.rentak!.drawn, null);
  assert.ok(!JSON.stringify(other).includes(draw));
  passTurn(r, "p0", 0, randomUUID(), now);
  assert.equal(r.turn, "p1");
  assertInvariant(r);
  assert.throws(() => passTurn(r, "p1", 0, randomUUID(), now));
});
test("unmatched draw ends immediately; timeout draws once and never plays a card", () => {
  const r = room();
  rig(r, [["R-3-1"]]);
  r.deck = r.deck.filter((id) => id !== "I-6-1");
  r.deck.push("I-6-1");
  drawWithoutTarget(r, "p0", 0, randomUUID(), now);
  assert.equal(r.turn, "p1");
  const b = room();
  rig(b, [["R-3-1"]]);
  b.rentak!.drawn = "R-3-1";
  const count = b.players[0].hand.length;
  assert.equal(timeoutTurn(b, b.deadline!), true);
  assert.equal(b.players[0].hand.length, count);
  assert.equal(b.turn, "p1");
});
test("recycling preserves top and Prisma choice, counts all cards exactly once", () => {
  const r = room();
  rig(r, [["I-3-1"], ["A-3-1"]], "prisma-1");
  r.rentak!.discard = [...r.deck, "prisma-1"];
  r.deck = [];
  r.rentak!.activeSuit = "C";
  drawWithoutTarget(r, "p0", 0, randomUUID(), now);
  assertInvariant(r);
  assert.deepEqual(r.rentak!.discard, ["prisma-1"]);
  assert.equal(r.rentak!.activeSuit, "C");
});
test("full cycle without play or draw is a draw without points", () => {
  const r = room();
  rig(r, [["I-3-1"], ["A-3-1"]]);
  r.players[1].hand.push(...r.deck);
  r.deck = [];
  drawWithoutTarget(r, "p0", 0, randomUUID(), now);
  drawWithoutTarget(r, "p1", 0, randomUUID(), now);
  assert.equal(r.phase, "finished");
  assert.deepEqual(r.winners, []);
  assert.equal(r.rentak!.scores.p0, 0);
  assertInvariant(r);
});
test("server rejects stolen, duplicate, stale, out-of-turn and late actions", () => {
  const r = room();
  rig(r, [["R-3-1", "R-4-1"], ["I-3-1"]]);
  const id = randomUUID();
  assert.throws(() => play(r, ["I-3-1"]));
  assert.throws(() => play(r, ["R-3-1", "R-3-1"]));
  assert.throws(() => playCards(r, "p1", ["I-3-1"], undefined, 0, id, now));
  assert.throws(() => playCards(r, "p0", ["R-3-1"], undefined, 9, id, now));
  assert.throws(() =>
    playCards(r, "p0", ["R-3-1"], undefined, 0, id, r.deadline!),
  );
  playCards(r, "p0", ["R-3-1"], undefined, 0, id, now);
  assert.throws(() => drawWithoutTarget(r, "p1", 0, id, now));
});
test("pause preserves remaining time, capped at 30s per interruption and 60s per player", () => {
  const r = room();
  r.turn = "p0";
  const p = r.players[1],
    original = r.deadline!;
  p.connected = false;
  disconnectPlayer(r, p.id, now + 1000);
  assert.equal(r.rentak!.pauseUntil, now + 31000);
  assert.equal(timeoutTurn(r, now + 20000), false);
  p.connected = true;
  reconnectPlayer(r, p.id, now + 6000);
  assert.equal(r.deadline, original + 5000);
  assert.equal(r.rentak!.pauseUsed[p.id], 5000);
  p.connected = false;
  disconnectPlayer(r, p.id, now + 7000);
  settlePause(r, now + 37000);
  assert.equal(r.rentak!.pauseUsed[p.id], 35000);
  p.connected = true;
  reconnectPlayer(r, p.id, now + 38000);
  p.connected = false;
  disconnectPlayer(r, p.id, now + 39000);
  assert.equal(r.rentak!.pauseUntil, now + 64000);
  settlePause(r, now + 64000);
  p.connected = true;
  reconnectPlayer(r, p.id, now + 65000);
  p.connected = false;
  disconnectPlayer(r, p.id, now + 66000);
  assert.equal(r.rentak!.pauseUntil, null);
});
test("withdrawal returns cards hidden, advances turn and distinguishes forfeit win", () => {
  const r = room(3);
  r.turn = "p0";
  withdraw(r, "p0", now);
  assert.equal(r.turn, "p1");
  assert.equal(r.players[0].hand.length, 0);
  assert.equal(r.phase, "playing");
  assertInvariant(r);
  withdraw(r, "p1", now);
  assert.equal(r.phase, "finished");
  assert.equal(r.rentak!.outcome, "withdrawal");
  assert.deepEqual(r.winners, ["p2"]);
  assertInvariant(r);
});
test("three rounds rotate starter and retain scores; tied match has shared winners", () => {
  const r = room();
  r.settings.format = "three-round";
  r.rentak!.format = "three-round";
  for (let round = 1; round <= 3; round++) {
    if (round > 1) {
      r.phase = "lobby";
      startGame(r, r.host, now);
    }
    assert.equal(r.rentak!.roundNumber, round);
    rig(r, [["R-3-1"]]);
    if (round === 3) {
      r.players[1].hand.push(...r.deck);
      r.deck = [];
      r.rentak!.activeSuit = "C";
      drawWithoutTarget(r, "p0", 0, randomUUID(), now);
      drawWithoutTarget(r, "p1", 0, randomUUID(), now);
    } else {
      if (round === 2) {
        rig(r, [["A-3-1"], ["R-3-1"]]);
        r.turn = "p1";
      }
      play(r, ["R-3-1"]);
    }
  }
  assert.equal(r.rentak!.matchOver, true);
  assert.deepEqual(r.rentak!.matchWinners, ["p0", "p1"]);
});
test("300 complete simulations, 2–6 players, both modes; invariants after every command", () => {
  for (let run = 0; run < 300; run++) {
    const r = room(2 + (run % 5), run % 2 ? "normal" : "beginner");
    let actions = 0;
    while (r.phase === "playing" && actions++ < 2000) {
      const s = r.rentak!,
        p = r.players.find((p) => p.id === r.turn)!;
      const valid = p.hand.filter(
        (id) =>
          (!s.drawn || id === s.drawn) &&
          (s.penalty
            ? deckById[id].kind === "teduh"
            : matches(deckById[id], deckById[s.discard.at(-1)!], s.activeSuit)),
      );
      const first = valid[0];
      if (first) {
        const second =
          s.mode === "normal" && !s.used[p.id] && !s.drawn && !s.penalty
            ? p.hand.find((id) => isPair(deckById[first], deckById[id]))
            : undefined;
        play(
          r,
          second ? [first, second] : [first],
          deckById[first].kind === "prisma" ? suits[run % 6] : undefined,
        );
      } else if (s.drawn) passTurn(r, p.id, 0, randomUUID(), now);
      else drawWithoutTarget(r, p.id, 0, randomUUID(), now);
      assertInvariant(r);
    }
    assert.equal(r.phase, "finished", `simulation ${run} must terminate`);
  }
});

test("event IDs remain monotonic across rematches so audio is not suppressed", () => {
  const r = room();
  rig(r, [["R-3-1"]]);
  play(r, ["R-3-1"]);
  const last = r.rentak!.events.at(-1)!.id;
  r.phase = "lobby";
  r.rentak = undefined;
  startGame(r, r.host, now);
  rig(r, [["R-3-1"]]);
  play(r, ["R-3-1"]);
  assert.ok(r.rentak!.events[0].id > last);
});
