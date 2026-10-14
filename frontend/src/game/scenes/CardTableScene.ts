import { GameObjects, Geom, Scene, type Input } from "phaser";
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
  private restTimer?: number;
  private pendingState?: BoardState;
  private previousSoundKey?: string;
  private rendered = false;
  private handPage = 0;
  private handPages = 1;
  private handTop = 0;
  private selectedFamily?: BoardState['selectedFamily'];

  private get density() { return this.game.registry.get('pixel-density') as number || 1; }

  private endHandGesture(pointer: Input.Pointer) {
    if (pointer.event?.target !== this.game.canvas) return;
    // Use the pointer's own down position so a redraw/resize cannot discard a
    // gesture half-way through. The camera is origin-zero with density zoom.
    const startY = pointer.downY / this.density;
    if (startY < this.handTop || startY >= this.scale.height / this.density - 32) return;
    const dx = (pointer.x - pointer.downX) / this.density;
    const dy = (pointer.y - pointer.downY) / this.density;
    if (Math.abs(dx) > 32 && Math.abs(dx) > Math.abs(dy) * 1.2) this.changeHandPage(dx < 0 ? 1 : -1, this.game);
  }

  private changeHandPage(delta: number, game: unknown) {
    if (game !== this.game) return;
    const next = Math.max(0, Math.min(this.handPages - 1, this.handPage + delta));
    if (next === this.handPage) return;
    this.handPage = next;
    this.redraw();
  }

  constructor() {
    super("CardTable");
  }

  create() {
    this.cameras.main.setOrigin(0, 0).setZoom(this.density);
    this.input.on('pointerup', this.endHandGesture, this);
    EventBus.on('hand-page', this.changeHandPage, this);
    EventBus.on("board-state", this.receiveState, this);
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
  }

  shutdown() {
    if (this.input) this.input.enabled = false;
    EventBus.off("board-state", this.receiveState, this);
    EventBus.off("destroy-board", this.shutdown, this);
    EventBus.off('hand-page', this.changeHandPage, this);
    this.input?.off('pointerup', this.endHandGesture, this);
    this.scale.off("resize", this.redraw, this);
    if (this.restTimer) window.clearTimeout(this.restTimer);
    this.pendingState = undefined;
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
    this.game.loop.wake();
    this.scheduleRest(100);
    const width = this.scale.width / this.density;
    const height = this.scale.height / this.density;
    // Route/viewport transitions may briefly collapse the parent; don't draw
    // rounded rectangles with negative dimensions during that transient frame.
    if (width < 96 || height < 240) return;
    this.layer?.destroy(true);
    this.layer = this.add.container(0, 0);
    const compact = width < 720;
    this.drawTable(width, height);
    this.drawOpponents(width, compact);
    this.drawCenter(width, height, compact);
    this.drawHand(width, height, compact);
    const sharpen = (objects: GameObjects.GameObject[]) => {
      for (const object of objects) {
        if (object instanceof GameObjects.Text) object.setResolution(this.density);
        if (object instanceof GameObjects.Container) sharpen(object.list);
      }
    };
    sharpen(this.layer.list);
    if (!this.rendered) {
      this.rendered = true;
      this.game.events.once('postrender', () => EventBus.emit('board-rendered', this.game));
    }
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

  private drawOpponents(width: number, compact: boolean) {
    const state = this.state!;
    const opponents = state.players.filter((player) => player.id !== state.you);
    if (!opponents.length) return;
    const gap = compact ? 6 : 14;
    const cols = compact ? Math.min(3, opponents.length) : opponents.length;
    const maxWidth = compact ? 160 : 174;
    const cardWidth = Math.min(maxWidth, (width - 28 - gap * (cols - 1)) / cols);
    const total = cardWidth * cols + gap * (cols - 1);
    const start = (width - total) / 2;
    opponents.forEach((player, index) => {
      const x = start + index % cols * (cardWidth + gap);
      const y = 14 + Math.floor(index / cols) * 59;
      const active = state.turn === player.id;
      const selected = state.selectedTarget === player.id;
      const panel = this.add.graphics();
      panel.fillStyle(selected ? 0xf3d39a : 0x173f35, 0.96);
      panel.fillRoundedRect(x, y, cardWidth, compact ? 53 : 76, 14);
      panel.lineStyle(active ? 3 : 1, active ? 0xf5c768 : 0xffffff, active ? 1 : 0.16);
      panel.strokeRoundedRect(x, y, cardWidth, compact ? 53 : 76, 14);
      panel.setInteractive(
        new Geom.Rectangle(x, y, cardWidth, compact ? 53 : 76),
        Geom.Rectangle.Contains,
      );
      panel.on("pointerdown", () => {
        if (!player.count) return;
        EventBus.emit("game-sound", { name: "click" });
        EventBus.emit("select-target", player.id);
      });
      const mark = this.add.circle(x + (compact ? 18 : 25), y + (compact ? 24 : 32), compact ? 14 : 20, 0xe8eee3);
      const markText = this.add.text(mark.x, mark.y, initials(player.name), {
        fontFamily: 'Nunito Sans, Arial', fontSize: compact ? '11px' : '14px', fontStyle: 'bold', color: '#17352d',
      }).setOrigin(0.5);
      const connection = this.add
        .text(mark.x, y + (compact ? 45 : 63), player.connected ? '●' : '○', {
          fontFamily: "Nunito Sans, Arial",
          fontSize: compact ? "10px" : "12px",
          fontStyle: "bold",
          color: selected ? '#17352d' : '#c4ead2',
        })
        .setOrigin(0.5);
      const name = this.add.text(x + (compact ? 37 : 48), y + 10, player.name.length > (compact ? 9 : 15) ? `${player.name.slice(0, compact ? 8 : 14)}…` : player.name, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: compact ? "11px" : "13px",
        fontStyle: "bold",
        color: selected ? "#17352d" : "#fff8ec",
      });
      const meta = this.add.text(
        x + (compact ? 37 : 48),
        y + (compact ? 29 : 42),
        compact ? `${player.count} ${state.labels.cards}` : `${player.count} ${state.labels.cards}  ·  ${player.families.length} ${state.labels.complete}`,
        {
          fontFamily: "Nunito Sans, Arial",
          fontSize: compact ? "9px" : "10px",
          color: selected ? "#315c4f" : "#b9d3c9",
        },
      );
      this.layer!.add([panel, mark, markText, connection, name, meta]);
    });
  }

  private drawCenter(_width: number, _height: number, compact: boolean) {
    const state = this.state!;
    const y = compact ? (state.players.length > 4 ? 150 : 94) : 112;
    const back = this.add.graphics();
    back.fillStyle(0xe2c28b, 1).fillRoundedRect(26, y - 21, 28, 36, 6);
    back.fillStyle(0x285c4c, 1).fillRoundedRect(22, y - 18, 28, 36, 6);
    back.lineStyle(1, 0xd9c18c).strokeRoundedRect(22, y - 18, 28, 36, 6);
    const brand = this.add.text(36, y, 'C', { fontFamily: 'Georgia, serif', fontSize: '17px', color: '#f2d69c' }).setOrigin(0.5);
    const count = this.add.text(66, y - 12, `${state.deckCount} ${state.labels.cards}`, { fontFamily: 'Nunito Sans, Arial', fontSize: '13px', fontStyle: 'bold', color: '#fff8ec' });
    const label = this.add.text(66, y + 6, state.labels.deck, { fontFamily: 'Nunito Sans, Arial', fontSize: '10px', color: '#b9d3c9' });
    this.layer!.add([back, brand, count, label]);
  }

  private drawHand(width: number, height: number, compact: boolean) {
    const state = this.state!;
    const gap = compact ? 12 : 18;
    const perPage = compact ? 2 : Math.max(2, Math.floor((width - 48) / 172));
    this.handPages = Math.max(1, Math.ceil(state.hand.length / perPage));
    if (this.selectedFamily !== state.selectedFamily) {
      const first = state.hand.findIndex(card => card.category === state.selectedFamily);
      if (first >= 0) this.handPage = Math.floor(first / perPage);
      this.selectedFamily = state.selectedFamily;
    }
    this.handPage = Math.min(this.handPage, this.handPages - 1);
    const hand = state.hand.slice(this.handPage * perPage, (this.handPage + 1) * perPage);
    const cardW = Math.min(compact ? 144 : 154, (width - 28 - gap * (perPage - 1)) / perPage);
    const cardH = Math.max(202, cardW * 1.55);
    const step = cardW + gap;
    const total = cardW + step * (hand.length - 1);
    const startX = (width - total) / 2 + cardW / 2;
    const baseY = height - cardH / 2 - 42;
    this.handTop = baseY - cardH / 2 - 12;
    EventBus.emit('hand-layout', { page: this.handPage, pages: this.handPages, cardWidth: cardW, cardHeight: cardH, cardIds: hand.map(card => card.id) }, this.game);
    if (!hand.length) return;
    const newHand = new Set(state.hand.map((card) => card.id));
    hand.forEach((card, index) => {
      const selected = card.category === state.selectedFamily;
      const targetX = startX + index * step;
      const targetY = baseY - (selected ? 6 : 0);
      const rotation = 0;
      const container = this.makeCard(card, cardW, cardH, selected);
      container.setPosition(targetX, targetY).setRotation(rotation).setDepth(index + (selected ? 50 : 0));
      container.setInteractive(
        new Geom.Rectangle(-cardW / 2, -cardH / 2, cardW, cardH),
        Geom.Rectangle.Contains,
      );
      container.on("pointerover", () => {
        if (!container.active || !this.input || !this.game?.loop) return;
        this.game.loop.wake();
        this.scheduleRest(250);
        this.input.setDefaultCursor("pointer");
        if (!state.reducedMotion) this.tweens.add({ targets: container, y: targetY - 9, duration: 120 });
      });
      container.on("pointerout", () => {
        if (!container.active || !this.input || !this.game?.loop) return;
        this.game.loop.wake();
        this.scheduleRest(250);
        this.input.setDefaultCursor("default");
        if (!state.reducedMotion) this.tweens.add({ targets: container, y: targetY, duration: 120 });
      });
      let downTime: number | null = null;
      container.on('pointerdown', (pointer: Input.Pointer) => { if (pointer.event?.target === this.game.canvas) downTime = pointer.downTime; });
      container.on("pointerup", (pointer: Input.Pointer) => {
        const tapped = downTime === pointer.downTime;
        downTime = null;
        if (!tapped || pointer.event?.target !== this.game.canvas) return;
        if (Math.abs(pointer.x - pointer.downX) > 10 * this.density || Math.abs(pointer.y - pointer.downY) > 10 * this.density) return;
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
    frame.fillRoundedRect(-width / 2 + 5, -height / 2 + 5, width - 10, 26, 7);
    const art = this.add.image(0, -height * 0.025, card.id);
    const maxArtW = width * 0.86;
    const maxArtH = height * 0.60;
    art.setScale(Math.min(maxArtW / art.width, maxArtH / art.height));
    const family = this.add
      .text(-width / 2 + 11, -height / 2 + 10, card.category, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: '15px',
        fontStyle: "bold",
        color: "#ffffff",
      })
      .setOrigin(0, 0);
    const title = this.add
      .text(0, height * 0.34, card.title, {
        fontFamily: "Nunito Sans, Arial",
        fontSize: `${width < 130 ? 12 : 14}px`,
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
    const width = this.scale.width / this.density;
    const height = this.scale.height / this.density;
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
    this.load.on('progress', (value: number) => EventBus.emit('board-loading', value, this.game));
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
