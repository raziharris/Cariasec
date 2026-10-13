import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { createServer } from "node:http";
import { createHash, randomBytes, randomInt, randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
  CloseCode,
  Room as ColyseusRoom,
  Server as ColyseusServer,
  ServerError,
  type AuthContext,
  type Client,
} from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { commandSchema } from "../../shared/schemas.js";
import type {
  Command,
  Player,
  Reply,
  Room as GameRoom,
  Session,
  View,
} from "../../shared/game.js";
import { Store } from "./database/store.js";
import {
  assertInvariant,
  cancel,
  drawWithoutTarget,
  ensure,
  GameError,
  log,
  requestCard,
  startGame,
  timeoutTurn,
  viewFor,
} from "./game/engine.js";

const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

export interface Options {
  dbPath?: string;
  origin?: string;
  maxRooms?: number;
  joinLimitPerMinute?: number;
  disconnectMs?: number;
  roomTtlMs?: number;
  tickMs?: number;
  staticDir?: string;
  basePath?: string;
}

interface PlayerAuth {
  playerId: string;
  player?: Player;
  token: string;
  resume: boolean;
}

interface ClientData {
  playerId: string;
  token: string;
  windowStart: number;
  count: number;
  leaving?: boolean;
  superseded?: boolean;
}

type GameClient = Client<{
  auth: PlayerAuth;
  userData: ClientData;
}>;

interface ActiveRoom {
  runMaintenance(now: number): void;
  expire(message: string): void;
  prepareShutdown(): void;
}

interface Runtime {
  store: Store;
  rooms: Map<string, GameRoom>;
  active: Map<string, ActiveRoom>;
  ipWindows: Map<string, { start: number; count: number }>;
  maxRooms: number;
  joinLimitPerMinute: number;
  disconnectMs: number;
  roomTtlMs: number;
}

function freshRoom(code: string, settings: GameRoom["settings"]): GameRoom {
  const now = Date.now();
  return {
    code,
    host: "",
    phase: "lobby",
    players: [],
    settings,
    deck: [],
    turn: null,
    version: 0,
    actions: 0,
    log: [],
    createdAt: now,
    updatedAt: now,
    deadline: null,
    winners: [],
    reason: null,
    processed: [],
  };
}

function nextRoomCode(runtime: Runtime) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code: string;
  do {
    code = Array.from(
      { length: 6 },
      () => alphabet[randomInt(alphabet.length)],
    ).join("");
  } while (runtime.rooms.has(code) || runtime.active.has(code));
  return code;
}

function limitAddress(runtime: Runtime, address = "unknown") {
  const now = Date.now();
  let window = runtime.ipWindows.get(address);
  if (!window || now - window.start >= 60_000) {
    window = { start: now, count: 0 };
    runtime.ipWindows.set(address, window);
  }
  ensure(
    ++window.count <= runtime.joinLimitPerMinute,
    "Terlalu banyak cubaan. Tunggu seminit.",
  );
}

function maintainRoom(
  old: GameRoom,
  now: number,
  disconnectMs: number,
): GameRoom | null {
  const room = structuredClone(old);
  const expired = room.players.filter(
    (player) =>
      !player.connected &&
      player.disconnectedAt !== null &&
      now - player.disconnectedAt >= disconnectMs,
  );
  let changed = false;

  if (expired.length && room.phase === "playing") {
    cancel(
      room,
      "Pemain tidak kembali dalam 90 saat. Pusingan dibatalkan tanpa pemenang.",
    );
    changed = true;
  }
  if (expired.length && room.phase === "lobby") {
    room.players = room.players.filter((player) => !expired.includes(player));
    if (!room.players.some((player) => player.id === room.host))
      room.host = room.players[0]?.id ?? "";
    changed = true;
  }
  if (
    (room.phase === "finished" || room.phase === "cancelled") &&
    expired.some((player) => player.id === room.host)
  ) {
    const next = room.players.find((player) => player.connected);
    if (next) {
      room.host = next.id;
      changed = true;
    }
  }
  if (!room.players.length) return null;
  if (timeoutTurn(room, now)) changed = true;
  return changed ? room : old;
}

