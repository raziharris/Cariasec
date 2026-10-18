import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Volume2,
  VolumeX,
  Settings,
  X,
  ArrowRight,
  Copy,
  BookOpen,
  LogOut,
  Crown,
} from "lucide-react";
import { LanguageProvider, useI18n } from "./i18n";
import { SoundProvider, useSound } from "./audio/SoundProvider";
import { SoundSettings } from "./audio/SoundSettings";
import { RoomChat } from "./components/RoomChat";
import { useRoomSession } from "./features/rentak/useRoomSession";
import { CardFace, Mascot } from "./features/rentak/CardFace";
import { IdentityCards } from "./features/rentak/IdentityCards";
import { GameScreen } from "./features/rentak/GameScreen";
import { Tutorial } from "./features/rentak/Tutorial";
import {
  identities,
  suits,
  type Mode,
  type Format,
  type Suit,
} from "../../shared/rentak";
import { copyText } from "./clipboard";
import { salaryFor, salaryRange } from "./salary";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "@fontsource/nunito-sans/latin-900.css";
import "./features/rentak/rentak.css";

function App() {
  const session = useRoomSession(),
    { room, busy, online, error, send } = session;
  const {
    language,
    setLanguage,
    profile,
    rememberName,
    setReducedMotion,
    cards,
    categories,
  } = useI18n();
  const en = language === "en",
    tr = (ms: string, english: string) => (en ? english : ms);
  const sound = useSound();
  const [page, setPage] = useState("home"),
    [dialog, setDialog] = useState<"create" | "join" | "settings" | null>(null);
  const [name, setName] = useState(profile.name),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("bilik") ?? "",
    );
  const [mode, setMode] = useState<Mode>("normal"),
    [format, setFormat] = useState<Format>("quick"),
    [learnSuit, setLearnSuit] = useState<Suit>("R");
  const [countdown, setCountdown] = useState(() => {
    try {
      return localStorage.getItem("rentak-countdown") !== "false";
    } catch {
      return true;
    }
  });
  const [copied, setCopied] = useState("");
  const modalRef = useRef<HTMLElement>(null);
  const previousPhase = useRef(room?.phase);
  useEffect(() => {
    if (previousPhase.current === "playing" && room?.phase === "finished")
      sound.playSound(
        "win",
        `${room.code}:${room.rentak?.events.at(-1)?.id}:win`,
      );
    previousPhase.current = room?.phase;
  }, [room?.phase, room?.code, room?.rentak?.roundNumber, sound.playSound]);
  const reduced =
    profile.reducedMotion ||
    matchMedia("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? "reduced" : "full";
  }, [reduced]);
  useEffect(() => {
    if (room) {
      setDialog(null);
      setPage("room");
    }
  }, [room?.code]);
  useEffect(() => {
    if (!room && code) setDialog("join");
  }, []);
  useEffect(() => {
    if (!dialog) return;
    const before = document.activeElement as HTMLElement,
      previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => [
      ...(modalRef.current?.querySelectorAll<HTMLElement>(
        "button:not(:disabled), input, select",
      ) ?? []),
    ];
    (
      modalRef.current?.querySelector<HTMLElement>("input") ?? focusable()[0]
    )?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDialog(null);
      if (event.key === "Tab") {
        const items = focusable(),
          first = items[0],
          last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, [dialog]);
  const settings = (m = mode, f = format) => ({
    mode: m,
    format: f,
    turnSeconds: (m === "beginner" ? 45 : 30) as 45 | 30,
    maxActions: 120 as const,
  });
  async function invite() {
    if (!room) return;
    const url = `${location.origin}${import.meta.env.BASE_URL}?bilik=${room.code}`;
    try {
      setCopied(
        (await copyText(url)) ? tr("Pautan disalin", "Link copied") : url,
      );
    } catch {
      setCopied(url);
    }
  }
  function options(
    m: Mode,
    f: Format,
    change: (m: Mode, f: Format) => void,
    disabled = false,
  ) {
    return (
      <div className="rt-options">
        <label>
          {tr("Mod permainan", "Game mode")}
          <select
            aria-label={tr("Mod permainan", "Game mode")}
            disabled={disabled}
            value={m}
            onChange={(e) => change(e.target.value as Mode, f)}
          >
            <option value="normal">
              Normal · 102 {tr("kad", "cards")} · 30s
            </option>
            <option value="beginner">
              Beginner · 90 {tr("kad", "cards")} · 45s
            </option>
          </select>
        </label>
        <label>
          {tr("Format", "Format")}
          <select
            aria-label={tr("Format", "Format")}
            disabled={disabled}
            value={f}
            onChange={(e) => change(m, e.target.value as Format)}
          >
            <option value="quick">
              Quick Round · 1 {tr("pusingan", "round")}
            </option>
            <option value="three-round">
              Party Match · 3 {tr("pusingan", "rounds")}
            </option>
          </select>
        </label>
      </div>
    );
  }
  return (
    <div className="rt-app">
      <header className="rt-header">
        <button
          className="rt-brand"
          onClick={() => setPage(room ? "room" : "home")}
          aria-label="CARIASEC RENTAK"
        >
          <span className="rt-logo">✦</span>
          <span>
            <small>CARIASEC</small>
            <b>
              RENTAK<span>.</span>
            </b>
          </span>
        </button>
        <nav aria-label={tr("Navigasi", "Navigation")}>
          <button className="rt-learn-nav" onClick={() => setPage("learn")}>
            <BookOpen size={17} />
            {tr("Kenali RIASEC", "Explore RIASEC")}
          </button>
          <button
            aria-label={tr("Tetapan", "Settings")}
            onClick={() => setDialog("settings")}
          >
            <Settings size={20} />
          </button>
          <button
            aria-label={
              sound.muted
                ? tr("Hidupkan bunyi", "Unmute")
                : tr("Senyapkan bunyi", "Mute")
            }
            aria-pressed={sound.muted}
            data-sound="none"
            onClick={() => sound.setMuted(!sound.muted)}
          >
            {sound.muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </nav>
      </header>
      <main>
        {error && (
          <div className="rt-alert" role="alert">
            <span>{error}</span>
            <button
              aria-label={tr("Tutup mesej", "Dismiss")}
              onClick={() => session.setError("")}
            >
              <X size={16} />
            </button>
          </div>
        )}
        {room && !online && (
          <div className="rt-alert" role="status">
            {tr(
              "Sambungan terputus. Tempat disimpan sehingga 90 saat.",
              "Disconnected. Your seat is reserved for up to 90 seconds.",
            )}
            <button onClick={() => void session.retry()} disabled={busy}>
              {tr("Cuba semula", "Reconnect")}
            </button>
          </div>
        )}
        {(page === "home" || (page === "room" && !room)) && (
          <>
            <section className="rt-hero">
              <div className="rt-hero-copy">
                <p className="rt-eyebrow">
                  <span />{" "}
                  {tr(
                    "SATU MEJA. ENAM IDENTITI.",
                    "ONE TABLE. SIX IDENTITIES.",
                  )}
                </p>
                <h1>
                  {tr("Cari padanan.", "Find your match.")}
                  <br />
                  <em>{tr("Cetus Rentak.", "Make your move.")}</em>
                </h1>
                <p className="rt-intro">
                  {tr(
                    "Kad di tangan. Rakan di meja. Padankan warna, gunakan aksi dan habiskan kad anda dahulu.",
                    "Cards in hand. Friends at the table. Match suits, play your actions and be first to empty your hand.",
                  )}
                </p>
                <div className="rt-hero-actions">
                  <button
                    className="rt-primary"
                    onClick={() => setDialog("create")}
                  >
                    {tr("Cipta bilik", "Create room")}
                    <ArrowRight size={20} />
                  </button>
                  <button onClick={() => setDialog("join")}>
                    {tr("Masuk bilik", "Join room")} ↗
                  </button>
                </div>
                <div className="rt-meta">
                  <span>2–6 {tr("pemain", "players")}</span>
                  <span>{tr("Main di telefon", "Play on mobile")}</span>
                  <span>
                    {tr("Percuma bersama rakan", "Free with friends")}
                  </span>
                </div>
              </div>
              <div
                className="rt-hero-art"
                aria-label={tr(
                  "Kad Rentak Peneroka 3 dan 4",
                  "Rentak Explorers 3 and 4",
                )}
              >
                <div className="rt-orbit rt-orbit-one" />
                <div className="rt-orbit rt-orbit-two" />
                <span className="rt-star">✦</span>
                <div className="rt-hero-card one">
                  <CardFace id="R-beban" en={en} />
                </div>
                <div className="rt-hero-card two">
                  <CardFace id="I-3-1" en={en} />
                </div>
                <div className="rt-hero-card three">
                  <CardFace id="I-4-1" en={en} />
                </div>
                <span className="rt-art-note">
                  3 → 4 <b>RENTAK!</b>
                </span>
              </div>
            </section>
            <section className="rt-start-strip">
              <div>
                <span>01</span>
                <b>{tr("Padankan kad", "Match a card")}</b>
                <small>
                  {tr(
                    "Warna, nombor atau aksi sama.",
                    "Same suit, number or action.",
                  )}
                </small>
              </div>
              <div>
                <span>02</span>
                <b>{tr("Cetus kejutan", "Surprise the table")}</b>
                <small>
                  {tr(
                    "Gunakan aksi dan peluang Rentak.",
                    "Play an action or your Rentak pair.",
                  )}
                </small>
              </div>
              <div>
                <span>03</span>
                <b>{tr("Kosongkan tangan", "Empty your hand")}</b>
                <small>
                  {tr("Kad habis? Anda menang!", "No cards left? You win!")}
                </small>
              </div>
              <button className="rt-text" onClick={() => setPage("tutorial")}>
                {tr("Cuba tutorial", "Try the tutorial")} ↗
              </button>
            </section>
            <section className="rt-identities">
              <div className="rt-section-heading">
                <div>
                  <p className="rt-eyebrow">
                    {tr("ENAM WARNA. SATU RENTAK.", "SIX SUITS. ONE RHYTHM.")}
                  </p>
                  <h2>{tr("Kenali kumpulan anda.", "Meet the six groups.")}</h2>
                </div>
                <button className="rt-text" onClick={() => setPage("learn")}>
                  {tr("Terokai RIASEC", "Explore RIASEC")} →
                </button>
              </div>
              <IdentityCards
                en={en}
                onSelect={(suit) => {
                  setLearnSuit(suit);
                  setPage("learn");
                }}
              />
            </section>
          </>
        )}
        {page === "tutorial" && (
          <Tutorial en={en} done={() => setPage(room ? "room" : "home")} />
        )}
        {page === "learn" && (
          <section className="rt-learn">
            <button
              className="rt-text"
              onClick={() => setPage(room ? "room" : "home")}
            >
              ← {tr("Kembali", "Back")}
            </button>
            <p className="rt-eyebrow">RIASEC</p>
            <h1>
              {tr(
                "Enam cara meneroka dunia.",
                "Six ways to explore the world.",
              )}
            </h1>
            <p>
              {tr(
                "Kenali kerjaya mengikut minat. Warna kad yang anda mainkan tidak menentukan personaliti anda.",
                "Explore careers by interest. The suits you play do not determine your personality.",
              )}
            </p>
            <div className="rt-suit-tabs">
              {suits.map((suit) => (
                <button
                  key={suit}
                  aria-pressed={learnSuit === suit}
                  onClick={() => setLearnSuit(suit)}
                >
                  {identities[suit].symbol}{" "}
                  {en ? identities[suit].en : identities[suit].name}
                </button>
              ))}
            </div>
            <p>{categories.find((c) => c.code === learnSuit)?.description}</p>
            <div className="rt-careers">
              {cards
                .filter((c) => c.category === learnSuit)
                .map((c) => (
                  <article key={c.id}>
                    <img
                      src={`${import.meta.env.BASE_URL}cards/${c.id}.webp`}
                      alt=""
                      loading="lazy"
                    />
                    <h2>{c.title}</h2>
                    <p>{c.description}</p>
                    <small>
                      {tr(
                        "Anggaran pendapatan bulanan",
                        "Reference monthly income",
                      )}
                    </small>
                    <b>{salaryRange(salaryFor(c.id))}</b>
                  </article>
                ))}
            </div>
          </section>
        )}
        {page === "room" && room && (
          <>
            <div className="rt-room-bar">
              <div>
                <small>{tr("BILIK", "ROOM")}</small>
                <b data-testid="room-code">{room.code}</b>
              </div>
              <button onClick={() => void invite()}>
                <Copy size={16} />
                {tr("Jemput", "Invite")}
              </button>
              <button onClick={() => setPage("tutorial")}>
                {tr("Cara main", "How to play")}
              </button>
              <button
                aria-label={tr("Keluar bilik", "Leave room")}
                onClick={() => void send({ type: "leave" })}
              >
                <LogOut size={18} />
              </button>
            </div>
            {copied && (
              <p className="rt-copy" role="status">
                {copied}
              </p>
            )}
            {room.phase === "lobby" && (
              <section className="rt-lobby rt-panel">
                <p className="rt-eyebrow">
                  {tr("KUMPULKAN RAKAN ANDA", "GATHER YOUR FRIENDS")}
                </p>
                <h1>{tr("Meja sudah tersedia.", "Your table is ready.")}</h1>
                <p>
                  {tr(
                    "Semua pemain perlu bersedia sebelum hos mula.",
                    "Everyone must be ready before the host starts.",
                  )}
                </p>
                {options(
                  room.settings.mode ?? "normal",
                  room.settings.format ?? "quick",
                  (m, f) =>
                    void send({ type: "settings", settings: settings(m, f) }),
                  busy ||
                    room.host !== room.you ||
                    (!!room.rentak && !room.rentak.matchOver),
                )}
                <div className="rt-rule-summary">
                  {room.settings.mode === "beginner"
                    ? tr(
                        "Beginner: nombor, Pintas, Beban dan Prisma. Tiada Rentak.",
                        "Beginner: numbers, Pintas, Beban and Prisma. No Rentak.",
                      )
                    : tr(
                        "Normal: semua aksi + Rentak sekali setiap pusingan.",
                        "Normal: all actions + one Rentak per round.",
                      )}{" "}
                  {tr(
                    "7 kad seorang. Habiskan tangan untuk menang. Tiada stacking.",
                    "7 cards each. Empty your hand to win. No stacking.",
                  )}
                </div>
                <div className="rt-seats">
                  {Array.from({ length: 6 }, (_, index) => {
                    const p = room.players.filter((p) => !p.withdrawn)[index];
                    return (
                      <div key={index} className={p ? "occupied" : ""}>
                        {p ? (
                          <>
                            <Mascot suit={suits[index]} />
                            <b>
                              {p.name}{" "}
                              {p.id === room.host && <Crown size={15} />}
                            </b>
                            <span>
                              {!p.connected
                                ? tr("Terputus", "Disconnected")
                                : p.ready
                                  ? tr("✓ Bersedia", "✓ Ready")
                                  : tr("Belum bersedia", "Not ready")}
                            </span>
                          </>
                        ) : (
                          <>
                            <span className="rt-empty-seat">+</span>
                            <small>{tr("Tempat kosong", "Open seat")}</small>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="rt-lobby-actions">
                  <button
                    disabled={busy || !online}
                    aria-pressed={
                      room.players.find((p) => p.id === room.you)?.ready
                    }
                    onClick={() =>
                      void send({
                        type: "ready",
                        ready: !room.players.find((p) => p.id === room.you)
                          ?.ready,
                      })
                    }
                  >
                    {room.players.find((p) => p.id === room.you)?.ready
                      ? tr("Batalkan bersedia", "Not ready")
                      : tr("Saya bersedia", "I am ready")}
                  </button>
                  {room.host === room.you && (
                    <button
                      className="rt-primary"
                      disabled={
                        busy ||
                        !online ||
                        room.players.filter((p) => !p.withdrawn).length < 2 ||
                        room.players.some(
                          (p) => !p.withdrawn && (!p.ready || !p.connected),
                        )
                      }
                      onClick={() => void send({ type: "start" })}
                    >
                      {tr("Mulakan permainan", "Start game")} →
                    </button>
                  )}
                </div>
              </section>
            )}
            {room.phase === "playing" && room.rentak && (
              <GameScreen
                key={`${room.code}:${room.rentak.roundNumber}`}
                room={room}
                busy={busy}
                online={online}
                send={send}
                en={en}
                reduced={reduced}
                countdown={countdown}
              />
            )}
            {(room.phase === "finished" || room.phase === "cancelled") && (
              <section className="rt-results rt-panel">
                <span className="rt-result-star">✦</span>
                <p className="rt-eyebrow">
                  {room.rentak?.matchOver
                    ? tr("KEPUTUSAN PERLAWANAN", "MATCH RESULTS")
                    : tr("KEPUTUSAN PUSINGAN", "ROUND RESULTS")}
                </p>
                <h1>
                  {room.winners.length
                    ? room.players.find((p) => p.id === room.winners[0])?.name
                    : tr("Seri!", "A draw!")}
                </h1>
                <p>{room.reason}</p>
                {room.rentak?.matchOver && (
                  <p>
                    {tr("Pemenang perlawanan", "Match winners")}:{" "}
                    <b>
                      {room.players
                        .filter((p) => room.rentak!.matchWinners.includes(p.id))
                        .map((p) => p.name)
                        .join(" & ")}
                    </b>
                  </p>
                )}
                <div className="rt-scoreboard">
                  {[...room.players]
                    .sort(
                      (a, b) =>
                        (room.rentak?.scores[b.id] ?? 0) -
                        (room.rentak?.scores[a.id] ?? 0),
                    )
                    .map((p) => (
                      <div key={p.id}>
                        <span>
                          {p.name}
                          {p.withdrawn
                            ? ` · ${tr("menarik diri", "withdrawn")}`
                            : ""}
                        </span>
                        <b>
                          {room.rentak?.scores[p.id] ?? 0}{" "}
                          {tr("mata", "points")}
                        </b>
                      </div>
                    ))}
                </div>
                {room.host === room.you ? (
                  <div className="rt-lobby-actions">
                    <button
                      className="rt-primary"
                      disabled={busy}
                      onClick={() => void send({ type: "again" })}
                    >
                      {room.rentak?.matchOver
                        ? tr("Main lagi", "Play again")
                        : tr("Pusingan seterusnya", "Next round")}{" "}
                      →
                    </button>
                    {room.rentak?.matchOver &&
                      room.rentak.matchWinners.length > 1 && (
                        <button
                          disabled={busy}
                          onClick={() => void send({ type: "decider" })}
                        >
                          {tr("Pusingan penentu", "Tiebreak round")}
                        </button>
                      )}
                  </div>
                ) : (
                  <p>
                    {tr(
                      "Menunggu hos membuka lobi.",
                      "Waiting for the host to reopen the lobby.",
                    )}
                  </p>
                )}
                <small>
                  {tr(
                    "Semua pemain perlu bersedia semula.",
                    "Everyone must ready up again.",
                  )}
                </small>
              </section>
            )}
            <RoomChat
              messages={session.messages}
              you={room.you}
              online={online}
              historyError={session.chatError}
              onRefresh={() => void session.syncChat()}
              onSend={session.sendChat}
              compact
            />
          </>
        )}
      </main>
      <footer className="rt-footer">
        <b>CARIASEC: RENTAK</b>
        <span>
          {tr(
            "Rakan, kad dan satu lagi pusingan.",
            "Friends, cards and one more round.",
          )}
        </span>
        <button className="rt-text" onClick={() => setPage("tutorial")}>
          {tr("Cara bermain", "How to play")}
        </button>
      </footer>
      {dialog && (
        <div className="rt-modal-backdrop">
          <section
            className="rt-modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rt-dialog-title"
          >
            <button
              className="rt-close"
              aria-label={tr("Tutup", "Close")}
              onClick={() => setDialog(null)}
            >
              <X />
            </button>
            <p className="rt-eyebrow">CARIASEC: RENTAK</p>
            <h2 id="rt-dialog-title">
              {dialog === "settings"
                ? tr("Ikut rentak anda.", "Make it yours.")
                : dialog === "create"
                  ? tr("Buka meja baharu.", "Start a new table.")
                  : tr("Jom masuk meja.", "Join the table.")}
            </h2>
            {dialog === "settings" ? (
              <>
                <label>
                  {tr("Bahasa", "Language")}
                  <select
                    aria-label={tr("Bahasa", "Language")}
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as "ms" | "en")}
                  >
                    <option value="ms">Bahasa Melayu</option>
                    <option value="en">English</option>
                  </select>
                </label>
                <SoundSettings />
                <label className="rt-check">
                  <input
                    type="checkbox"
                    checked={profile.reducedMotion}
                    onChange={(e) => setReducedMotion(e.target.checked)}
                  />
                  {tr("Kurangkan animasi", "Reduced motion")}
                </label>
                <label className="rt-check">
                  <input
                    type="checkbox"
                    checked={countdown}
                    onChange={(e) => {
                      setCountdown(e.target.checked);
                      try {
                        localStorage.setItem(
                          "rentak-countdown",
                          String(e.target.checked),
                        );
                      } catch {}
                    }}
                  />
                  {tr(
                    "Bunyi lima saat terakhir",
                    "Last five seconds countdown sound",
                  )}
                </label>
              </>
            ) : (
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const ok = await send(
                    dialog === "create"
                      ? {
                          type: "create",
                          nickname: name.trim(),
                          settings: settings(),
                        }
                      : {
                          type: "join",
                          nickname: name.trim(),
                          code: code.trim().toUpperCase(),
                        },
                  );
                  if (ok) {
                    rememberName(name);
                    setDialog(null);
                    setPage("room");
                  }
                }}
              >
                <label htmlFor="nickname">
                  {tr("Nama panggilan", "Nickname")}
                </label>
                <input
                  id="nickname"
                  autoComplete="nickname"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  minLength={2}
                  maxLength={20}
                  required
                  placeholder="Aina"
                />
                {dialog === "join" ? (
                  <>
                    <label htmlFor="room-input">
                      {tr("Kod bilik", "Room code")}
                    </label>
                    <input
                      id="room-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      minLength={6}
                      maxLength={6}
                      required
                      placeholder="ABC234"
                      autoCapitalize="characters"
                    />
                  </>
                ) : (
                  options(mode, format, (m, f) => {
                    setMode(m);
                    setFormat(f);
                  })
                )}
                {error && (
                  <p className="rt-form-error" role="alert">
                    {error}
                  </p>
                )}
                <button
                  className="rt-primary rt-full"
                  type="submit"
                  disabled={busy}
                >
                  {busy
                    ? tr("Sebentar…", "One moment…")
                    : dialog === "create"
                      ? tr("Cipta bilik", "Create room")
                      : tr("Masuk bilik", "Join room")}
                  <ArrowRight size={18} />
                </button>
              </form>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <SoundProvider>
      <App />
    </SoundProvider>
  </LanguageProvider>,
);
