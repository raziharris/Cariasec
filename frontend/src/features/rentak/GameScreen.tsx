import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { Command, View } from "../../../../shared/game";
import {
  deckById,
  identities,
  suits,
  matches,
  isPair,
  type Suit,
} from "../../../../shared/rentak";
import { createActionId } from "../../actionId";
import { CardFace, cardLabel } from "./CardFace";
import { useSound } from "../../audio/SoundProvider";
import { BoardBoundary } from "../../components/BoardBoundary";
const TableBoard = lazy(() => import("./TableBoard"));
export function GameScreen({
  room,
  busy,
  online,
  send,
  en,
  reduced,
  countdown,
}: {
  room: View;
  busy: boolean;
  online: boolean;
  send: (c: Command) => Promise<boolean>;
  en: boolean;
  reduced: boolean;
  countdown: boolean;
}) {
  const s = room.rentak!,
    tr = (ms: string, english: string) => (en ? english : ms);
  const [selected, setSelected] = useState<string[]>([]),
    [pair, setPair] = useState(false),
    [color, setColor] = useState<Suit | null>(null),
    [now, setNow] = useState(Date.now());
  const { playSound } = useSound();
  const seen = useRef<number | null>(null),
    ticking = useRef("");
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    setSelected([]);
    setPair(false);
    setColor(null);
  }, [room.version]);
  useEffect(() => {
    const last = s.events.at(-1)?.id ?? 0;
    if (seen.current !== null) {
      const events = s.events.filter((e) => e.id > seen.current!);
      const e = events.at(-1);
      if (e)
        playSound(
          e.type === "roundEnded"
            ? "win"
            : e.type === "rentakUsed"
              ? "rentak"
              : e.type === "cardsDrawn"
                ? "draw"
                : e.type === "directionChanged"
                  ? "pusing"
                  : e.type === "penaltyIssued"
                    ? "beban"
                    : e.type === "penaltyBlocked"
                      ? "teduh"
                      : e.cards?.some((id) => deckById[id].kind === "pintas")
                        ? "pintas"
                        : "card",
          `${room.code}:${e.id}`,
        );
    }
    seen.current = last;
  }, [s.events, playSound, room.code]);
  const mine = room.turn === room.you && !room.paused && online && !busy;
  const seconds = Math.max(
    0,
    Math.ceil(((room.paused ? s.pauseUntil : room.deadline) ?? now) - now) /
      1000,
  );
  const secondsInt = Math.ceil(seconds);
  useEffect(() => {
    const key = `${room.turn}:${room.deadline}:${secondsInt}`;
    if (
      countdown &&
      mine &&
      secondsInt > 0 &&
      secondsInt <= 5 &&
      key !== ticking.current
    ) {
      ticking.current = key;
      playSound("tick");
    }
  }, [countdown, mine, secondsInt, room.turn, room.deadline, playSound]);
  const top = deckById[s.top];
  const legal = (id: string) =>
    (!s.drawn || s.drawn === id) &&
    (s.penalty
      ? deckById[id].kind === "teduh"
      : matches(deckById[id], top, s.activeSuit));
  const valid =
    selected.length > 0 &&
    legal(selected[0]) &&
    (!pair ||
      (selected.length === 2 &&
        isPair(deckById[selected[0]], deckById[selected[1]])));
  const prisma =
    selected.length === 1 && deckById[selected[0]].kind === "prisma";
  function select(id: string) {
    setColor(null);
    setSelected((previous) =>
      pair
        ? previous.includes(id)
          ? previous.filter((x) => x !== id)
          : previous.length < 2
            ? [...previous, id]
            : [id]
        : previous[0] === id
          ? []
          : [id],
    );
  }
  const action = (type: "draw" | "pass") =>
    send({ type, version: room.version, actionId: createActionId() });
  const actor = room.players.find((p) => p.id === room.turn)?.name;
  const last = s.events.at(-1),
    lastActor = room.players.find((p) => p.id === last?.actor)?.name ?? "";
  const eventText = last
    ? `${lastActor} · ${tr({ cardPlayed: "main kad", cardsDrawn: `ambil ${last.amount ?? 0} kad`, directionChanged: "tukar arah", penaltyIssued: "Beban +2", penaltyBlocked: "Teduh!", rentakUsed: "RENTAK!", roundEnded: "pusingan tamat", turnPassed: "tamat giliran" }[last.type], { cardPlayed: "played a card", cardsDrawn: `drew ${last.amount ?? 0}`, directionChanged: "reversed direction", penaltyIssued: "Beban +2", penaltyBlocked: "Shielded!", rentakUsed: "RENTAK!", roundEnded: "round finished", turnPassed: "ended turn" }[last.type])}`
    : tr("Cari padanan. Cetus Rentak.", "Find your match. Make your move.");
  return (
    <section
      className="rt-game"
      aria-label={tr("Meja permainan", "Game table")}
    >
      <div className="rt-opponents">
        {room.players
          .filter((p) => p.id !== room.you)
          .map((p) => (
            <article
              key={p.id}
              className={`rt-player ${p.id === room.turn ? "active" : ""}`}
            >
              <span className="rt-avatar">
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b>{p.name}</b>
                <small>
                  {p.withdrawn
                    ? tr("Menarik diri", "Withdrawn")
                    : !p.connected
                      ? tr("Terputus", "Disconnected")
                      : p.id === room.turn
                        ? tr("Giliran", "Turn")
                        : `${p.count} ${tr("kad", "cards")}`}
                </small>
              </div>
              <strong>
                {p.count === 1 ? tr("Satu!", "One!") : `${p.count}`}
              </strong>
            </article>
          ))}
      </div>
      <div className="rt-arena">
        <div
          className="rt-active-suit"
          style={{ borderColor: identities[s.activeSuit].color }}
        >
          <span style={{ color: identities[s.activeSuit].color }}>
            {identities[s.activeSuit].symbol}
          </span>
          {tr("Warna aktif", "Active suit")}{" "}
          <b>
            {en ? identities[s.activeSuit].en : identities[s.activeSuit].name}
          </b>
        </div>
        <BoardBoundary
          fallback={
            <div className="rt-board-fallback">
              <CardFace back />
              <CardFace id={s.top} />
            </div>
          }
        >
          <Suspense
            fallback={
              <div className="rt-board-fallback">
                <CardFace back />
                <CardFace id={s.top} />
              </div>
            }
          >
            <TableBoard state={s} reduced={reduced} />
          </Suspense>
        </BoardBoundary>
        <div className="rt-pile-labels">
          <span>
            {tr("Ambil", "Draw")} · {room.deckCount}
          </span>
          <span>
            {tr("Kad atas", "Top card")} · {cardLabel(s.top, en)}
          </span>
        </div>
        <p className="rt-direction">
          {s.direction === 1 ? "↻" : "↺"}{" "}
          {s.direction === 1
            ? tr("Mengikut jam", "Clockwise")
            : tr("Lawan jam", "Counterclockwise")}
        </p>
        <p className="rt-event" aria-live="polite">
          {eventText}
        </p>
      </div>
      <div className={`rt-turn ${mine ? "your-turn" : ""}`} role="status">
        <div>
          <small>
            {tr("PUSINGAN", "ROUND")} {s.roundNumber}
            {s.format === "three-round" ? " / 3" : ""}
          </small>
          <b>
            {room.paused
              ? tr("Menunggu sambungan semula", "Waiting for reconnection")
              : room.turn === room.you
                ? tr("Giliran anda", "Your turn")
                : `${tr("Giliran", "Turn")} ${actor}`}
          </b>
        </div>
        <span className={secondsInt <= 5 ? "rt-urgent" : ""}>
          {secondsInt}s
        </span>
      </div>
      {s.penalty > 0 && (
        <p className="rt-penalty" role="status">
          {tr(
            "Beban +2: main Teduh atau ambil dua kad dan tamat giliran.",
            "Beban +2: play Teduh or draw two and end your turn.",
          )}
        </p>
      )}
      <div className="rt-hand-title">
        <h2>
          {tr("Tangan anda", "Your hand")} <span>{room.hand.length}</span>
        </h2>
        <small>
          {pair
            ? tr(
                "Pilih kad pertama → kad kedua",
                "Choose first card → second card",
              )
            : tr("Pilih kad, kemudian main", "Select a card, then play")}
        </small>
      </div>
      <div
        className="rt-hand"
        tabIndex={0}
        aria-label={tr("Tangan kad boleh diskrol", "Scrollable hand")}
      >
        {room.hand.map((id) => (
          <button
            key={id}
            data-card-id={id}
            data-legal={legal(id)}
            className={`rt-hand-card ${selected.includes(id) ? "selected" : ""} ${legal(id) ? "legal" : "unmatched"}`}
            aria-label={cardLabel(id, en)}
            aria-pressed={selected.includes(id)}
            onClick={() => select(id)}
          >
            <CardFace id={id} en={en} />
            {selected.includes(id) && (
              <span className="rt-selection-order">
                {selected.indexOf(id) + 1}
              </span>
            )}
          </button>
        ))}
      </div>
      <div className="rt-inspector" aria-live="polite">
        {selected.length ? (
          <>
            <b>{selected.map((id) => cardLabel(id, en)).join(" → ")}</b>
            <span>
              {!legal(selected[0])
                ? s.drawn
                  ? tr(
                      "Hanya kad baharu boleh dimainkan.",
                      "Only the newly drawn card may be played.",
                    )
                  : s.penalty
                    ? tr(
                        "Perlu Teduh untuk membatalkan Beban.",
                        "Play Teduh to cancel Beban.",
                      )
                    : tr(
                        "Perlu warna aktif, nombor / aksi sama atau Prisma.",
                        "Match the active suit, number / action, or Prisma.",
                      )
                : pair
                  ? tr(
                      "Dua nombor warna sama, beza tepat satu.",
                      "Same suit, numbers exactly one apart.",
                    )
                  : tr(
                      {
                        number: "Padankan warna atau nombor.",
                        pintas: "Pemain berikutnya kehilangan giliran.",
                        pusing: "Tukar arah; dua pemain: lawan tetap bermain.",
                        beban:
                          "Pemain berikutnya perlu ambil dua atau main Teduh.",
                        teduh:
                          "Batalkan Beban; di luar penalti, padanan biasa.",
                        prisma: "Pilih satu daripada enam warna.",
                      }[deckById[selected[0]].kind],
                      {
                        number: "Match suit or number.",
                        pintas: "Skip the next player.",
                        pusing:
                          "Reverse direction. With two players, the opponent still plays.",
                        beban: "Next player draws two or plays Teduh.",
                        teduh:
                          "Cancel Beban; otherwise a normal matching card.",
                        prisma: "Choose one of six suits.",
                      }[deckById[selected[0]].kind],
                    )}
            </span>
          </>
        ) : (
          <span>
            {s.drawn
              ? tr(
                  "Main kad yang baru diambil atau simpan dan tamat.",
                  "Play the newly drawn card or keep it and end your turn.",
                )
              : tr(
                  "Kad yang bercahaya mempunyai padanan. Semua kad boleh diperiksa.",
                  "Highlighted cards match. You can inspect any card.",
                )}
          </span>
        )}
      </div>
      {prisma && (
        <fieldset className="rt-colors">
          <legend>{tr("Pilih warna Prisma", "Choose Prisma suit")}</legend>
          {suits.map((suit) => (
            <button
              key={suit}
              aria-pressed={color === suit}
              onClick={() => setColor(suit)}
              style={{ borderColor: identities[suit].color }}
            >
              <span style={{ color: identities[suit].color }}>
                {identities[suit].symbol}
              </span>
              {en ? identities[suit].en : identities[suit].name}
            </button>
          ))}
        </fieldset>
      )}
      <div className="rt-dock">
        <button
          disabled={!mine || !!s.drawn}
          onClick={() => void action("draw")}
        >
          {s.penalty ? tr("Ambil 2", "Draw 2") : tr("Ambil 1", "Draw 1")}
        </button>
        {s.drawn ? (
          <button disabled={!mine} onClick={() => void action("pass")}>
            {tr("Simpan & tamat", "Keep & end")}
          </button>
        ) : (
          <button
            aria-pressed={pair}
            disabled={
              !mine ||
              s.mode === "beginner" ||
              !!s.used[room.you] ||
              !!s.penalty
            }
            onClick={() => {
              setPair(!pair);
              setSelected([]);
              setColor(null);
            }}
          >
            ✦ Rentak {s.used[room.you] ? "0/1" : "1/1"}
          </button>
        )}
        <button
          className="rt-primary"
          disabled={!mine || !valid || (prisma && !color)}
          onClick={() =>
            void send({
              type: "play",
              cardIds: selected,
              ...(prisma && color ? { chosenSuit: color } : {}),
              version: room.version,
              actionId: createActionId(),
            })
          }
        >
          {pair ? "Rentak!" : tr("Main kad", "Play card")} →
        </button>
      </div>
    </section>
  );
}
