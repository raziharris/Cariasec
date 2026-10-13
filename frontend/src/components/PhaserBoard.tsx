import React, {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type Phaser from "phaser";
import { EventBus } from "../game/EventBus";
import { startGame } from "../game/main";
import type { BoardState } from "../game/boardTypes";
import { soundManager, type SoundCue } from "../audio/SoundManager";
import { LoadingCards } from './LoadingCards';
import { useI18n } from '../i18n';

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
    const { t } = useI18n();
    const [rendered, setRendered] = useState(false);
    const [progress, setProgress] = useState(0);
    const [slow, setSlow] = useState(false);
    const [retry, setRetry] = useState(0);
    const parentId = `cariasec-phaser-${generatedId}`;
    const gameRef = useRef<Phaser.Game | null>(null);
    const sceneRef = useRef<Phaser.Scene | null>(null);
    const stateRef = useRef(state);
    stateRef.current = state;

    useLayoutEffect(() => {
      setRendered(false);
      setSlow(false);
      setProgress(0);
      const shown = (game: Phaser.Game) => { if (game === gameRef.current) setRendered(true); };
      const loading = (value: number, game: Phaser.Game) => { if (game === gameRef.current) setProgress(value); };
      EventBus.on('board-rendered', shown);
      EventBus.on('board-loading', loading);
      const slowTimer = window.setTimeout(() => setSlow(true), 10000);
      const sound = (cue: SoundCue) => soundManager.playSound(cue.name, cue.key);
      EventBus.on("game-sound", sound);
      const ready = (scene: Phaser.Scene) => {
        if (scene.game !== gameRef.current) return;
        sceneRef.current = scene;
        if (typeof forwardedRef === "function") {
          forwardedRef({ game: gameRef.current, scene });
        } else if (forwardedRef) {
          forwardedRef.current = { game: gameRef.current, scene };
        }
        EventBus.emit("board-state", stateRef.current);
      };
      EventBus.on("current-scene-ready", ready);
      gameRef.current = startGame(parentId);
      const clockTimer = window.setInterval(
        () => EventBus.emit("board-clock"),
        1000,
      );
      return () => {
        window.clearTimeout(slowTimer);
        EventBus.off('board-rendered', shown);
        EventBus.off('board-loading', loading);
        window.clearInterval(clockTimer);
        EventBus.off("current-scene-ready", ready);
        EventBus.emit("destroy-board");
        EventBus.off("game-sound", sound);
        gameRef.current?.loop.wake();
        gameRef.current?.destroy(true);
        gameRef.current = null;
        sceneRef.current = null;
      };
    }, [forwardedRef, parentId, retry]);

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
      <div className={`board-container ${rendered ? 'board-ready' : ''}`} data-testid="board-container" aria-busy={!rendered}>
      <div
        id={parentId}
        className="phaser-board"
        role="img"
        aria-label={`${state.labels.activeRound}. ${state.latestText}`}
        onPointerDownCapture={() => gameRef.current?.loop.wake()}
      />
      {!rendered && <><LoadingCards progress={progress} />{slow && <button className="board-retry secondary" onClick={() => setRetry(n => n + 1)}>{t('Cuba muatkan papan semula')}</button>}</>}
      </div>
    );
  },
);
