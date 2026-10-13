import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import type { View } from "../../../shared/game";
import { soundManager, type SoundCue } from "./SoundManager";

// Reconnects and historical logs stay silent. Each new server snapshot
// produces at most one cue; Phaser emits it when the board animation starts.
export function gameSoundCue(previous: View | null, next: View | null): SoundCue | undefined {
  if (!previous || !next || previous.code !== next.code || previous.version === next.version) return;
  const key = `room:${next.code}:${next.version}`;
  if (next.phase === "finished" && previous.phase === "playing") {
    return next.winners.includes(next.you) ? { name: "win", key } : undefined;
  }
  if (next.phase !== "playing") return;
  if (previous.phase === "lobby") return { name: "card", key };
  const lastId = previous.log.at(-1)?.id ?? 0;
  const fresh = next.log.filter((entry) => entry.id > lastId);
  if (fresh.some((entry) => entry.kind === "family" && entry.actor === next.you)) return { name: "win", key };
  if (fresh.some((entry) => entry.kind === "draw" || entry.kind === "transfer")) return { name: "card", key };
}

export function useGameSound(room: View | null) {
  const previous = useRef<View | null>(null);
  const cue = useMemo(() => gameSoundCue(previous.current, room), [room]);
  useLayoutEffect(() => { previous.current = room; }, [room]);
  useEffect(() => {
    if (room?.phase === "finished" && cue) soundManager.playSound(cue.name, cue.key);
  }, [room, cue]);
  return cue;
}
