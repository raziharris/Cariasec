import cardData from "./cards.json";
import categoryData from "./categories.json";
export const codes = ["R", "I", "A", "S", "E", "C"] as const;
export type Category = (typeof codes)[number];
export const cards = cardData as (Omit<
  (typeof cardData)[number],
  "category"
> & { category: Category })[];
export const categories = categoryData as (Omit<
  (typeof categoryData)[number],
  "code"
> & { code: Category })[];
export const cardById = Object.fromEntries(cards.map((c) => [c.id, c]));
export type { Settings, Command } from "./schemas";
import type { Settings, Command } from "./schemas";
export type Phase = "lobby" | "playing" | "finished" | "cancelled";
export interface Player {
  withdrawn?: boolean;
  id: string;
  name: string;
  tokenHash: string;
  connected: boolean;
  disconnectedAt: number | null;
  ready: boolean;
  hand: string[];
  families: Category[];
}
export interface LogEntry {
  id: number;
  text: string;
  kind:
    "start" | "transfer" | "draw" | "family" | "turn" | "finish" | "connection";
  actor?: string;
  target?: string;
  card?: string;
}
export interface Room {
  eventCounter?: number;
  schemaVersion?: 2;
  rentak?: import("./rentak").RentakState;
  code: string;
  host: string;
  phase: Phase;
  players: Player[];
  settings: Settings;
  deck: string[];
  turn: string | null;
  version: number;
  actions: number;
  log: LogEntry[];
  createdAt: number;
  updatedAt: number;
  deadline: number | null;
  winners: string[];
  reason: string | null;
  processed: string[];
}
export interface PublicPlayer {
  withdrawn?: boolean;
  id: string;
  name: string;
  connected: boolean;
  ready: boolean;
  count: number;
  families: Category[];
}
export interface View {
  rentak?: import("./rentak").RentakView;
  code: string;
  host: string;
  phase: Phase;
  players: PublicPlayer[];
  settings: Settings;
  turn: string | null;
  version: number;
  actions: number;
  log: LogEntry[];
  deadline: number | null;
  winners: string[];
  reason: string | null;
  deckCount: number;
  you: string;
  hand: string[];
  paused: boolean;
}
export interface Session {
  code: string;
  token: string;
}
export type Reply =
  { ok: true; session?: Session } | { ok: false; error: string };
export interface ServerEvents {
  state: (view: View) => void;
  patch: (patch: Partial<View>) => void;
  removed: (message: string) => void;
}
export interface ClientEvents {
  command: (command: Command, ack: (reply: Reply) => void) => void;
  sync: () => void;
}
