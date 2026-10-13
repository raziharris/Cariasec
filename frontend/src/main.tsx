import { LanguageProvider, useI18n } from "./i18n";
import { createActionId } from "./actionId";
import { copyText } from './clipboard';
import { Welcome } from "./components/Welcome";
import { RulesPage } from "./pages/RulesPage";
import { LearnPage } from "./pages/LearnPage";
import { HomePage } from "./pages/HomePage";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { Client, MatchMakeError } from "@colyseus/sdk";
import type { Room as ColyseusRoom } from "@colyseus/sdk";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  ArrowRight,
  ArrowLeft,
  Copy,
  Check,
  Users,
  Sparkles,
  BookOpen,
  X,
  Crown,
  Wifi,
  WifiOff,
  Trophy,
  Layers,
  CircleHelp,
  LogOut,
  RotateCcw,
  Clock3,
  ChevronRight,
  Settings,
} from "lucide-react";
import {
  type Category,
  type View,
  type Command,
  type Session,
  type Reply,
} from "../../shared/game";
import "@fontsource/nunito-sans/latin-400.css";
import "@fontsource/nunito-sans/latin-600.css";
import "@fontsource/nunito-sans/latin-700.css";
import "@fontsource/nunito-sans/latin-800.css";
import "@fontsource/nunito-sans/latin-900.css";
import "./styles.css";
import "./game.css";
import "./polish.css";
const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const endpoint =
  import.meta.env.VITE_COLYSEUS_URL ??
  (import.meta.env.DEV
    ? `${location.protocol}//${location.hostname}:3001`
    : `${location.origin}${basePath}`);