function createRoomClass(runtime: Runtime) {
  return class CariasecRoom extends ColyseusRoom<{
    metadata: { code: string };
    client: GameClient;
  }> {
    static async onAuth(_token: string, raw: unknown, context: AuthContext) {
      const parsed = commandSchema.safeParse(raw);
      if (!parsed.success)
        throw new ServerError(400, "Maklumat bilik tidak sah.");
      const command = parsed.data;
      if (command.type === "create") {
        try {
          limitAddress(runtime, context.ip);
          ensure(
            runtime.rooms.size < runtime.maxRooms,
            "Semua bilik penuh. Cuba lagi sebentar.",
          );
          const code = nextRoomCode(runtime);
          (raw as { serverCode?: string }).serverCode = code;
          const token = randomBytes(32).toString("hex");
          const player: Player = {
            id: randomUUID(),
            name: command.nickname,
            avatar: command.avatar ?? 'cat',
            tokenHash: digest(token),
            connected: true,
            disconnectedAt: null,
            ready: false,
            hand: [],
            families: [],
          };
          return {
            playerId: player.id,
            player,
            token,
            resume: false,
          } satisfies PlayerAuth;
        } catch (error) {
          throw new ServerError(
            400,
            error instanceof GameError
              ? error.message
              : "Tidak dapat mencipta bilik.",
          );
        }
      }
      if (command.type !== "join" && command.type !== "resume")
        throw new ServerError(400, "Maklumat bilik tidak sah.");

      try {
        const room = runtime.rooms.get(command.code);
        ensure(room, "Kod bilik tidak ditemui.");
        if (command.type === "resume") {
          const player = room.players.find(
            (candidate) => candidate.tokenHash === digest(command.token),
          );
          ensure(player, "Sesi tidak sah. Sertai bilik semula.");
          ensure(
            player.connected ||
              player.disconnectedAt === null ||
              Date.now() - player.disconnectedAt < runtime.disconnectMs,
            "Tempoh sambungan semula telah tamat.",
          );
          return {
            playerId: player.id,
            token: command.token,
            resume: true,
          } satisfies PlayerAuth;
        }

        limitAddress(runtime, context.ip);
        ensure(room.phase === "lobby", "Permainan sudah bermula.");
        ensure(room.players.length < 6, "Bilik penuh (6 pemain).");
        ensure(
          !room.players.some(
            (player) =>
              player.name.toLocaleLowerCase() ===
              command.nickname.toLocaleLowerCase(),
          ),
          "Nama ini sudah digunakan. Pilih nama lain.",
        );
        const token = randomBytes(32).toString("hex");
        const player: Player = {
          id: randomUUID(),
          name: command.nickname,
          avatar: command.avatar ?? 'cat',
          tokenHash: digest(token),
          connected: true,
          disconnectedAt: null,
          ready: false,
          hand: [],
          families: [],
        };
        return {
          playerId: player.id,
          player,
          token,
          resume: false,
        } satisfies PlayerAuth;
      } catch (error) {
        throw new ServerError(
          400,
          error instanceof GameError
            ? error.message
            : "Tidak dapat menyertai bilik.",
        );
      }
    }

    private game!: GameRoom;
    private connections = new Map<string, GameClient>();
    private pendingReconnections = new Map<string, { reject(): void }>();

    async onCreate(raw: unknown) {
      const parsed = commandSchema.safeParse(raw);
      ensure(
        parsed.success &&
          (parsed.data.type === "create" ||
            parsed.data.type === "join" ||
            parsed.data.type === "resume"),
        "Maklumat bilik tidak sah.",
      );
      const command = parsed.data;
      let code: string;

      if (command.type === "create") {
        ensure(command.serverCode, "Kod bilik tidak dapat dijana.");
        code = command.serverCode;
        this.game = freshRoom(code, command.settings);
      } else {
        code = command.code;
        ensure(
          !runtime.active.has(code),
          "Bilik sedang disambungkan. Cuba lagi.",
        );
        const stored = runtime.rooms.get(code);
        ensure(stored, "Kod bilik tidak ditemui.");
        this.game = structuredClone(stored);
      }

      this.roomId = code;
      this.metadata = { code };
      this.maxClients = 12;
      this.maxMessagesPerSecond = 20;
      this.autoDispose = false;
      this.patchRate = null;
      runtime.active.set(code, this);
      await this.setMetadata({ code });

      this.onMessage("sync", (client: GameClient) => this.view(client));
      this.onMessage("session", (client: GameClient): Session => ({
        code: this.game.code,
        token: client.userData!.token,
      }));
      this.onMessage("command", (client: GameClient, command: unknown) =>
        this.handleCommand(client, command),
      );
    }

    onJoin(client: GameClient) {
      const auth = client.auth!;
      const oldClient = this.connections.get(auth.playerId);
      client.userData = {
        playerId: auth.playerId,
        token: auth.token,
        windowStart: Date.now(),
        count: 0,
      };
      this.connections.set(auth.playerId, client);

      if (oldClient && oldClient !== client) {
        oldClient.userData!.superseded = true;
        this.pendingReconnections.get(auth.playerId)?.reject();
        this.pendingReconnections.delete(auth.playerId);
        oldClient.send("removed", "Sesi disambungkan pada tab lain.");
        oldClient.leave(CloseCode.CONSENTED, "Sesi diganti.");
      }

      const room = structuredClone(this.game);
      if (auth.resume) {
        const player = room.players.find((item) => item.id === auth.playerId);
        ensure(player, "Sesi tidak sah.");
        player.connected = true;
        player.disconnectedAt = null;
        log(room, `${player.name} telah kembali.`, "connection");
        if (
          room.phase === "playing" &&
          room.players.every((item) => item.connected)
        )
          room.deadline = Date.now() + room.settings.turnSeconds * 1000;
      } else {
        ensure(auth.player, "Pemain tidak sah.");
        ensure(room.phase === "lobby", "Permainan sudah bermula.");
        ensure(room.players.length < 6, "Bilik penuh (6 pemain).");
        ensure(
          !room.players.some(
            (item) =>
              item.name.toLocaleLowerCase() ===
              auth.player!.name.toLocaleLowerCase(),
          ),
          "Nama ini sudah digunakan. Pilih nama lain.",
        );
        room.players.push(auth.player);
        if (!room.host) room.host = auth.player.id;
      }
      this.commit(room);
    }

    onDrop(client: GameClient, code?: number) {
      const data = client.userData;
      if (!data || data.leaving || data.superseded) return;
      if (this.connections.get(data.playerId) !== client) return;
      this.markDisconnected(data.playerId);
      if (code === CloseCode.SERVER_SHUTDOWN || code === CloseCode.CONSENTED)
        return;
      const pending = this.allowReconnection(client, "manual");
      this.pendingReconnections.set(data.playerId, {
        reject: () => pending.reject(),
      });
    }

    onReconnect(client: GameClient) {
      const data = client.userData;
      if (!data) return;
      this.pendingReconnections.delete(data.playerId);
      this.connections.set(data.playerId, client);
      const room = structuredClone(this.game);
      const player = room.players.find((item) => item.id === data.playerId);
      if (!player) return;
      player.connected = true;
      player.disconnectedAt = null;
      log(room, `${player.name} telah kembali.`, "connection");
      if (
        room.phase === "playing" &&
        room.players.every((item) => item.connected)
      )
        room.deadline = Date.now() + room.settings.turnSeconds * 1000;
      this.commit(room);
    }

    onLeave(client: GameClient) {
      const data = client.userData;
      if (!data || data.leaving || data.superseded) return;
      if (this.connections.get(data.playerId) !== client) return;
      this.connections.delete(data.playerId);
      const player = this.game.players.find(
        (item) => item.id === data.playerId,
      );
      if (player?.connected) this.markDisconnected(data.playerId);
    }

    onDispose() {
      for (const pending of this.pendingReconnections.values())
        pending.reject();
      this.pendingReconnections.clear();
      if (this.game && runtime.active.get(this.game.code) === this)
        runtime.active.delete(this.game.code);
    }

    runMaintenance(now: number) {
      if (now - this.game.updatedAt > runtime.roomTtlMs) {
        this.expire("Bilik telah tamat tempoh.");
        return;
      }
      for (const player of this.game.players) {
        if (
          !player.connected &&
          player.disconnectedAt !== null &&
          now - player.disconnectedAt >= runtime.disconnectMs
        ) {
          this.pendingReconnections.get(player.id)?.reject();
          this.pendingReconnections.delete(player.id);
        }
      }
      const next = maintainRoom(this.game, now, runtime.disconnectMs);
      if (!next) {
        runtime.rooms.delete(this.game.code);
        runtime.store.delete(this.game.code);
        runtime.active.delete(this.game.code);
        void this.disconnect();
      } else if (next !== this.game) {
        this.commit(next);
      }
    }

    expire(message: string) {
      for (const client of this.connections.values()) {
        if (client.userData) client.userData.leaving = true;
        client.send("removed", message);
      }
      runtime.rooms.delete(this.game.code);
      runtime.store.delete(this.game.code);
      runtime.active.delete(this.game.code);
      void this.disconnect();
    }

    prepareShutdown() {
      const room = structuredClone(this.game);
      let changed = false;
      for (const player of room.players) {
        if (!player.connected) continue;
        player.connected = false;
        player.disconnectedAt = Date.now();
        changed = true;
      }
      if (changed) this.commit(room);
      for (const client of this.connections.values())
        if (client.userData) client.userData.leaving = true;
      for (const pending of this.pendingReconnections.values())
        pending.reject();
      this.pendingReconnections.clear();
    }

    private view(client: GameClient): View {
      const playerId = client.userData?.playerId;
      const player =
        playerId && this.game.players.find((item) => item.id === playerId);
      ensure(player, "Sesi tidak sah.");
      return viewFor(this.game, player.id);
    }

    private publish() {
      for (const [playerId, client] of this.connections) {
        if (
          client.state === 1 &&
          this.game.players.some((item) => item.id === playerId)
        )
          client.send("state", viewFor(this.game, playerId));
      }
    }

    private commit(room: GameRoom) {
      assertInvariant(room);
      room.version++;
      room.updatedAt = Date.now();
      this.game = room;
      runtime.rooms.set(room.code, room);
      runtime.store.save(room);
      this.publish();
    }

    private markDisconnected(playerId: string) {
      const room = structuredClone(this.game);
      const player = room.players.find((item) => item.id === playerId);
      if (!player || !player.connected) return;
      player.connected = false;
      player.disconnectedAt = Date.now();
      log(
        room,
        `${player.name} terputus. Menunggu sambungan semula.`,
        "connection",
      );
      this.commit(room);
    }

    private checkMessageLimit(client: GameClient) {
      const data = client.userData!;
      const now = Date.now();
      if (now - data.windowStart > 10_000) {
        data.windowStart = now;
        data.count = 0;
      }
      ensure(
        ++data.count <= 35,
        "Terlalu banyak tindakan. Cuba sebentar lagi.",
      );
    }

    private handleCommand(client: GameClient, raw: unknown): Reply {
      try {
        this.checkMessageLimit(client);
        const parsed = commandSchema.safeParse(raw);
        ensure(parsed.success, "Maklumat tindakan tidak sah.");
        const command: Command = parsed.data;
        ensure(
          command.type !== "create" &&
            command.type !== "join" &&
            command.type !== "resume",
          "Gunakan sambungan bilik untuk tindakan ini.",
        );
        const data = client.userData!;
        const room = structuredClone(this.game);
        const player = room.players.find((item) => item.id === data.playerId);
        ensure(player, "Sesi tidak sah.");

        if (command.type === "ready") {
          ensure(room.phase === "lobby", "Permainan sudah bermula.");
          player.ready = command.ready;
        }
        if (command.type === "start") startGame(room, player.id);
        if (command.type === "request")
          requestCard(
            room,
            player.id,
            command.target,
            command.card,
            command.version,
            command.actionId,
          );
        if (command.type === "draw")
          drawWithoutTarget(room, player.id, command.version, command.actionId);
        if (command.type === "again") {
          ensure(
            room.host === player.id,
            "Hanya hos boleh membuka pusingan baharu.",
          );
          ensure(
            room.phase === "finished" || room.phase === "cancelled",
            "Pusingan belum tamat.",
          );
          room.phase = "lobby";
          room.players = room.players.filter((item) => item.connected);
          room.deck = [];
          room.turn = null;
          room.actions = 0;
          room.log = [];
          room.winners = [];
          room.reason = null;
          room.deadline = null;
          room.createdAt = Date.now();
          for (const item of room.players) {
            item.hand = [];
            item.families = [];
            item.ready = false;
          }
        }
        if (command.type === "leave") {
          if (room.phase === "playing")
            cancel(
              room,
              `${player.name} meninggalkan permainan. Pusingan dibatalkan tanpa pemenang.`,
            );
          if (room.phase === "lobby") {
            room.players = room.players.filter((item) => item.id !== player.id);
            if (room.host === player.id) room.host = room.players[0]?.id ?? "";
          } else {
            player.connected = false;
            player.disconnectedAt = Date.now();
            player.tokenHash = "";
            if (room.host === player.id)
              room.host =
                room.players.find((item) => item.connected)?.id ?? player.id;
          }
          data.leaving = true;
          this.connections.delete(player.id);
          client.send("removed", "Anda telah meninggalkan bilik.");
          if (!room.players.length) {
            runtime.rooms.delete(room.code);
            runtime.store.delete(room.code);
            runtime.active.delete(room.code);
            this.clock.setTimeout(() => void this.disconnect(), 0);
          } else {
            this.commit(room);
          }
          this.clock.setTimeout(
            () => client.leave(CloseCode.CONSENTED, "Keluar bilik."),
            0,
          );
          return { ok: true };
        }

        this.commit(room);
        return { ok: true };
      } catch (error) {
        if (!(error instanceof GameError))
          console.error("command_failure", error);
        return {
          ok: false,
          error:
            error instanceof GameError
              ? error.message
              : "Tindakan tidak dapat diproses. Cuba lagi.",
        };
      }
    }
  };
}

