import React, {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
} from "react";
import type Phaser from "phaser";
import { EventBus } from "../game/EventBus";
import { startGame } from "../game/main";
import type { BoardState } from "../game/boardTypes";
import { soundManager, type SoundCue } from "../audio/SoundManager";

export interface PhaserBoardRef {
  game: Phaser.Game | null;
  scene: Phaser.Scene | null;
}

interface PhaserBoardProps {
  state: BoardState;
  onSelectFamily: (family: BoardState["selectedFamily"]) => void;
  onSelectTarget: (playerId: string) => void;
  onInspectCard: (cardId: string) => void;
}

export const PhaserBoard = forwardRef<PhaserBoardRef, PhaserBoardProps>(
  function PhaserBoard(
    { state, onSelectFamily, onSelectTarget, onInspectCard },
    forwardedRef,
  ) {
    const generatedId = useId().replace(/:/g, "");
    const parentId = `cariasec-phaser-${generatedId}`;
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);

    useLayoutEffect(() => {
      const sound = (cue: SoundCue) => soundManager.playSound(cue.name, cue.key);
      EventBus.on("game-sound", sound);
      const ready = (scene: Phaser.Scene) => {
        sceneRef.current = scene;
        if (typeof forwardedRef === "function") {
          forwardedRef({ game: gameRef.current, scene });
        } else if (forwardedRef) {
          forwardedRef.current = { game: gameRef.current, scene };
        }
        EventBus.emit("board-state", state);
      };
      EventBus.on("current-scene-ready", ready);
      gameRef.current = startGame(parentId);
      const clockTimer = window.setInterval(
        () => EventBus.emit("board-clock"),
        1000,
      );
      return () => {
        window.clearInterval(clockTimer);
        EventBus.off("current-scene-ready", ready);
        EventBus.emit("destroy-board");
        EventBus.off("game-sound", sound);
        gameRef.current?.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      };
    }, [forwardedRef, parentId]);

    useEffect(() => {
      EventBus.emit("board-state", state);
    }, [state]);

    useEffect(() => {
      const chooseFamily = (family: BoardState["selectedFamily"]) =>
        onSelectFamily(family);
      const chooseTarget = (playerId: string) => onSelectTarget(playerId);
      const inspect = (cardId: string) => onInspectCard(cardId);
      EventBus.on("select-family", chooseFamily);
      EventBus.on("select-target", chooseTarget);
      EventBus.on("inspect-card", inspect);
      return () => {
        EventBus.off("select-family", chooseFamily);
        EventBus.off("select-target", chooseTarget);
        EventBus.off("inspect-card", inspect);
      };
    }, [onInspectCard, onSelectFamily, onSelectTarget]);

    return (
      <div
        id={parentId}
        className="phaser-board"
        role="img"
        aria-label={`${state.labels.activeRound}. ${state.latestText}`}
        onPointerDownCapture={() => gameRef.current?.loop.wake()}
      />
    );
  },
);
