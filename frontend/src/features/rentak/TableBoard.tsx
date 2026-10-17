import { useEffect, useRef } from "react";
import * as Phaser from "phaser";
import { deckById, identities, cardMark } from "../../../../shared/rentak";
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
        const ink =
          c.kind === "prisma"
            ? 0x5869b8
            : parseInt(identities[c.suit].color.slice(1), 16);
        const g = this.add.graphics();
        g.lineStyle(2, 0x374361, 0.65);
        g.strokeEllipse(240, 130, 430, 218);
        g.fillStyle(0x080f23, 0.35);
        g.fillRoundedRect(94, 53, 116, 150, 16);
        g.fillRoundedRect(272, 53, 116, 150, 16);
        g.fillStyle(0x243451);
        g.fillRoundedRect(89, 43, 108, 144, 12);
        g.lineStyle(2, 0x7586ae);
        g.strokeRoundedRect(89, 43, 108, 144, 12);
        const colors = Object.values(identities).map((i) =>
          parseInt(i.color.slice(1), 16),
        );
        colors.forEach((color, i) => {
          const angle = (i * Math.PI) / 3;
          g.fillStyle(color);
          g.fillCircle(
            143 + Math.cos(angle) * 27,
            106 + Math.sin(angle) * 27,
            8,
          );
        });
        this.add
          .text(143, 152, "RENTAK", {
            fontFamily: "Arial",
            fontSize: "14px",
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        const card = this.add.container(325, 115);
        const face = this.add.graphics();
        face.fillStyle(0xfff7e8);
        face.fillRoundedRect(-54, -72, 108, 144, 12);
        face.fillStyle(ink);
        face.fillRoundedRect(-47, -65, 94, 130, 8);
        face.lineStyle(1, 0xffffff, 0.3);
        face.strokeCircle(0, 0, 35);
        card.add(face);
        card.add(
          this.add
            .text(0, -6, cardMark(c), {
              fontFamily: "Arial",
              fontSize: c.kind === "number" ? "64px" : "48px",
              color: "#ffffff",
              fontStyle: "bold",
            })
            .setOrigin(0.5),
        );
        card.add(
          this.add
            .text(
              0,
              49,
              c.kind === "number"
                ? identities[c.suit].name
                : c.kind.toUpperCase(),
              {
                fontFamily: "Arial",
                fontSize: "11px",
                color: "#ffffff",
                fontStyle: "bold",
              },
            )
            .setOrigin(0.5),
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
            const first = deckById[pair.cards[0]],
              ghost = this.add.container(235, 210);
            const shape = this.add
              .graphics()
              .fillStyle(ink)
              .fillRoundedRect(-38, -50, 76, 100, 10);
            ghost.add(shape);
            ghost.add(
              this.add
                .text(0, 0, cardMark(first), {
                  fontFamily: "Arial",
                  fontSize: "44px",
                  color: "#fff",
                  fontStyle: "bold",
                })
                .setOrigin(0.5),
            );
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
          const ghost = this.add
            .graphics()
            .fillStyle(0x7287b2)
            .fillRoundedRect(-25, -35, 50, 70, 8)
            .setPosition(143, 115);
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
