import { GameObjects, Geom, Scene } from "phaser";
import { colors } from "../../cards/presentation";
import { EventBus } from "../EventBus";
import type { BoardCard, BoardState } from "../boardTypes";

const hex = (value: string) => Number.parseInt(value.slice(1), 16);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export class CardTableScene extends Scene {
  private state?: BoardState;
  private layer?: GameObjects.Container;
  private previousHand = new Set<string>();
  private previousEventId?: number;
  private clock?: GameObjects.Text;
  private restTimer?: number;
  private pendingState?: BoardState;
  private previousSoundKey?: string;

  constructor() {
    super("CardTable");
  }

  create() {
    EventBus.on("board-state", this.receiveState, this);
    EventBus.on("board-clock", this.tickClock, this);
    EventBus.on("destroy-board", this.shutdown, this);
    this.scale.on("resize", this.redraw, this);
    this.events.once("shutdown", this.shutdown, this);
    this.events.once("destroy", this.shutdown, this);
    EventBus.emit("current-scene-ready", this);
  }

  update() {
    if (this.pendingState) {
      const pending = this.pendingState;
      this.pendingState = undefined;
      this.applyState(pending);
    }
    this.refreshClock();
  }

  private refreshClock() {
    if (!this.state || !this.clock) return;
    const remaining = this.state.paused
      ? this.state.labels.paused
      : this.state.labels.seconds.replace(
          "{count}",
          String(
            Math.min(
              this.state.turnSeconds,
              Math.max(
                0,
                Math.ceil(((this.state.deadline ?? Date.now()) - Date.now()) / 1000),
              ),
            ),
          ),
        );
    this.clock.setText(`◷  ${remaining}`);
  }

  shutdown() {
    EventBus.off("board-state", this.receiveState, this);
    EventBus.off("board-clock", this.tickClock, this);
    EventBus.off("destroy-board", this.shutdown, this);
    this.scale.off("resize", this.redraw, this);
    if (this.restTimer) window.clearTimeout(this.restTimer);
    this.clock = undefined;
    this.pendingState = undefined;
  }

  private tickClock() {
    if (!this.clock?.active) return;
    this.game.loop.wake();
    this.refreshClock();
    this.scheduleRest(80);
  }

  private receiveState(state: BoardState) {
    this.game.loop.wake();
    this.pendingState = state;
  }

  private applyState(state: BoardState) {
    const eventChanged = state.latest?.id !== this.previousEventId;
    this.state = state;
    this.redraw();
    if (state.soundCue && state.soundCue.key !== this.previousSoundKey) {
      this.previousSoundKey = state.soundCue.key;
      EventBus.emit("game-sound", state.soundCue);
    }
    if (eventChanged && state.latest) {
      this.previousEventId = state.latest.id;
      this.playEventEffect(state);
    }
    this.scheduleRest(
      state.reducedMotion ? 80 : eventChanged ? 1500 : 240,
    );
  }

  private scheduleRest(delay: number) {
    if (this.restTimer) window.clearTimeout(this.restTimer);
    this.restTimer = window.setTimeout(() => this.game.loop.sleep(), delay);
  }

  private redraw() {
    if (!this.state) return;
    this.layer?.destroy(true);
    this.layer = this.add.container(0, 0);
    const width = this.scale.width;
    const height = this.scale.height;
    const compact = width < 720;
    this.drawTable(width, height);
    this.drawStatus(width, compact);
    this.drawOpponents(width, compact);
    this.drawCenter(width, height, compact);
    this.drawHand(width, height, compact);
  }

  private drawTable(width: number, height: number) {
    const g = this.add.graphics();
    g.fillGradientStyle(0x123b31, 0x123b31, 0x0b2822, 0x0b2822, 1);
    g.fillRoundedRect(0, 0, width, height, Math.min(32, width * 0.05));
    g.lineStyle(2, 0xffffff, 0.1);
    g.strokeRoundedRect(12, 12, width - 24, height - 24, 24);
    g.lineStyle(1, 0xf5d99f, 0.14);
    g.strokeEllipse(width / 2, height * 0.48, width * 0.72, height * 0.55);
    this.layer!.add(g);
  }

  private drawStatus(width: number, compact: boolean) {
    const state = this.state!;
    const size = compact ? 12 : 14;
    const status = this.add
      .text(26, 20, `●  ${state.paused ? state.labels.paused : state.labels.activeRound}`, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: `${size}px`,
        fontStyle: "bold",
        color: state.paused ? "#f7c873" : "#9ce2bd",
      })
      .setOrigin(0, 0);
    const actions = this.add
      .text(width - 26, 20, `${state.actions} / ${state.maxActions}`, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: `${size}px`,
        fontStyle: "bold",
        color: "#f6ead6",
      })
      .setOrigin(1, 0);
    this.layer!.add([status, actions]);
  }

  private drawOpponents(width: number, compact: boolean) {
    const state = this.state!;
    const opponents = state.players.filter((player) => player.id !== state.you);
    if (!opponents.length) return;
    const gap = compact ? 8 : 14;
    const maxWidth = compact ? 132 : 174;
    const cardWidth = Math.min(maxWidth, (width - 36 - gap * (opponents.length - 1)) / opponents.length);
    const total = cardWidth * opponents.length + gap * (opponents.length - 1);
    const start = (width - total) / 2;
    opponents.forEach((player, index) => {
      const x = start + index * (cardWidth + gap);
      const active = state.turn === player.id;
      const selected = state.selectedTarget === player.id;
      const panel = this.add.graphics();
      panel.fillStyle(selected ? 0xf3d39a : 0x173f35, 0.96);
      panel.fillRoundedRect(x, 54, cardWidth, compact ? 66 : 76, 14);
      panel.lineStyle(active ? 3 : 1, active ? 0xf5c768 : 0xffffff, active ? 1 : 0.16);
      panel.strokeRoundedRect(x, 54, cardWidth, compact ? 66 : 76, 14);
      panel.setInteractive(
        new Geom.Rectangle(x, 54, cardWidth, compact ? 66 : 76),
        Geom.Rectangle.Contains,
      );
      panel.on("pointerdown", () => {
        if (!player.count) return;
        EventBus.emit("game-sound", { name: "click" });
        EventBus.emit("select-target", player.id);
      });
      const avatar = this.add.circle(x + 25, compact ? 80 : 86, compact ? 16 : 19, selected ? 0x173f35 : 0xdba867);
      const avatarText = this.add
        .text(avatar.x, avatar.y, initials(player.name), {
          fontFamily: "Nunito Sans, Arial",
          fontSize: compact ? "10px" : "12px",
          fontStyle: "bold",
          color: selected ? "#f8ead2" : "#17352d",
        })
        .setOrigin(0.5);
      const name = this.add.text(x + 48, 65, player.name, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: compact ? "11px" : "13px",
        fontStyle: "bold",
        color: selected ? "#17352d" : "#fff8ec",
      });
      const meta = this.add.text(
        x + 48,
        compact ? 86 : 90,
        `${player.count} ${state.labels.cards}  ·  ${player.families.length} ${state.labels.complete}`,
        {
          fontFamily: "Nunito Sans, Arial",
          fontSize: compact ? "9px" : "10px",
          color: selected ? "#315c4f" : "#b9d3c9",
        },
      );
      this.layer!.add([panel, avatar, avatarText, name, meta]);
    });
  }

  private drawCenter(width: number, height: number, compact: boolean) {
    const state = this.state!;
    const centerY = compact ? height * 0.43 : height * 0.42;
    const deckX = compact ? width * 0.22 : width * 0.3;
    const deckW = compact ? 64 : 82;
    const deckH = deckW * 1.38;
    for (let i = 2; i >= 0; i--) {
      const back = this.add.graphics();
      back.fillStyle(i ? 0xe8d5ad : 0x1d5748, 1);
      back.fillRoundedRect(deckX - deckW / 2 + i * 4, centerY - deckH / 2 - i * 3, deckW, deckH, 10);
      if (!i) {
        back.lineStyle(3, 0xf0d295, 1);
        back.strokeRoundedRect(deckX - deckW / 2, centerY - deckH / 2, deckW, deckH, 10);
      }
      this.layer!.add(back);
    }
    const deckBrand = this.add
      .text(deckX, centerY - 7, "C", {
        fontFamily: "Georgia, serif",
        fontSize: compact ? "28px" : "38px",
        fontStyle: "bold",
        color: "#f2d69c",
      })
      .setOrigin(0.5);
    const deckCount = this.add
      .text(deckX, centerY + deckH / 2 + 11, `${state.deckCount} ${state.labels.cards}`, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: compact ? "10px" : "12px",
        fontStyle: "bold",
        color: "#d5e6df",
      })
      .setOrigin(0.5, 0);
    const myTurn = state.turn === state.you;
    const current = state.players.find((player) => player.id === state.turn);
    const heading = state.paused
      ? state.labels.waitingFriend
      : myTurn
        ? state.labels.yourTurn
        : state.labels.friendTurn.replace("{name}", current?.name ?? "");
    const prompt = state.paused
      ? state.labels.waiting
      : myTurn
        ? state.labels.chooseCard
        : state.labels.planMove;
    const messageX = compact ? width * 0.63 : width * 0.61;
    const eyebrow = this.add
      .text(messageX, centerY - 46, myTurn ? state.labels.yourTurn.toUpperCase() : state.labels.friendTurn.toUpperCase().replace("{NAME}", ""), {
        fontFamily: "Nunito Sans, Arial",
        fontSize: compact ? "9px" : "11px",
        fontStyle: "bold",
        color: "#f0c979",
      })
      .setOrigin(0.5);
    const title = this.add
      .text(messageX, centerY - 18, heading, {
        fontFamily: "Georgia, serif",
        fontSize: compact ? "21px" : "30px",
        fontStyle: "bold",
        color: "#fff8ec",
        align: "center",
        wordWrap: { width: compact ? width * 0.48 : width * 0.42 },
      })
      .setOrigin(0.5);
    const sub = this.add
      .text(messageX, centerY + 18, prompt, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: compact ? "10px" : "13px",
        color: "#bfd5cc",
        align: "center",
      })
      .setOrigin(0.5);
    this.clock = this.add
      .text(messageX, centerY + 49, "", {
        fontFamily: "Nunito Sans, Arial",
        fontSize: compact ? "10px" : "12px",
        fontStyle: "bold",
        color: "#17352d",
        backgroundColor: "#f2d69c",
        padding: { x: 10, y: 5 },
      })
      .setOrigin(0.5);
    this.layer!.add([deckBrand, deckCount, eyebrow, title, sub, this.clock]);
    this.refreshClock();
  }

  private drawHand(width: number, height: number, compact: boolean) {
    const state = this.state!;
    if (!state.hand.length) return;
    const cardW = compact ? 76 : 112;
    const cardH = cardW * 1.34;
    const maxSpread = width - (compact ? 30 : 70);
    const step = Math.min(cardW * 0.76, (maxSpread - cardW) / Math.max(1, state.hand.length - 1));
    const total = cardW + step * (state.hand.length - 1);
    const startX = (width - total) / 2 + cardW / 2;
    const baseY = height - cardH / 2 - (compact ? 15 : 20);
    const newHand = new Set(state.hand.map((card) => card.id));
    state.hand.forEach((card, index) => {
      const selected = card.category === state.selectedFamily;
      const targetX = startX + index * step;
      const targetY = baseY - (selected ? 12 : 0) - Math.sin((index / Math.max(1, state.hand.length - 1)) * Math.PI) * 8;
      const rotation = (index - (state.hand.length - 1) / 2) * (compact ? 0.018 : 0.025);
      const container = this.makeCard(card, cardW, cardH, selected);
      container.setPosition(targetX, targetY).setRotation(rotation).setDepth(index + (selected ? 50 : 0));
      container.setInteractive(
        new Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Geom.Rectangle.Contains,
      );
      container.on("pointerover", () => {
        this.input.setDefaultCursor("pointer");
        if (!state.reducedMotion) this.tweens.add({ targets: container, y: targetY - 9, duration: 120 });
      });
      container.on("pointerout", () => {
        this.input.setDefaultCursor("default");
        if (!state.reducedMotion) this.tweens.add({ targets: container, y: targetY, duration: 120 });
      });
      container.on("pointerdown", () => {
        EventBus.emit("game-sound", { name: "card" });
        EventBus.emit("select-family", card.category);
        EventBus.emit("inspect-card", card.id);
      });
      this.layer!.add(container);
      if (!state.reducedMotion && !this.previousHand.has(card.id)) {
        container.setPosition(width * 0.22, height * 0.43).setScale(0.3).setAlpha(0);
        this.tweens.add({
          targets: container,
          x: targetX,
          y: targetY,
          scaleX: 1,
          scaleY: 1,
          alpha: 1,
          rotation,
          delay: index * 55,
          duration: 430,
          ease: "Back.Out",
        });
      }
    });
    this.previousHand = newHand;
  }

  private makeCard(card: BoardCard, width: number, height: number, selected: boolean) {
    const container = this.add.container(0, 0);
    const shadow = this.add.graphics();
    shadow.fillStyle(0x000000, 0.24);
    shadow.fillRoundedRect(-width / 2 + 4, -height / 2 + 7, width, height, 11);
    const frame = this.add.graphics();
    frame.fillStyle(0xfffbf2, 1);
    frame.fillRoundedRect(-width / 2, -height / 2, width, height, 11);
    frame.lineStyle(selected ? 4 : 2, selected ? 0xf1c15f : hex(colors[card.category]), 1);
    frame.strokeRoundedRect(-width / 2, -height / 2, width, height, 11);
    frame.fillStyle(hex(colors[card.category]), 1);
    frame.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, height * 0.22, 7);
    const art = this.add.image(0, -height * 0.04, card.id);
    const maxArtW = width * 0.86;
    const maxArtH = height * 0.55;
    art.setScale(Math.min(maxArtW / art.width, maxArtH / art.height));
    const family = this.add
      .text(-width / 2 + 11, -height / 2 + 10, card.category, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: `${Math.max(12, width * 0.14)}px`,
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    const title = this.add
      .text(0, height * 0.34, card.title, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: `${Math.max(9, width * 0.095)}px`,
        fontStyle: "bold",
        color: "#17352d",
        align: "center",
        wordWrap: { width: width * 0.88 },
      })
      .setOrigin(0.5);
    container.add([shadow, frame, art, family, title]);
    return container;
  }

  private playEventEffect(state: BoardState) {
    if (state.reducedMotion || !state.latest) return;
    const width = this.scale.width;
    const height = this.scale.height;
    if (state.latest.kind === "transfer" && state.latest.card && this.textures.exists(state.latest.card)) {
      const flying = this.add.image(width * 0.5, height * 0.22, state.latest.card).setDepth(500).setAlpha(0).setScale(0.12);
      this.tweens.add({
        targets: flying,
        x: width * 0.58,
        y: height * 0.73,
        alpha: { from: 0, to: 1 },
        scale: 0.22,
        angle: 8,
        duration: 700,
        ease: "Sine.InOut",
        yoyo: true,
        hold: 180,
        onComplete: () => flying.destroy(),
      });
    }
    if (["family", "transfer", "finish"].includes(state.latest.kind)) {
      for (let i = 0; i < 16; i++) {
        const particle = this.add.circle(width / 2, height * 0.52, 2 + (i % 3), i % 2 ? 0xf3c969 : 0xffffff, 0.9).setDepth(520);
        const angle = (Math.PI * 2 * i) / 16;
        this.tweens.add({
          targets: particle,
          x: width / 2 + Math.cos(angle) * (70 + (i % 4) * 14),
          y: height * 0.52 + Math.sin(angle) * (55 + (i % 5) * 10),
          alpha: 0,
          scale: 0.2,
          duration: 650,
          ease: "Cubic.Out",
          onComplete: () => particle.destroy(),
        });
      }
    }
  }

  preload() {
    // Every career card can enter the hand after a Colyseus state update.
    const base = import.meta.env.BASE_URL;
    for (const category of ["R", "I", "A", "S", "E", "C"] as const) {
      for (let index = 1; index <= 6; index++) {
        const id = `${category}${index}`;
        this.load.image(id, `${base}cards/${id}.webp`);
      }
    }
  }
}