export function createApp(options: Options = {}) {
  const configuredBase = (options.basePath ?? "").trim();
  const basePath = configuredBase
    ? `/${configuredBase.replace(/^\/+|\/+$/g, "")}`
    : "";
  const origin = options.origin ?? "http://127.0.0.1:5173";
  const maxRooms = options.maxRooms ?? 200;
  if (!Number.isInteger(maxRooms) || maxRooms < 1 || maxRooms > 1000)
    throw new Error("MAX_ROOMS mestilah nombor bulat antara 1 dan 1000.");
  const joinLimitPerMinute = options.joinLimitPerMinute ?? 120;
  if (!Number.isInteger(joinLimitPerMinute) || joinLimitPerMinute < 1)
    throw new Error("Had kemasukan mestilah nombor bulat positif.");

  const store = new Store(options.dbPath ?? "data/cariasec.sqlite");
  const rooms = new Map<string, GameRoom>();
  const active = new Map<string, ActiveRoom>();
  const disconnectMs = options.disconnectMs ?? 90_000;
  const roomTtlMs = options.roomTtlMs ?? 2 * 3600_000;
  for (const room of store.load()) {
    if (Date.now() - room.updatedAt > roomTtlMs) {
      store.delete(room.code);
      continue;
    }
    for (const player of room.players) {
      player.connected = false;
      player.disconnectedAt = Date.now();
    }
    rooms.set(room.code, room);
  }

  const runtime: Runtime = {
    store,
    rooms,
    active,
    ipWindows: new Map(),
    maxRooms,
    joinLimitPerMinute,
    disconnectMs,
    roomTtlMs,
  };

  const http = createServer();
  const transport = new WebSocketTransport({
    server: http,
    maxPayload: 8192,
    perMessageDeflate: false,
    beforeUpgrade: (_url, context) => {
      const requestOrigin = context.headers.get("origin");
      if (requestOrigin && requestOrigin !== origin)
        return new Response("Origin tidak dibenarkan.", { status: 403 });
    },
  });
  if (basePath) {
    http.prependListener("upgrade", (request) => {
      if (request.url === basePath) request.url = "/";
      else if (request.url?.startsWith(`${basePath}/`))
        request.url = request.url.slice(basePath.length);
      else request.url = "/__outside_cariasec_base__";
    });
  }
  const app = transport.getExpressApp();
  if (basePath) {
    app.use((request, response, next) => {
      if (
        (request as express.Request & { cariasecBaseMatched?: boolean })
          .cariasecBaseMatched === false
      )
        return response.status(404).end();
      if (request.url === basePath) request.url = "/";
      else if (request.url.startsWith(`${basePath}/`))
        request.url = request.url.slice(basePath.length);
      next();
    });
  }
  app.disable("x-powered-by");
  app.enable("strict routing");
  app.use((request, response, next) => {
    if (request.headers.origin && request.headers.origin !== origin)
      return response.status(403).json({ error: "Origin tidak dibenarkan." });
    next();
  });
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          // Phaser decodes locally fetched card textures through blob URLs.
          "img-src": ["'self'", "data:", "blob:"],
          "style-src": ["'self'", "'unsafe-inline'"],
          "connect-src": ["'self'", origin],
          "upgrade-insecure-requests": null,
        },
      },
    }),
  );
  app.use("/api", rateLimit({ windowMs: 60_000, limit: 120 }));
  app.get("/api/health", (_request, response) => {
    try {
      store.db.prepare("SELECT 1").get();
      response.json({ status: "ok", rooms: rooms.size, transport: "colyseus" });
    } catch {
      response.status(503).json({ status: "unavailable" });
    }
  });
  app.get("/api/rooms/:code", (request, response) => {
    const code = request.params.code?.toUpperCase();
    if (!/^[A-Z2-9]{6}$/.test(code) || !rooms.has(code))
      return response.status(404).end();
    response.status(204).end();
  });

  const gameServer = new ColyseusServer({ transport, greet: false });
  gameServer
    .define("cariasec", createRoomClass(runtime))
    .filterBy(["code"] as never[]);

  if (options.staticDir) {
    const staticRoot = resolve(options.staticDir);
    const sendIndex = (
      _request: express.Request,
      response: express.Response,
    ) => {
      response.set("Cache-Control", "no-store");
      response.sendFile(resolve(staticRoot, "index.html"));
    };
    app.use(
      express.static(staticRoot, {
        setHeaders(response, filePath) {
          if (filePath.endsWith("index.html"))
            response.setHeader("Cache-Control", "no-store");
        },
      }),
    );
    app.get("/{*path}", sendIndex);
  }

  const timer = setInterval(() => {
    const now = Date.now();
    for (const [code, old] of rooms) {
      const instance = active.get(code);
      if (instance) {
        instance.runMaintenance(now);
        continue;
      }
      if (now - old.updatedAt > roomTtlMs) {
        rooms.delete(code);
        store.delete(code);
        continue;
      }
      const next = maintainRoom(old, now, disconnectMs);
      if (!next) {
        rooms.delete(code);
        store.delete(code);
      } else if (next !== old) {
        assertInvariant(next);
        next.version++;
        next.updatedAt = now;
        rooms.set(code, next);
        store.save(next);
      }
    }
    for (const [address, window] of runtime.ipWindows)
      if (now - window.start > 60_000) runtime.ipWindows.delete(address);
  }, options.tickMs ?? 1000);
  timer.unref();
  store.prune(Date.now());

  let closed = false;
  let requestPathRewriterInstalled = false;
  return {
    app,
    http,
    gameServer,
    store,
    rooms,
    async listen(port: number, hostname = "127.0.0.1") {
      await gameServer.listen(port, hostname);
      if (basePath && !requestPathRewriterInstalled) {
        requestPathRewriterInstalled = true;
        http.prependListener("request", (request) => {
          const scoped = request as typeof request & {
            cariasecBaseMatched?: boolean;
          };
          if (request.url === basePath) {
            scoped.cariasecBaseMatched = true;
            request.url = "/";
          } else if (request.url?.startsWith(`${basePath}/`)) {
            scoped.cariasecBaseMatched = true;
            request.url = request.url.slice(basePath.length);
          } else {
            scoped.cariasecBaseMatched = false;
            request.url = "/__outside_cariasec_base__";
          }
        });
      }
    },
    async close() {
      if (closed) return;
      closed = true;
      clearInterval(timer);
      for (const instance of active.values()) instance.prepareShutdown();
      await gameServer.gracefullyShutdown(false);
      const websocketServer = (
        transport as WebSocketTransport & {
          wss?: { clients: Set<{ terminate(): void }> };
        }
      ).wss;
      for (const socket of websocketServer?.clients ?? []) socket.terminate();
      http.closeAllConnections();
      if (http.listening)
        await new Promise<void>((done) => http.close(() => done()));
      store.close();
    },
  };
}
