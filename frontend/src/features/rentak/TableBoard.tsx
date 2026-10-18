import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { deckById, makeDeck } from "../../../../shared/rentak";
import { cardArtworkKey } from "../../../../shared/card-artwork";
import type { RentakView } from "../../../../shared/rentak";
export default function TableBoard({
  state,
  reduced,
}: {
  state: RentakView;
  reduced: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    game = useRef<Phaser.Game | null>(null),
    latest = useRef({ state, reduced });
  latest.current = { state, reduced };
  useEffect(() => {
    class TableScene extends Phaser.Scene {
      private seen: number | null = null;
      preload() {
        for (const key of new Set([
          "back",
          ...makeDeck().map((c) => cardArtworkKey(c.id)),
        ])) {
          this.load.svg(
            key,
            `${import.meta.env.BASE_URL}rentak-cards/${key}.svg`,
            { width: 300, height: 450 },
          );
        }
      }
      create() {
        this.draw();
        this.game.events.on("rentak-update", this.draw, this);
        this.events.once("shutdown", () =>
          this.game.events.off("rentak-update", this.draw, this),
        );
      }
      draw() {
        this.tweens.killAll();
        this.children.removeAll(true);
        const { state: s, reduced: reduce } = latest.current,
          c = deckById[s.top];
        if (!c) return;
        const events =
          this.seen === null ? [] : s.events.filter((e) => e.id > this.seen!);
        this.seen = s.events.at(-1)?.id ?? 0;
        const pair = events.find((e) => e.type === "rentakUsed");
        const played = pair ?? events.find((e) => e.type === "cardPlayed");
        const drawn = events.find((e) => e.type === "cardsDrawn");
        const g = this.add.graphics();
        g.lineStyle(2, 0x374361, 0.65);
        g.strokeEllipse(240, 130, 430, 218);
        for (const x of [143, 325]) {
          g.fillStyle(0x080f23, 0.4);
          g.fillRoundedRect(x - 51, 42, 108, 162, 12);
        }
        for (const offset of [6, 3, 0])
          this.add
            .image(143 + offset, 115 + offset, "back")
            .setDisplaySize(108, 162);
        const card = this.add.container(325, 115);
        card.add(
          this.add.image(0, 0, cardArtworkKey(c.id)).setDisplaySize(108, 162),
        );
        this.add
          .text(239, 115, s.direction === 1 ? "→" : "←", {
            fontSize: "32px",
            color: "#c7d6f0",
          })
          .setOrigin(0.5);
        const effect = events.find(
          (e) => e.type === "penaltyIssued" || e.type === "penaltyBlocked",
        );
        if (effect) {
          const badge = this.add
            .text(325, 22, effect.type === "penaltyIssued" ? "+2" : "◇", {
              fontSize: "26px",
              color: "#ffe1a1",
              fontStyle: "bold",
            })
            .setOrigin(0.5);
          if (!reduce)
            this.tweens.add({
              targets: badge,
              y: 5,
              alpha: 0.2,
              duration: 650,
            });
        }
        if (!reduce && played) {
          card.setPosition(325, 215).setAlpha(0.2);
          this.tweens.add({
            targets: card,
            y: 115,
            alpha: 1,
            delay: pair ? 130 : 0,
            duration: 200,
            ease: "Sine.Out",
          });
          if (pair?.cards?.[0]) {
            const ghost = this.add
              .image(235, 210, cardArtworkKey(pair.cards[0]))
              .setDisplaySize(90, 135);
            this.tweens.add({
              targets: ghost,
              x: 315,
              y: 115,
              alpha: 0,
              duration: 250,
              ease: "Sine.Out",
              onComplete: () => ghost.destroy(),
            });
          }
        } else if (!reduce && drawn) {
          const ghost = this.add.image(143, 115, "back").setDisplaySize(60, 90);
          this.tweens.add({
            targets: ghost,
            y: 225,
            alpha: 0,
            duration: 200,
            onComplete: () => ghost.destroy(),
          });
        }
      }
    }
    game.current = new Phaser.Game({
      type: Phaser.CANVAS,
      parent: host.current!,
      width: 480,
      height: 240,
      transparent: true,
      scene: TableScene,
      audio: { noAudio: true },
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
      banner: false,
    });
    return () => {
      game.current?.destroy(true);
      game.current = null;
    };
  }, []);
  useEffect(() => {
    game.current?.events.emit("rentak-update");
  }, [state.top, state.direction, state.events.at(-1)?.id, reduced]);
  return <div ref={host} className="rt-phaser" aria-hidden="true" />;
}
