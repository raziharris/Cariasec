import { randomInt } from "node:crypto";
import type { Room, Player, View, LogEntry } from "../../../shared/game.js";
import {
  makeDeck,
  deckById,
  matches,
  isPair,
  suits,
  type Suit,
  type RentakState,
  type EventKind,
} from "../../../shared/rentak.js";
export class GameError extends Error {}
export function ensure(value: unknown, message: string): asserts value {
  if (!value) throw new GameError(message);
}
export function shuffle<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function log(
  r: Room,
  text: string,
  kind: LogEntry["kind"],
  extra: Partial<LogEntry> = {},
) {
  r.log.push({ id: (r.log.at(-1)?.id ?? 0) + 1, text, kind, ...extra });
  r.log = r.log.slice(-24);
}
const state = (r: Room) => {
  ensure(r.rentak, "Bilik ini bukan versi Rentak.");
  return r.rentak;
};
const active = (r: Room) => r.players.filter((p) => !p.withdrawn);
function event(
  r: Room,
  type: EventKind,
  actor: string,
  cards?: string[],
  amount?: number,
) {
  const s = state(r);
  r.eventCounter = (r.eventCounter ?? s.events.at(-1)?.id ?? 0) + 1;
  s.events.push({
    id: r.eventCounter,
    type,
    actor,
    ...(cards ? { cards } : {}),
    ...(amount !== undefined ? { amount } : {}),
  });
  s.events = s.events.slice(-32);
}
export function paused(r: Room, now = Date.now()) {
  return (
    r.phase === "playing" && !!r.rentak?.pauseUntil && now < r.rentak.pauseUntil
  );
}
export function settlePause(r: Room, now = Date.now()) {
  const s = r.rentak;
  if (s?.pauseStarted == null || s.pauseUntil == null) return false;
  if (active(r).some((p) => !p.connected) && now < s.pauseUntil) return false;
  const end = Math.min(now, s.pauseUntil);
  for (const [id, start] of Object.entries(s.pauseGrants))
    s.pauseUsed[id] = (s.pauseUsed[id] ?? 0) + Math.max(0, end - start);
  if (r.deadline) r.deadline += Math.max(0, end - s.pauseStarted);
  s.pauseStarted = null;
  s.pauseUntil = null;
  s.pauseGrants = {};
  return true;
}
export function disconnectPlayer(r: Room, id: string, now = Date.now()) {
  settlePause(r, now);
  const s = r.rentak;
  if (r.phase !== "playing" || !s) return;
  const grant = Math.min(30_000, Math.max(0, 60_000 - (s.pauseUsed[id] ?? 0)));
  if (!grant) return;
  if (!s.pauseUntil) {
    s.pauseStarted = now;
    s.pauseUntil = now + grant;
  } else s.pauseUntil = Math.min(s.pauseUntil, now + grant);
  s.pauseGrants[id] = now;
}
export function reconnectPlayer(r: Room, id: string, now = Date.now()) {
  const s = r.rentak;
  if (!s) return;
  if (s.pauseGrants[id] !== undefined) {
    s.pauseUsed[id] =
      (s.pauseUsed[id] ?? 0) +
      Math.max(0, Math.min(now, s.pauseUntil ?? now) - s.pauseGrants[id]);
    delete s.pauseGrants[id];
  }
  settlePause(r, now);
}
function finish(
  r: Room,
  winner: string | null,
  outcome: RentakState["outcome"] = "normal",
) {
  const s = state(r);
  r.phase = "finished";
  r.turn = null;
  r.deadline = null;
  s.penalty = 0;
  s.drawn = null;
  s.pauseUntil = null;
  s.pauseStarted = null;
  s.pauseGrants = {};
  r.winners = winner ? [winner] : [];
  s.outcome = outcome;
  if (winner) s.scores[winner] = (s.scores[winner] ?? 0) + 1;
  s.matchOver =
    s.format === "quick" || s.roundNumber >= 3 || active(r).length < 2;
  if (s.matchOver) {
    const best = Math.max(...active(r).map((p) => s.scores[p.id] ?? 0));
    s.matchWinners = active(r)
      .filter((p) => (s.scores[p.id] ?? 0) === best)
      .map((p) => p.id);
    if (s.format === "quick" && outcome === "draw") s.matchWinners = [];
  }
  r.reason =
    outcome === "draw"
      ? "Seri: tiada kad boleh dimainkan atau diambil."
      : outcome === "withdrawal"
        ? "Menang kerana lawan keluar."
        : "Tangan kosong. Pusingan dimenangi!";
  event(r, "roundEnded", winner ?? "");
  log(r, r.reason, "finish");
}
function prepareTurn(r: Room, id: string, now: number) {
  const s = state(r);
  r.turn = id;
  s.drawn = null;
  s.progress = false;
  r.deadline = now + (s.mode === "beginner" ? 45 : 30) * 1000;
}
function nextId(r: Room, steps = 1) {
  const players = active(r),
    index = players.findIndex((p) => p.id === r.turn),
    direction = state(r).direction;
  return players[
    (((index + direction * steps) % players.length) + players.length) %
      players.length
  ].id;
}
function endTurn(r: Room, now: number, steps = 1) {
  const s = state(r);
  s.idleTurns = s.progress ? 0 : s.idleTurns + 1;
  if (s.idleTurns >= active(r).length) {
    finish(r, null, "draw");
    return;
  }
  prepareTurn(r, nextId(r, steps), now);
}
function take(r: Room, p: Player, amount: number) {
  const s = state(r),
    taken: string[] = [];
  for (let i = 0; i < amount; i++) {
    if (!r.deck.length && s.discard.length > 1) {
      const top = s.discard.pop()!;
      r.deck = shuffle(s.discard);
      s.discard = [top];
    }
    const card = r.deck.pop();
    if (!card) break;
    p.hand.push(card);
    taken.push(card);
  }
  if (taken.length) s.progress = true;
  event(r, "cardsDrawn", p.id, undefined, taken.length);
  log(r, `${p.name} mengambil ${taken.length} kad.`, "draw", { actor: p.id });
  return taken;
}
export function startGame(r: Room, actor: string, now = Date.now()) {
  ensure(r.phase === "lobby", "Permainan sudah bermula.");
  ensure(r.host === actor, "Hanya hos boleh memulakan permainan.");
  const players = active(r);
  ensure(
    players.length >= 2 && players.length <= 6,
    "Perlu 2 hingga 6 pemain.",
  );
  ensure(
    players.every((p) => p.ready && p.connected),
    "Semua pemain perlu bersedia dan tersambung.",
  );
  const previous = r.rentak,
    continuing = previous && !previous.matchOver;
  const mode = r.settings.mode ?? "normal",
    format = r.settings.format ?? "quick";
  r.schemaVersion = 2;
  r.rentak = {
    schemaVersion: 2,
    rulesVersion: "rentak-v1",
    mode,
    format,
    roundNumber: continuing ? previous.roundNumber + 1 : 1,
    starter: continuing
      ? (previous.starter + 1) % players.length
      : randomInt(players.length),
    scores: continuing
      ? { ...previous.scores }
      : Object.fromEntries(players.map((p) => [p.id, 0])),
    discard: [],
    activeSuit: "R",
    direction: 1,
    penalty: 0,
    drawn: null,
    used: {},
    idleTurns: 0,
    progress: false,
    matchOver: false,
    matchWinners: [],
    outcome: null,
    events: previous?.events ?? [],
    pauseUntil: null,
    pauseStarted: null,
    pauseUsed: {},
    pauseGrants: {},
  };
  const s = r.rentak;
  r.deck = shuffle(makeDeck(mode).map((c) => c.id));
  r.actions = 0;
  r.winners = [];
  r.reason = null;
  r.processed = [];
  r.log = [];
  for (const p of r.players) {
    p.hand = [];
    p.families = [];
  }
  for (let i = 0; i < 7; i++)
    for (const p of players) p.hand.push(r.deck.pop()!);
  const opening = r.deck.findIndex((id) => deckById[id].kind === "number");
  const top = r.deck.splice(opening, 1)[0];
  s.discard = [top];
  s.activeSuit = (deckById[top] as { suit: Suit }).suit;
  r.deck = shuffle(r.deck);
  r.phase = "playing";
  prepareTurn(r, players[s.starter].id, now);
  log(r, "Cari padanan. Cetus Rentak. Habiskan tangan!", "start");
}
function validate(
  r: Room,
  actor: string,
  version: number,
  actionId: string,
  now: number,
) {
  ensure(r.phase === "playing", "Pusingan tidak sedang berlangsung.");
  ensure(
    !paused(r, now),
    "Permainan dijeda sementara pemain menyambung semula.",
  );
  settlePause(r, now);
  ensure(r.version === version, "Papan telah berubah. Cuba sekali lagi.");
  ensure(!r.processed.includes(actionId), "Tindakan ini telah diterima.");
  ensure(r.turn === actor, "Belum giliran anda.");
  ensure(r.deadline !== null && now < r.deadline, "Masa giliran telah tamat.");
  const p = r.players.find((p) => p.id === actor && !p.withdrawn);
  ensure(p, "Pemain tidak sah.");
  return p;
}
function accepted(r: Room, actionId: string) {
  r.processed.push(actionId);
  r.processed = r.processed.slice(-200);
  r.actions++;
}
export function playCards(
  r: Room,
  actor: string,
  ids: string[],
  chosenSuit: Suit | undefined,
  version: number,
  actionId: string,
  now = Date.now(),
) {
  const p = validate(r, actor, version, actionId, now),
    s = state(r);
  ensure(
    ids.length >= 1 && ids.length <= 2 && new Set(ids).size === ids.length,
    "Pilih satu kad atau dua kad Rentak.",
  );
  ensure(
    ids.every((id) => p.hand.includes(id) && deckById[id]),
    "Kad bukan milik anda.",
  );
  const first = deckById[ids[0]],
    top = deckById[s.discard.at(-1)!];
  ensure(
    first.kind === "prisma"
      ? !!chosenSuit && suits.includes(chosenSuit)
      : chosenSuit === undefined,
    "Pilih warna hanya untuk Prisma.",
  );
  if (s.penalty)
    ensure(
      ids.length === 1 && first.kind === "teduh",
      "Main Teduh atau ambil dua kad.",
    );
  else
    ensure(
      matches(first, top, s.activeSuit),
      "Padankan warna, nombor atau simbol aksi.",
    );
  if (s.drawn)
    ensure(
      ids.length === 1 && ids[0] === s.drawn,
      "Hanya kad yang baru diambil boleh dimainkan.",
    );
  if (ids.length === 2)
    ensure(
      s.mode === "normal" &&
        !s.used[actor] &&
        !s.drawn &&
        !s.penalty &&
        isPair(first, deckById[ids[1]]),
      "Rentak perlu dua nombor berturutan dalam warna sama, sekali setiap pusingan.",
    );
  accepted(r, actionId);
  p.hand = p.hand.filter((id) => !ids.includes(id));
  s.discard.push(...ids);
  s.progress = true;
  const last = deckById[ids.at(-1)!];
  s.activeSuit = last.kind === "prisma" ? chosenSuit! : last.suit;
  if (ids.length === 2) s.used[actor] = true;
  event(r, ids.length === 2 ? "rentakUsed" : "cardPlayed", actor, ids);
  log(
    r,
    `${p.name} ${ids.length === 2 ? "mencetus Rentak!" : "memainkan kad."}`,
    "transfer",
    { actor, card: ids.at(-1) },
  );
  if (!p.hand.length) {
    finish(r, actor);
    return;
  }
  if (s.penalty) {
    s.penalty = 0;
    event(r, "penaltyBlocked", actor);
  } else if (last.kind === "beban") {
    s.penalty = 2;
    event(r, "penaltyIssued", actor, undefined, 2);
  } else if (last.kind === "pusing") {
    s.direction = s.direction === 1 ? -1 : 1;
    event(r, "directionChanged", actor);
  }
  endTurn(r, now, last.kind === "pintas" ? 2 : 1);
}
export function drawWithoutTarget(
  r: Room,
  actor: string,
  version: number,
  actionId: string,
  now = Date.now(),
) {
  const p = validate(r, actor, version, actionId, now),
    s = state(r);
  ensure(!s.drawn, "Anda sudah mengambil kad. Main kad baharu atau simpan.");
  accepted(r, actionId);
  const penalty = s.penalty,
    taken = take(r, p, penalty || 1);
  s.penalty = 0;
  if (
    !penalty &&
    taken.length &&
    matches(deckById[taken[0]], deckById[s.discard.at(-1)!], s.activeSuit)
  )
    s.drawn = taken[0];
  else endTurn(r, now);
}
export function passTurn(
  r: Room,
  actor: string,
  version: number,
  actionId: string,
  now = Date.now(),
) {
  validate(r, actor, version, actionId, now);
  ensure(state(r).drawn, "Ambil kad dahulu.");
  accepted(r, actionId);
  event(r, "turnPassed", actor);
  endTurn(r, now);
}
export function timeoutTurn(r: Room, now = Date.now()) {
  if (r.phase !== "playing" || paused(r, now)) return false;
  const resumed = settlePause(r, now);
  if (!r.deadline || now < r.deadline) return resumed;
  const p = active(r).find((p) => p.id === r.turn)!;
  const s = state(r);
  if (!s.drawn) take(r, p, s.penalty || 1);
  s.penalty = 0;
  r.actions++;
  event(r, "turnPassed", p.id);
  endTurn(r, now);
  return true;
}
export function withdraw(r: Room, id: string, now = Date.now()) {
  const p = r.players.find((p) => p.id === id);
  if (!p || p.withdrawn) return;
  const next = r.phase === "playing" && r.turn === id ? nextId(r) : null;
  p.withdrawn = true;
  p.ready = false;
  p.connected = false;
  p.tokenHash = "";
  r.deck = shuffle([...r.deck, ...p.hand]);
  p.hand = [];
  reconnectPlayer(r, id, now);
  if (r.host === id)
    r.host = active(r).find((p) => p.connected)?.id ?? active(r)[0]?.id ?? "";
  if (r.phase === "playing") {
    if (active(r).length < 2) finish(r, active(r)[0]?.id ?? null, "withdrawal");
    else if (next) {
      state(r).penalty = 0;
      prepareTurn(r, next, now);
    }
  } else if (r.rentak && active(r).length < 2) r.rentak.matchOver = true;
}
export function cancel(r: Room, reason: string) {
  r.phase = "cancelled";
  r.reason = reason;
  r.turn = null;
  r.deadline = null;
  r.winners = [];
}
export function requestCard(..._args: unknown[]): never {
  throw new GameError("Gunakan Main kad dalam CARIASEC: RENTAK.");
}
export function collect(..._args: unknown[]): never {
  throw new GameError("Koleksi keluarga kini berada di halaman Learn.");
}
export function viewFor(r: Room, id: string): View {
  const p = r.players.find((p) => p.id === id)!;
  const s = r.rentak;
  return {
    code: r.code,
    host: r.host,
    phase: r.phase,
    players: r.players.map((p) => ({
      id: p.id,
      name: p.name,
      connected: p.connected,
      ready: p.ready,
      count: p.hand.length,
      families: [],
      withdrawn: p.withdrawn,
    })),
    settings: { ...r.settings },
    turn: r.turn,
    version: r.version,
    actions: r.actions,
    log: r.log.map((x) => ({ ...x })),
    deadline: r.deadline,
    winners: [...r.winners],
    reason: r.reason,
    deckCount: r.deck.length,
    you: id,
    hand: [...p.hand],
    paused: paused(r),
    ...(s
      ? {
          rentak: {
            schemaVersion: 2,
            rulesVersion: "rentak-v1",
            mode: s.mode,
            format: s.format,
            roundNumber: s.roundNumber,
            scores: { ...s.scores },
            top: s.discard.at(-1) ?? "",
            activeSuit: s.activeSuit,
            direction: s.direction,
            penalty: s.penalty,
            drawn: r.turn === id ? s.drawn : null,
            hasDrawn: !!s.drawn,
            used: { ...s.used },
            matchOver: s.matchOver,
            matchWinners: [...s.matchWinners],
            outcome: s.outcome,
            events: structuredClone(s.events),
            pauseUntil: s.pauseUntil,
          },
        }
      : {}),
  };
}
export function assertInvariant(r: Room) {
  if (r.phase === "lobby" || !r.rentak) return;
  const s = state(r),
    all = [...r.deck, ...s.discard, ...r.players.flatMap((p) => p.hand)],
    expected = makeDeck(s.mode).map((c) => c.id);
  ensure(
    all.length === expected.length &&
      new Set(all).size === expected.length &&
      all.every((id) => expected.includes(id)),
    "Integriti kad tidak sah.",
  );
  ensure(
    r.phase !== "playing" ||
      active(r).some((p) => p.id === r.turn && p.hand.length),
    "Giliran tidak sah.",
  );
  ensure(s.penalty === 0 || s.penalty === 2, "Penalti tidak sah.");
}
