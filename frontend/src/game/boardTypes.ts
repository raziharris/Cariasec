import type { Category, LogEntry } from "../../../shared/game";
import type { SoundCue } from "../audio/SoundManager";

export interface BoardCard {
  id: string;
  title: string;
  category: Category;
  categoryName: string;
  artwork: string;
}

export interface BoardPlayer {
  id: string;
  name: string;
  connected: boolean;
  count: number;
  families: Category[];
}

export interface BoardLabels {
  activeRound: string;
  paused: string;
  waiting: string;
  yourTurn: string;
  friendTurn: string;
  chooseCard: string;
  planMove: string;
  waitingFriend: string;
  seconds: string;
  cards: string;
  complete: string;
  deck: string;
}

export interface BoardState {
  you: string;
  turn: string | null;
  paused: boolean;
  deadline: number | null;
  turnSeconds: number;
  actions: number;
  maxActions: number;
  deckCount: number;
  hand: BoardCard[];
  players: BoardPlayer[];
  selectedFamily: Category;
  selectedTarget: string;
  latest?: LogEntry;
  soundCue?: SoundCue;
  latestText: string;
  labels: BoardLabels;
  reducedMotion: boolean;
}
