import { randomInt } from "node:crypto";
import {
  cards,
  cardById,
  categories,
  codes,
  type Room,
  type Player,
  type View,
  type LogEntry,
} from "../../../shared/game.js";
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
export function collect(r: Room, p: Player) {
  for (const code of codes) {
    if (p.hand.filter((id) => cardById[id].category === code).length === 6) {
      p.hand = p.hand.filter((id) => cardById[id].category !== code);
      p.families.push(code);
      log(
        r,
        `Tahniah! ${p.name} melengkapkan keluarga ${categories.find((c) => c.code === code)!.name}.`,
        "family",
        { actor: p.id },
      );
    }
  }
}
function finish(r: Room, reason: string) {
  r.phase = "finished";
  r.reason = reason;
  r.deadline = null;
  r.turn = null;
  const best = Math.max(
    ...r.players.map((p) => p.families.length * 100 + p.hand.length),
  );
  r.winners = r.players
    .filter((p) => p.families.length * 100 + p.hand.length === best)
    .map((p) => p.id);
  log(r, "Permainan tamat. Lihat keputusan anda!", "finish");
}
function checkEnd(r: Room) {
  if (r.players.reduce((n, p) => n + p.families.length, 0) === 6)
    finish(r, "Semua enam keluarga telah lengkap.");
  else if (r.actions >= r.settings.maxActions)
    finish(r, `Had ${r.settings.maxActions} tindakan telah dicapai.`);
}
function prepareTurn(r: Room, id: string, now: number) {
  let index = r.players.findIndex((p) => p.id === id);
  for (let n = 0; n < r.players.length; n++) {
    const p = r.players[index];
    if (!p.hand.length && r.deck.length) {
      p.hand.push(r.deck.pop()!);
      collect(r, p);
    }
    if (p.hand.length) {
      r.turn = p.id;
      r.deadline = now + r.settings.turnSeconds * 1000;
      return;
    }
    index = (index + 1) % r.players.length;
  }
  checkEnd(r);
  if (r.phase === "playing") finish(r, "Tiada kad yang boleh dimainkan.");
}
export function startGame(r: Room, actor: string, now = Date.now()) {
  ensure(r.phase === "lobby", "Permainan sudah bermula.");
  ensure(r.host === actor, "Hanya hos boleh memulakan permainan.");
  ensure(
    r.players.length >= 2 && r.players.length <= 6,
    "Perlu 2 hingga 6 pemain.",
  );
  ensure(
    r.players.every((p) => p.connected && p.ready),
    "Semua pemain perlu bersedia dan tersambung.",
  );
  r.deck = shuffle(cards.map((c) => c.id));
  r.actions = 0;
  r.winners = [];
  r.reason = null;
  r.processed = [];
  r.log = [];
  for (const p of r.players) {
    p.hand = [];
    p.families = [];
  }
  const amount = r.players.length === 2 ? 7 : 5;
  for (let i = 0; i < amount; i++)
    for (const p of r.players) p.hand.push(r.deck.pop()!);
  r.phase = "playing";
  log(r, "Permainan bermula! Kumpulkan enam kad dalam satu keluarga.", "start");
  for (const p of r.players) collect(r, p);
  prepareTurn(r, r.players[0].id, now);
  checkEnd(r);
}
export function requestCard(
  r: Room,
  actor: string,
  target: string,
  card: string,
  version: number,
  actionId: string,
  now = Date.now(),
) {
  ensure(r.phase === "playing", "Permainan tidak sedang berlangsung.");
  ensure(
    r.players.every((p) => p.connected),
    "Permainan dijeda sementara pemain menyambung semula.",
  );
  ensure(r.version === version, "Papan telah berubah. Cuba sekali lagi.");
  ensure(!r.processed.includes(actionId), "Tindakan ini telah diterima.");
  ensure(r.turn === actor, "Belum giliran anda.");
  ensure(r.deadline !== null && now < r.deadline, "Masa giliran telah tamat.");
  const p = r.players.find((p) => p.id === actor)!;
  const t = r.players.find((p) => p.id === target);
  ensure(
    t && t !== p && t.hand.length,
    "Pilih pemain lain yang mempunyai kad.",
  );
  ensure(cardById[card], "Kad tidak sah.");
  ensure(!p.hand.includes(card), "Anda sudah mempunyai kad ini.");
  ensure(
    p.hand.some((id) => cardById[id].category === cardById[card].category),
    "Anda perlu memiliki kad daripada keluarga yang sama.",
  );
  r.processed.push(actionId);
  r.processed = r.processed.slice(-200);
  r.actions++;
  const found = t.hand.indexOf(card);
  let keep = false;
  if (found >= 0) {
    t.hand.splice(found, 1);
    p.hand.push(card);
    keep = true;
    log(
      r,
      `${p.name} menerima ${cardById[card].title} daripada ${t.name}.`,
      "transfer",
      { actor, target, card },
    );
  } else {
    const drawn = r.deck.pop();
    if (drawn) p.hand.push(drawn);
    keep = drawn === card;
    log(
      r,
      `${t.name} tiada ${cardById[card].title}. ${p.name} ${drawn ? "mengambil satu kad" : "meneruskan giliran seterusnya"}.`,
      "draw",
      { actor, target, card },
    );
  }
  collect(r, p);
  checkEnd(r);
  if (r.phase === "playing")
    prepareTurn(
      r,
      keep ? p.id : r.players[(r.players.indexOf(p) + 1) % r.players.length].id,
      now,
    );
}
export function timeoutTurn(r: Room, now = Date.now()) {
  if (
    r.phase !== "playing" ||
    r.players.some((p) => !p.connected) ||
    !r.deadline ||
    now < r.deadline
  )
    return false;
  const p = r.players.find((p) => p.id === r.turn)!;
  const drawn = r.deck.pop();
  if (drawn) p.hand.push(drawn);
  r.actions++;
  log(
    r,
    `Masa ${p.name} tamat. ${drawn ? "Satu kad diambil. " : ""}Giliran pemain seterusnya.`,
    "draw",
    { actor: p.id },
  );
  collect(r, p);
  checkEnd(r);
  if (r.phase === "playing")
    prepareTurn(
      r,
      r.players[(r.players.indexOf(p) + 1) % r.players.length].id,
      now,
    );
  return true;
}
export function drawWithoutTarget(
  r: Room,
  actor: string,
  version: number,
  actionId: string,
  now = Date.now(),
) {
  ensure(r.phase === "playing" && r.turn === actor, "Belum giliran anda.");
  ensure(
    r.players.every((p) => p.connected),
    "Permainan dijeda.",
  );
  ensure(
    version === r.version && !r.processed.includes(actionId),
    "Tindakan telah berubah atau sudah diterima.",
  );
  ensure(r.deadline !== null && now < r.deadline, "Masa giliran telah tamat.");
  ensure(
    r.players.every((p) => p.id === actor || p.hand.length === 0),
    "Minta kad daripada pemain yang mempunyai kad.",
  );
  const p = r.players.find((p) => p.id === actor)!;
  const drawn = r.deck.pop();
  if (drawn) p.hand.push(drawn);
  r.actions++;
  r.processed.push(actionId);
  r.processed = r.processed.slice(-200);
  log(
    r,
    `${p.name} ${drawn ? "mengambil satu kad" : "melepaskan giliran"} kerana tiada rakan yang mempunyai kad.`,
    "draw",
    { actor },
  );
  collect(r, p);
  checkEnd(r);
  if (r.phase === "playing")
    prepareTurn(
      r,
      r.players[(r.players.indexOf(p) + 1) % r.players.length].id,
      now,
    );
}
export function cancel(r: Room, reason: string) {
  r.phase = "cancelled";
  r.reason = reason;
  r.turn = null;
  r.deadline = null;
  r.winners = [];
  log(r, reason, "finish");
}
export function viewFor(r: Room, id: string): View {
  const p = r.players.find((p) => p.id === id)!;
  return {
    code: r.code,
    host: r.host,
    phase: r.phase,
    players: r.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar ?? 'cat',
      connected: p.connected,
      ready: p.ready,
      count: p.hand.length,
      families: [...p.families],
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
    paused: r.phase === "playing" && r.players.some((p) => !p.connected),
  };
}
export function assertInvariant(r: Room) {
  if (r.phase === "lobby") return;
  const all = [
    ...r.deck,
    ...r.players.flatMap((p) => [
      ...p.hand,
      ...p.families.flatMap((code) =>
        cards.filter((c) => c.category === code).map((c) => c.id),
      ),
    ]),
  ];
  ensure(
    all.length === 36 &&
      new Set(all).size === 36 &&
      all.every((id) => cardById[id]),
    "Integriti kad tidak sah.",
  );
  ensure(
    r.phase !== "playing" ||
      r.players.some((p) => p.id === r.turn && p.hand.length > 0),
    "Giliran tidak sah.",
  );
}
