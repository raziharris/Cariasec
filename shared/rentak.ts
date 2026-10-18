export const suits = ["R", "I", "A", "S", "E", "C"] as const;
export type Suit = (typeof suits)[number];
export type Mode = "beginner" | "normal";
export type Format = "quick" | "three-round";
export const identities: Record<
  Suit,
  { name: string; en: string; color: string; symbol: string }
> = {
  R: { name: "Pembina", en: "Builders", color: "#9C701F", symbol: "⬡" },
  I: { name: "Peneroka", en: "Explorers", color: "#367A38", symbol: "◎" },
  A: { name: "Pencipta", en: "Creators", color: "#B54617", symbol: "★" },
  S: { name: "Penghubung", en: "Connectors", color: "#73278F", symbol: "●●" },
  E: { name: "Penggerak", en: "Leaders", color: "#245AA0", symbol: "ϟ" },
  C: { name: "Penyusun", en: "Organizers", color: "#575C5A", symbol: "▦" },
};
export type Card = { id: string } & (
  | { kind: "number"; suit: Suit; rank: number }
  | { kind: "pintas" | "pusing" | "beban" | "teduh"; suit: Suit }
  | { kind: "prisma" }
);
export function makeDeck(mode: Mode = "normal"): Card[] {
  const result: Card[] = [];
  for (const suit of suits) {
    for (let rank = 1; rank <= 6; rank++)
      for (let copy = 1; copy <= 2; copy++)
        result.push({
          id: `${suit}-${rank}-${copy}`,
          kind: "number",
          suit,
          rank,
        });
    for (const kind of ["pintas", "pusing", "beban", "teduh"] as const) {
      if (mode === "beginner" && (kind === "pusing" || kind === "teduh"))
        continue;
      result.push({ id: `${suit}-${kind}`, kind, suit });
    }
  }
  for (let copy = 1; copy <= 6; copy++)
    result.push({ id: `prisma-${copy}`, kind: "prisma" });
  return result;
}
export const deckById: Record<string, Card> = Object.fromEntries(
  makeDeck().map((c) => [c.id, c]),
);
export const marks = {
  pintas: "⊘",
  pusing: "↶",
  beban: "+2",
  teduh: "◇",
  prisma: "✦",
};
export function cardMark(card: Card) {
  return card.kind === "number" ? String(card.rank) : marks[card.kind];
}
export function matches(card: Card, top: Card, activeSuit: Suit): boolean {
  return (
    card.kind === "prisma" ||
    card.suit === activeSuit ||
    (card.kind === "number" &&
      top.kind === "number" &&
      card.rank === top.rank) ||
    (card.kind !== "number" && card.kind === top.kind)
  );
}
export function isPair(first: Card, second: Card) {
  return (
    first.id !== second.id &&
    first.kind === "number" &&
    second.kind === "number" &&
    first.suit === second.suit &&
    Math.abs(first.rank - second.rank) === 1
  );
}
export type EventKind =
  | "cardPlayed"
  | "cardsDrawn"
  | "directionChanged"
  | "penaltyIssued"
  | "penaltyBlocked"
  | "rentakUsed"
  | "roundEnded"
  | "turnPassed";
export interface RentakEvent {
  id: number;
  type: EventKind;
  actor: string;
  cards?: string[];
  amount?: number;
}
export interface RentakState {
  schemaVersion: 2;
  rulesVersion: "rentak-v1";
  mode: Mode;
  format: Format;
  roundNumber: number;
  starter: number;
  scores: Record<string, number>;
  discard: string[];
  activeSuit: Suit;
  direction: 1 | -1;
  penalty: number;
  drawn: string | null;
  used: Record<string, boolean>;
  idleTurns: number;
  progress: boolean;
  matchOver: boolean;
  matchWinners: string[];
  outcome: "normal" | "draw" | "withdrawal" | null;
  events: RentakEvent[];
  pauseUntil: number | null;
  pauseStarted: number | null;
  pauseUsed: Record<string, number>;
  pauseGrants: Record<string, number>;
}
export type RentakView = Omit<
  RentakState,
  | "discard"
  | "drawn"
  | "idleTurns"
  | "progress"
  | "starter"
  | "pauseUsed"
  | "pauseGrants"
  | "pauseStarted"
> & { top: string; drawn: string | null; hasDrawn: boolean };