const multiplayer = new Client(endpoint);
let activeRoom: ColyseusRoom | null = null;
import { assetUrl, colors } from "./cards/presentation";
import { salaryFor, salaryRange } from "./salary";
import { lockIPhoneZoom } from "./iphoneZoom";
const short = (s: string) =>
  s
    .split(" ")
    .map((x) => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
function saved(): Session | null {
  try {
    return JSON.parse(sessionStorage.getItem("cariasec-session") ?? "null");
  } catch {
    return null;
  }
}
import { Card } from "./components/Card";
import type { BoardState } from "./game/boardTypes";
import { SoundProvider, useSound } from "./audio/SoundProvider";
import { SoundSettings } from "./audio/SoundSettings";
import { useGameSound } from "./audio/useGameSound";
import { LoadingCards } from './components/LoadingCards';
import { GameControls } from './components/GameControls';
import { GameHud } from './components/GameHud';
import { Celebration } from './components/Celebration';
import { BoardBoundary } from './components/BoardBoundary';
import './ui-upgrade.css';
const PhaserBoard = React.lazy(async () => {
  for (let attempt = 0; ; attempt++) {
    try {
      const module = await import('./components/PhaserBoard');
      return { default: module.PhaserBoard };
    } catch (error) {
      if (navigator.onLine && attempt >= 5) throw error;
      await new Promise<void>(resolve => {
        const done = () => { clearTimeout(timer); window.removeEventListener('online', done); resolve(); };
        const timer = window.setTimeout(done, 600);
        window.addEventListener('online', done, { once: true });
      });
    }
  }
});
function App() {
  const { playSound } = useSound();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const {
    t,
    cards,
    categories,
    cardById,
    profile,
    language,
    setLanguage,
    rememberName,
    setReducedMotion,
    message,
    logText,
  } = useI18n();
  const [page, setPage] = useState("home"),
    [room, setRoom] = useState<View | null>(null),
    [online, setOnline] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [modal, setModal] = useState<"create" | "join" | null>(null),
    [detail, setDetail] = useState<string | null>(null),
    [nickname, setNickname] = useState(profile.name),
    [code, setCode] = useState(
      new URLSearchParams(location.search).get("bilik") ?? "",
    ),
    [seconds, setSeconds] = useState<30 | 60 | 90>(60),
    [limit, setLimit] = useState<60 | 120 | 180>(120),
    [target, setTarget] = useState(""),
    [requested, setRequested] = useState(""),
    [family, setFamily] = useState<Category>("R"),
    [copied, setCopied] = useState(false),
    [manualCopyCode, setManualCopyCode] = useState<string | null>(null),
    [now, setNow] = useState(Date.now());
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const copying = React.useRef(false);
  const currentRoomCode = React.useRef(room?.code);
  currentRoomCode.current = room?.code;
  useEffect(() => {
    setCopied(false);
    setManualCopyCode(null);
    return () => { if (copyTimer.current) clearTimeout(copyTimer.current); };
  }, [room?.code]);
  const osReduced = useReducedMotion();
  const reduced = Boolean(osReduced || profile.reducedMotion);
  const [roomConnected, setRoomConnected] = useState(true);
  const connected = online && (!room || roomConnected);
  useEffect(() => {
    document.documentElement.dataset.motion = reduced ? 'reduced' : 'full';
  }, [reduced]);
  const soundCue = useGameSound(room);
  useEffect(() => { if (error) playSound("error"); }, [error, playSound]);
  useEffect(() => {
    if (!modal && !detail && !settingsOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const previous = document.activeElement as HTMLElement;
    const dialog = document.querySelector<HTMLElement>("[role=dialog]")!;
    const focusable = () =>
      Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input,select,[tabindex="0"]',
        ),
      );
    (dialog.querySelector<HTMLElement>("input") ?? focusable()[0])?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setModal(null);
        setDetail(null);
        setSettingsOpen(false);
        playSound("back");
      }
      if (e.key === "Tab") {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [modal, detail, settingsOpen]);
  useEffect(() => {
    let cancelled = false;
    const checkHealth = async () => {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}api/health`, {
          cache: "no-store",
        });
        if (!cancelled) setOnline(response.ok);
      } catch {
        if (!cancelled) setOnline(false);
      }
    };
    void checkHealth();
    const session = saved();
    if (session)
      void joinRoom({ type: "resume", ...session }).then((ok) => {
        if (!ok) sessionStorage.removeItem("cariasec-session");
      });
    const health = setInterval(checkHealth, 5000);
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      cancelled = true;
      clearInterval(health);
      clearInterval(clock);
      activeRoom?.removeAllListeners();
    };
  }, []);
  useEffect(() => {
    if (!room || page !== "room" || room.phase !== "playing") return;
    const opponents = room.players.filter(
      (p) => p.id !== room.you && p.count > 0,
    );
    if (!opponents.some((p) => p.id === target))
      setTarget(opponents[0]?.id ?? "");
    const have = room.hand.map((id) => cardById[id].category);
    if (!have.includes(family)) setFamily(have[0] ?? "R");
  }, [room, target, family, page]);
  const available = cards.filter(
    (c) => c.category === family && !room?.hand.includes(c.id),
  );
  useEffect(() => {
    if (!available.some((c) => c.id === requested))
      setRequested(available[0]?.id ?? "");
  }, [room?.hand.join(","), family]);

  function attach(joined: ColyseusRoom) {
    setRoomConnected(true);
    activeRoom?.removeAllListeners();
    activeRoom = joined;
    joined.reconnection.minUptime = 0;
    joined.onMessage<View>("state", (view) => {
      setRoom(view);
      setPage("room");
      setModal(null);
    });
    joined.onMessage<string>("removed", (text) => {
      sessionStorage.removeItem("cariasec-session");
      if (activeRoom === joined) activeRoom = null;
      setRoom(null);
      setPage("home");
      setError(text);
    });
    joined.onDrop(() => { setOnline(false); setRoomConnected(false); });
    joined.onReconnect(() => {
      setRoomConnected(true);
      setOnline(true);
      void joined
        .request<never, View>("sync")
        .then((view) => setRoom(view))
        .catch(() => undefined);
    });
    joined.onLeave((_code, reason) => {
      if (activeRoom !== joined) return;
      activeRoom = null;
      setRoomConnected(false);
      setOnline(false);
      if (reason) setError(reason);
    });
  }

  async function joinRoom(
    command: Extract<Command, { type: "create" | "join" | "resume" }>,
  ) {
    try {
      let joined: ColyseusRoom;
      if (command.type === "create") {
        joined = await multiplayer.create("cariasec", command);
      } else {
        try {
          joined = await multiplayer.joinById(command.code, command);
        } catch (error) {
          if (!(error instanceof MatchMakeError) || error.code !== 522)
            throw error;
          const exists = await fetch(
            `${import.meta.env.BASE_URL}api/rooms/${command.code}`,
            { cache: "no-store" },
          );
          if (!exists.ok) throw error;
          joined = await multiplayer.joinOrCreate("cariasec", command);
        }
      }
      attach(joined);
      const session = await joined.request<never, Session>("session");
      const view = await joined.request<never, View>("sync");
      sessionStorage.setItem("cariasec-session", JSON.stringify(session));
      if (command.type !== "resume") rememberName(command.nickname);
      setRoom(view);
      setPage("room");
      setModal(null);
      setOnline(true);
      if (command.type !== "resume") playSound("confirm");
      return true;
    } catch (cause) {
      setRoom(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Sambungan bilik tidak berjaya.",
      );
      return false;
    }
  }

  async function command(c: Command) {
    setError("");
    setBusy(true);
    try {
      if (c.type === "create" || c.type === "join" || c.type === "resume")
        return await joinRoom(c);
      if (!activeRoom) {
        setError("Sila sertai bilik terlebih dahulu.");
        return false;
      }
      const reply = await activeRoom.request<Command, Reply>("command", c, {
        timeout: 7000,
      });
      if (!reply.ok) setError(reply.error);
      else if (c.type === "leave") {
        sessionStorage.removeItem("cariasec-session");
        activeRoom = null;
        setRoom(null);
        setPage("home");
      }
      if (reply.ok && (c.type === "ready" || c.type === "again")) playSound("confirm");
      if (reply.ok && c.type === "leave") playSound("back");
      return reply.ok;
    } catch {
      setError("Sambungan terganggu. Menyegerakkan semula papan…");
      if (activeRoom)
        void activeRoom
          .request<never, View>("sync")
          .then((view) => setRoom(view))
          .catch(() => undefined);
      return false;
    } finally {
      setBusy(false);
    }
  }
  async function copyCode() {
    const text = room?.code;
    if (!text || copying.current) return;
    copying.current = true;
    const success = await copyText(text);
    copying.current = false;
    if (currentRoomCode.current !== text) return;
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopied(success);
    setManualCopyCode(success ? null : text);
    if (success) {
      playSound("confirm");
      copyTimer.current = setTimeout(() => setCopied(false), 2000);
    } else {
      playSound('error');
    }
  }
  const me = room?.players.find((p) => p.id === room.you),
    myTurn = room?.turn === room?.you;
  const current = room?.players.find((p) => p.id === room.turn);
  const latest = room?.log.at(-1);
  const boardState = React.useMemo<BoardState | null>(
    () =>
      room?.phase === "playing"
        ? {
          you: room.you,
          turn: room.turn,
          paused: room.paused,
          deadline: room.deadline,
          turnSeconds: room.settings.turnSeconds,
          actions: room.actions,
          maxActions: room.settings.maxActions,
          deckCount: room.deckCount,
          hand: room.hand.map((id) => ({
            id,
            title: cardById[id].title,
            category: cardById[id].category,
            categoryName:
              categories.find((item) => item.code === cardById[id].category)
                ?.name ?? cardById[id].category,
            artwork: assetUrl(cardById[id].artwork),
          })),
          players: room.players,
          selectedFamily: family,
          selectedTarget: target,
          latest,
          soundCue,
          latestText: logText(latest, room),
          reducedMotion: Boolean(reduced),
          labels: {
            activeRound: t("PUSINGAN AKTIF"),
            paused: t("DIJEDA"),
            waiting: t("MENUNGGU"),
            yourTurn: t("Giliran anda!"),
            friendTurn: t("Giliran {name}", { name: "{name}" }),
            chooseCard: target ? t("Pilih rakan dan kad.") : t("Ambil satu kad."),
            planMove: t("Rancang langkah anda."),
            waitingFriend: t("Menunggu rakan."),
            seconds: t("{count} saat", { count: "{count}" }),
            cards: t("kad"),
            complete: t("lengkap"),
            deck: t("Kad"),
          },
          }
        : null,
    [room, family, target, reduced, language, soundCue],
  );
  function enter(type: "create" | "join") {
    setError("");
    setModal(type);
  }
  return (
    <>
      <header className="site-header">
        <button
          className="brand"
          data-sound="back"
          onClick={() => setPage("home")}
          aria-label={t("Laman utama CARIASEC")}
        >
          <span className="brand-mark">
            <Layers size={23} />
          </span>
          cariasec
        </button>
        <nav aria-label={t("Navigasi utama")}>
          <button className="nav-settings" aria-label={t("Tetapan")}
            data-sound="back" onClick={() => setSettingsOpen(true)}>
            <Settings size={20} />
          </button>
          <select
            className="language-switch"
            aria-label={t("Bahasa")}
            value={language}
            onChange={(event) => setLanguage(event.target.value as "ms" | "en")}
          >
            <option value="ms">BM</option>
            <option value="en">EN</option>
          </select>
          <button
            className={page === "learn" ? "active" : ""}
            data-sound="back"
            onClick={() => setPage("learn")}
          >
            RIASEC
          </button>
          <button
            className={`nav-rules ${page === "rules" ? "active" : ""}`}
            aria-label={t("Cara main")}
            data-sound="back"
            onClick={() => setPage("rules")}
          >
            <CircleHelp size={20} />
            <span>{t("Cara main")}</span>
          </button>
          {room ? (
            <button className="nav-play" data-sound="back" onClick={() => setPage("room")}>
              {t("Bilik")} <ArrowRight size={16} />
            </button>
          ) : (
            <button className="nav-play" data-sound="back" onClick={() => enter("join")}>
              {t("Sertai")} <ArrowRight size={16} />
            </button>
          )}
        </nav>
      </header>
      {!connected && (
        <div className="connection-banner" role="status">
          <WifiOff size={16} /> {t('Menyambung semula...')} <span>{t('Sesi anda disimpan. Kami sedang cuba semula.')}</span>
        </div>
      )}
      {error && (
        <div className="toast" role="alert">
          <span>{message(error)}</span>
          <button aria-label={t("Tutup mesej")} onClick={() => setError("")}>
            <X size={18} />
          </button>
        </div>
      )}
      <main>
        {page === "home" && (
          <HomePage
            room={room}
            setPage={setPage}
            enter={enter}
            setDetail={setDetail}
            setFamily={setFamily}
            family={family}
          />
        )}
        {page === "learn" && (
          <LearnPage
            room={room}
            setPage={setPage}
            enter={enter}
            setDetail={setDetail}
            setFamily={setFamily}
            family={family}
          />
        )}
        {page === "rules" && (
          <RulesPage
            room={room}
            setPage={setPage}
            enter={enter}
            setDetail={setDetail}
            setFamily={setFamily}
            family={family}
          />
        )}
        {page === "room" && room && (
          <section
            className={`room-page ${room.phase === "playing" ? "playing" : ""}`}
          >
            <div className="room-toolbar">
              <div className="room-label">
                <span className="live-dot" />
                {room.phase === "lobby"
                  ? t("LOBI")
                  : room.phase === "playing"
                    ? t("BERMAIN")
                    : t("KEPUTUSAN")}
              </div>
              <button
                className="room-code"
                data-sound="none"
                onClick={copyCode}
                aria-label={t("Salin kod bilik")}
              >
                <small>{t("KOD BILIK")}</small>
                <b data-testid="room-code">{room.code}</b>
                {copied ? <Check size={17} /> : <Copy size={17} />}
              </button>
              <button
                className="text-button"
                onClick={() => command({ type: "leave" })}
                data-sound="none"
              >
                <LogOut size={17} />
                {t("Keluar")}
              </button>
            </div>
            {copied && <p className="copy-feedback" role="status">{t('Kod disalin')}</p>}
            {manualCopyCode === room.code && <div className="manual-copy">
              <p role="status">{t('Browser menyekat salinan automatik. Pilih kod dan salin secara manual.')}</p>
              <label htmlFor="manual-room-code">{t('KOD BILIK')}</label>
              <input id="manual-room-code" value={room.code} readOnly autoFocus onFocus={e => e.currentTarget.select()} onClick={e => e.currentTarget.select()} />
            </div>}
            {room.phase === "lobby" && (
              <div className="lobby">
                <div className="lobby-intro">
                  <div className="eyebrow">
                    <Users size={16} /> {t("LOBI")}
                  </div>
                  <h1>{t("Jom main!")}</h1>
                  <p>{t("Jemput rakan dengan kod bilik.")}</p>
                  <button className="secondary" data-sound="none" onClick={copyCode}>
                    {copied ? <Check size={18} /> : <Copy size={18} />}{" "}
                    {copied ? t("Kod disalin") : t("Salin kod bilik")}
                  </button>
                  <div className="lobby-card-fan">
                    <Card id="A3" small onClick={() => setDetail("A3")} />
                    <Card id="E2" small onClick={() => setDetail("E2")} />
                  </div>
                </div>
                <div className="lobby-panel">
                  <div className="panel-heading">
                    <h2>{t("Pemain")}</h2>
                    <span>{room.players.length}/6</span>
                  </div>
                  <div className="lobby-players">
                    {room.players.map((p, i) => (
                      <div className="lobby-player" key={p.id}>
                        <span className={`avatar avatar-${i}`} aria-hidden="true">{short(p.name)}</span>
                        <div>
                          <b>
                            {p.name}{" "}
                            {p.id === room.you && <small>{t("(Anda)")}</small>}
                          </b>
                          <small>
                            {p.id === room.host ? t("Hos") : t("Pemain")}
                            {p.id === room.host && <Crown size={12} />}
                          </small>
                        </div>
                        <span
                          className={`ready-label ${p.ready && p.connected ? "ready" : ""}`}
                        >
                          {!p.connected
                            ? t("Terputus")
                            : p.ready
                              ? t("Bersedia")
                              : t("Menunggu")}
                        </span>
                      </div>
                    ))}
                    {Array.from(
                      { length: Math.max(0, 2 - room.players.length) },
                      (_, i) => (
                        <div key={i} className="empty-player">
                          <Users size={22} />
                          {t("Menunggu…")}
                        </div>
                      ),
                    )}
                  </div>
                  <div className="lobby-settings">
                    <span>
                      <Clock3 size={16} />
                      {room.settings.turnSeconds} {t("saat / giliran")}
                    </span>
                    <span>
                      <Layers size={16} />
                      {room.settings.maxActions} {t("tindakan")}
                    </span>
                  </div>
                  <button
                    className={me?.ready ? "secondary full" : "primary full"}
                    data-sound="none"
                    disabled={busy || !online}
                    onClick={() =>
                      command({ type: "ready", ready: !me?.ready })
                    }
                  >
                    {me?.ready ? (
                      <>
                        <Check size={18} />
                        {t("Bersedia")}
                      </>
                    ) : (
                      t("Saya sedia")
                    )}
                  </button>
                  {room.host === room.you ? (
                    <button
                      className="primary full"
                      disabled={
                        busy ||
                        room.players.length < 2 ||
                        room.players.some((p) => !p.ready || !p.connected)
                      }
                      onClick={() => command({ type: "start" })}
                      data-sound="none"
                    >
                      {t("Mula")}
                      <ArrowRight size={18} />
                    </button>
                  ) : (
                    <p className="muted centered">{t("Menunggu hos.")}</p>
                  )}
                </div>
              </div>
            )}
            {room.phase === "playing" && (
              <>
                <GameHud room={room} now={now} reduced={reduced} />
                {boardState && (
                  <div className="game-table phaser-game-table">
                    <BoardBoundary title={t('Papan belum berjaya dimuatkan. Sesi anda masih disimpan.')} button={t('Muat semula halaman')}>
                    <React.Suspense
                      fallback={
                        <LoadingCards />
                      }
                    >
                      <PhaserBoard
                        state={boardState}
                        onSelectFamily={setFamily}
                        onSelectTarget={setTarget}
                        onInspectCard={setDetail}
                      />
                    </React.Suspense>
                    </BoardBoundary>
                  </div>
                )}
                <div className="opponents">
                  {room.players
                    .filter((p) => p.id !== room.you)
                    .map((p, i) => (
                      <button
                        key={p.id}
                        className={`opponent ${target === p.id ? "target" : ""} ${room.turn === p.id ? "is-turn" : ""}`}
                        onClick={() => setTarget(p.id)}
                        disabled={!p.count}
                        aria-label={t("Pilih {name}", { name: p.name })}
                      >
                        <span className={`avatar avatar-${i + 1}`}>
                          {short(p.name)}
                        </span>
                        <span className="opponent-info">
                          <b>{p.name}</b>
                          <small>
                            {p.count} {t("kad ·")} {p.families.length}{" "}
                            {t("keluarga")}{" "}
                            {p.connected ? (
                              <Wifi size={12} />
                            ) : (
                              <WifiOff size={12} />
                            )}
                          </small>
                          <span className="family-dots">
                            {categories.map((c) => (
                              <i
                                key={c.code}
                                className={
                                  p.families.includes(c.code) ? "complete" : ""
                                }
                                style={{
                                  background: p.families.includes(c.code)
                                    ? colors[c.code]
                                    : undefined,
                                }}
                              >
                                {c.code}
                              </i>
                            ))}
                          </span>
                        </span>
                        {room.turn === p.id && (
                          <span className="turn-chip">{t("Giliran")}</span>
                        )}
                      </button>
                    ))}
                </div>
                <div className="legacy-game-table" aria-hidden="true">
                  <div className="table-ring" />
                  <div className="legacy-table-top">
                    <span>
                      <span className="live-dot" />{" "}
                      {room.paused ? t("DIJEDA") : t("PUSINGAN AKTIF")}
                    </span>
                    <span>
                      {room.actions} / {room.settings.maxActions}{" "}
                      {t("tindakan")}
                    </span>
                  </div>
                  <div className="table-center">
                    <motion.div
                      className="deck-stack"
                      initial={false}
                      animate={
                        reduced
                          ? {}
                          : {
                              rotate:
                                latest?.kind === "start" ||
                                latest?.kind === "draw"
                                  ? [0, -5, 5, 0]
                                  : 0,
                            }
                      }
                      transition={{ duration: 0.45 }}
                    >
                      <div className="card-back">
                        <Layers size={36} />
                        <b>cariasec</b>

                        <span>✦</span>
                      </div>
                      <span>
                        {room.deckCount} {t("kad")}
                      </span>
                    </motion.div>
                    <motion.div
                      key={room.turn}
                      className="legacy-turn-message"
                      initial={reduced ? false : { opacity: 0.4, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                    />
                    {!reduced && latest?.kind === "transfer" && latest.card && (
                      <motion.div
                        key={latest.id}
                        className="transfer-card"
                        aria-hidden="true"
                        initial={{ opacity: 0, y: -45, scale: 0.65 }}
                        animate={{
                          opacity: [0, 1, 1, 0],
                          y: [-45, 0, 20, 70],
                          scale: [0.65, 1, 1, 0.85],
                        }}
                        transition={{ duration: 1.2 }}
                      >
                        <img
                          src={assetUrl(cardById[latest.card].artwork)}
                          alt=""
                        />
                        <span>{cardById[latest.card].title}</span>
                      </motion.div>
                    )}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={latest?.id}
                      className={`table-event event-${latest?.kind}`}
                      initial={reduced ? false : { opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      role="status"
                    >
                      {latest?.kind === "family" ? (
                        <Trophy size={18} />
                      ) : (
                        <Sparkles size={16} />
                      )}{" "}
                      {logText(latest, room)}
                    </motion.div>
                  </AnimatePresence>
                </div>
                <section className="hand-area">
                  <div className="hand-header">
                    <div>
                      <span className="eyebrow">
                        {room.hand.length} {t("KAD")}
                      </span>
                      <h2>{t("Kad anda")}</h2>
                    </div>
                    <div className="score-badge">
                      <Trophy size={19} />
                      <b>{me?.families.length}</b> {t("lengkap")}
                    </div>
                  </div>
                  <div className="hand-scroll phaser-hand-mirror">
                    {room.hand.map((id) => (
                      <motion.div
                        key={id}
                        layout={!reduced}
                        initial={
                          reduced ? false : { opacity: 0, y: 25, rotateY: 90 }
                        }
                        animate={{ opacity: 1, y: 0, rotateY: 0 }}
                      >
                        <Card
                          id={id}
                          small
                          selected={family === cardById[id].category}
                          onClick={() => {
                            setFamily(cardById[id].category);
                            setDetail(id);
                          }}
                        />
                      </motion.div>
                    ))}
                    {!room.hand.length && (
                      <p className="muted">
                        {t("Tangan kosong. Ambil kad pada giliran anda.")}
                      </p>
                    )}
                  </div>
                  <GameControls room={room} target={target} family={family} requested={requested}
                    busy={busy} online={connected} onTarget={setTarget} onFamily={setFamily} onCard={setRequested} onPreview={setDetail}
                    onSubmit={() => command(target ? { type: 'request', target, card: requested, version: room.version, actionId: createActionId() } : { type: 'draw', version: room.version, actionId: createActionId() })} />
                  <div className="your-families">
                    {me?.families.map((code) => (
                      <span key={code} style={{ borderColor: colors[code] }}>
                        <Trophy size={14} />
                        {categories.find((c) => c.code === code)!.name} ·{" "}
                        {t("Lengkap")}
                      </span>
                    ))}
                  </div>
                </section>
                <details className="activity">
                  <summary>
                    {t("Aktiviti ·")} {room.log.length}
                  </summary>
                  <ol>
                    {[...room.log].reverse().map((entry) => (
                      <li key={entry.id}>{logText(entry, room)}</li>
                    ))}
                  </ol>
                </details>
              </>
            )}
            {(room.phase === "finished" || room.phase === "cancelled") && (
              <motion.div
                className="results"
                initial={reduced ? false : { opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {room.phase === 'finished' && <Celebration key={`${room.code}:${room.version}`} reduced={reduced} />}
                <span className="result-icon">
                  {room.phase === "finished" ? (
                    <Trophy size={44} />
                  ) : (
                    <Users size={44} />
                  )}
                </span>
                <div className="eyebrow">
                  {room.phase === "finished"
                    ? t("PERMAINAN TAMAT")
                    : t("PUSINGAN DIBATALKAN")}
                </div>
                <h1>
                  {room.phase === "cancelled"
                    ? t("Jumpa di pusingan baharu.")
                    : room.winners.length > 1
                      ? t("Kemenangan dikongsi!")
                      : t("Tahniah, {name}!", {
                          name:
                            room.players.find((p) => p.id === room.winners[0])
                              ?.name ?? "",
                        })}
                </h1>
                <p>{message(room.reason)}</p>
                <div className="result-list">
                  {[...room.players]
                    .sort(
                      (a, b) =>
                        b.families.length - a.families.length ||
                        b.count - a.count,
                    )
                    .map((p) => (
                      <div
                        key={p.id}
                        className={room.winners.includes(p.id) ? "winner" : ""}
                      >
                        <span className="avatar" aria-hidden="true">{short(p.name)}</span>
                        <div>
                          <b>
                            {p.name}{" "}
                            {room.winners.includes(p.id) && <Crown size={16} />}
                          </b>
                          <small>
                            {p.families
                              .map(
                                (code) =>
                                  categories.find((c) => c.code === code)!.name,
                              )
                              .join(", ") || t("Belum ada keluarga lengkap")}
                          </small>
                        </div>
                        <strong>
                          {p.families.length} <small>{t("mata")}</small>
                        </strong>
                        <span>
                          {p.count} {t("kad")}
                        </span>
                      </div>
                    ))}
                </div>
                <p className="muted">
                  {room.actions} {t("tindakan · Kad tangan memecah seri.")}
                </p>
                <div className="hero-actions">
                  {room.host === room.you && (
                    <button
                      className="primary"
                      disabled={busy}
                      onClick={() => command({ type: "again" })}
                      data-sound="none"
                    >
                      <RotateCcw size={18} />
                      {t("Main lagi")}
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => setPage("learn")}
                    data-sound="back"
                  >
                    <BookOpen size={18} />
                    {t("Lihat kerjaya")}
                  </button>
                  <button
                    className="text-button"
                    onClick={() => command({ type: "leave" })}
                    data-sound="none"
                  >
                    {t("Laman utama")}
                  </button>
                </div>
              </motion.div>
            )}
          </section>
        )}
      </main>
      <footer>
        <span className="footer-brand">cariasec</span>
        <small>{t("RIASEC · Main & kenali minat")}</small>
      </footer>
      {settingsOpen && (
        <div className="modal-backdrop">
          <section className="modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
            <button className="close" aria-label={t("Tutup")} data-sound="back"
              onClick={() => setSettingsOpen(false)}><X /></button>
            <span className="modal-icon"><Settings size={26} /></span>
            <h2 id="settings-title">{t("Tetapan")}</h2>
            <SoundSettings />
            <label className="motion-setting"><input type="checkbox" checked={profile.reducedMotion} onChange={e => setReducedMotion(e.target.checked)} />{t('Kurangkan animasi')}</label>
          </section>
        </div>
      )}
      <AnimatePresence>
        {modal && (
          <motion.div
            className="modal-backdrop"
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduced ? {} : { opacity: 0 }}
          >
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="room-modal-title"
            >
              <button
                className="close"
                aria-label={t("Tutup")}
                data-sound="back"
                onClick={() => setModal(null)}
              >
                <X />
              </button>
              <span className="modal-icon">
                <Users size={26} />
              </span>

              <h2 id="room-modal-title">
                {modal === "create" ? t("Cipta bilik.") : t("Sertai bilik.")}
              </h2>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  await command(
                    modal === "create"
                      ? {
                          type: "create",
                          nickname,
                          settings: { turnSeconds: seconds, maxActions: limit },
                        }
                      : {
                          type: "join",
                          nickname,
                          code: code.toUpperCase().trim(),
                        },
                  );
                }}
              >
                <label htmlFor="nickname">{t("Nama panggilan")}</label>
                <input
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  minLength={2}
                  maxLength={20}
                  required
                  placeholder={t("Contoh: Aina")}
                  autoComplete="nickname"
                />
                {modal === "join" ? (
                  <>
                    <label htmlFor="room-input">{t("Kod bilik")}</label>
                    <input
                      id="room-input"
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      maxLength={6}
                      minLength={6}
                      required
                      placeholder="ABC234"
                      autoCapitalize="characters"
                    />
                  </>
                ) : (
                  <div className="settings-row">
                    <div>
                      <label htmlFor="seconds">{t("Masa giliran")}</label>
                      <select
                        id="seconds"
                        value={seconds}
                        onChange={(e) =>
                          setSeconds(Number(e.target.value) as 30 | 60 | 90)
                        }
                      >
                        <option value={30}>{t("30 saat")}</option>
                        <option value={60}>{t("60 saat")}</option>
                        <option value={90}>{t("90 saat")}</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="limit">{t("Had tindakan")}</label>
                      <select
                        id="limit"
                        value={limit}
                        onChange={(e) =>
                          setLimit(Number(e.target.value) as 60 | 120 | 180)
                        }
                      >
                        <option value={60}>{t("60 tindakan")}</option>
                        <option value={120}>{t("120 tindakan")}</option>
                        <option value={180}>{t("180 tindakan")}</option>
                      </select>
                    </div>
                  </div>
                )}
                <button
                  className="primary full"
                  disabled={busy || !online}
                  type="submit"
                  data-sound="none"
                >
                  {busy
                    ? t("Sebentar…")
                    : modal === "create"
                      ? t("Cipta bilik")
                      : t("Masuk bilik")}
                  <ArrowRight size={18} />
                </button>
              </form>
              <button
                className="text-button centered"
                onClick={() => setModal(modal === "create" ? "join" : "create")}
              >
                {modal === "create"
                  ? t("Ada kod? Sertai")
                  : t("Tiada bilik? Cipta")}
              </button>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
      {detail && (
        <div className="modal-backdrop">
          <section
            className="modal card-detail"
            role="dialog"
            aria-modal="true"
            aria-label={t("Butiran kad")}
          >
            <button
              className="close"
              aria-label={t("Tutup butiran kad")}
              data-sound="back"
              onClick={() => setDetail(null)}
            >
              <X />
            </button>
            <Card id={detail} />
            <h2>{cardById[detail].title}</h2>
            <p>
              {t("Keluarga")}{" "}
              {
                categories.find((c) => c.code === cardById[detail].category)!
                  .name
              }{" "}
              {t("· Kad")} {detail}
            </p>
            <p>
              {
                categories.find((c) => c.code === cardById[detail].category)!
                  .description
              }
            </p>
            <div className="salary-band" data-testid="salary-band">
              <span>
                {salaryFor(detail).kind === "allowance"
                  ? t("Contoh elaun Ahli Parlimen")
                  : t("Anggaran gaji bulanan")}
              </span>
              <strong>{salaryRange(salaryFor(detail))}</strong>
              <span>{t("Malaysia · sebulan")}</span>
            </div>
            <button className="primary full" onClick={() => setDetail(null)}>
              {t("Faham")} <Check size={17} />
            </button>
          </section>
        </div>
      )}
    </>
  );
}
function AppEntry() {
  const { ready } = useI18n();
  return ready ? <App /> : <Welcome />;
}
lockIPhoneZoom();
createRoot(document.getElementById("root")!).render(
  <LanguageProvider>
    <SoundProvider><AppEntry /></SoundProvider>
  </LanguageProvider>,
);
