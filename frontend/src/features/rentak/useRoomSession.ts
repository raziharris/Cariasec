import { useEffect, useRef, useState } from "react";
import { Client, MatchMakeError, type Room as Connection } from "@colyseus/sdk";
import type { Command, Reply, Session, View } from "../../../../shared/game";
import {
  mergeChat,
  type ChatInput,
  type ChatMessage,
  type ChatReply,
} from "../../../../shared/chat";
const base = import.meta.env.BASE_URL;
const endpoint =
  import.meta.env.VITE_COLYSEUS_URL ??
  (import.meta.env.DEV
    ? `${location.protocol}//${location.hostname}:3001`
    : `${location.origin}${base.replace(/\/$/, "")}`);
const sdk = new Client(endpoint);
const sessionKey = "cariasec-session";
function save(session: Session | null) {
  try {
    if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
    else sessionStorage.removeItem(sessionKey);
  } catch {}
}
export function useRoomSession() {
  const connection = useRef<Connection | null>(null),
    working = useRef(false);
  const [room, setRoom] = useState<View | null>(null),
    [busy, setBusy] = useState(false),
    [online, setOnline] = useState(true),
    [error, setError] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]),
    [chatError, setChatError] = useState("");
  async function syncChat(joined = connection.current) {
    if (!joined) return;
    try {
      const history = await joined.request<never, ChatMessage[]>("chat-sync");
      if (connection.current === joined) {
        setMessages((previous) => mergeChat(history, previous));
        setChatError("");
      }
    } catch {
      setChatError("Chat belum dimuatkan. Cuba lagi.");
    }
  }
  function attach(joined: Connection) {
    connection.current?.removeAllListeners();
    connection.current = joined;
    setOnline(true);
    setMessages([]);
    joined.reconnection.minUptime = 0;
    joined.onMessage<View>("state", (view) => {
      if (connection.current === joined) setRoom(view);
    });
    joined.onMessage<ChatMessage>("chat-message", (item) =>
      setMessages((previous) => mergeChat(previous, [item])),
    );
    joined.onMessage<string>("removed", (text) => {
      if (connection.current !== joined) return;
      save(null);
      connection.current = null;
      setRoom(null);
      setError(text);
    });
    joined.onDrop(() => setOnline(false));
    joined.onReconnect(() => {
      setOnline(true);
      void joined.request<never, View>("sync").then(setRoom);
      void syncChat(joined);
    });
    joined.onLeave(() => {
      if (connection.current === joined) {
        connection.current = null;
        setOnline(false);
      }
    });
    void syncChat(joined);
  }
  async function join(
    command: Extract<Command, { type: "create" | "join" | "resume" }>,
  ) {
    let joined: Connection;
    if (command.type === "create")
      joined = await sdk.create("cariasec", command);
    else {
      try {
        joined = await sdk.joinById(command.code, command);
      } catch (error) {
        if (
          !(error instanceof MatchMakeError) ||
          error.code !== 522 ||
          !(await fetch(`${base}api/rooms/${command.code}`)).ok
        )
          throw error;
        joined = await sdk.joinOrCreate("cariasec", command);
      }
    }
    attach(joined);
    save(await joined.request<never, Session>("session"));
    setRoom(await joined.request<never, View>("sync"));
  }
  async function send(command: Command): Promise<boolean> {
    if (working.current) return false;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      if (
        command.type === "create" ||
        command.type === "join" ||
        command.type === "resume"
      )
        await join(command);
      else {
        if (!connection.current) throw Error("Sambung semula sebelum bermain.");
        const reply = await connection.current.request<Command, Reply>(
          "command",
          command,
          { timeout: 8000 },
        );
        if (!reply.ok) {
          void connection.current?.request<never, View>("sync").then(setRoom);
          throw Error(reply.error);
        }
      }
      return true;
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Sambungan gagal. Cuba lagi.",
      );
      return false;
    } finally {
      working.current = false;
      setBusy(false);
    }
  }
  async function retry() {
    try {
      const session = JSON.parse(
        sessionStorage.getItem(sessionKey) ?? "null",
      ) as Session | null;
      if (session) await send({ type: "resume", ...session });
    } catch {}
  }
  async function sendChat(input: ChatInput): Promise<ChatReply> {
    if (!connection.current || !online)
      return { ok: false, error: "Sambung semula dahulu." };
    try {
      const reply = await connection.current.request<ChatInput, ChatReply>(
        "chat-send",
        input,
        { timeout: 7000 },
      );
      if (reply.ok)
        setMessages((previous) => mergeChat(previous, [reply.message]));
      return reply;
    } catch {
      return { ok: false, error: "Mesej belum dihantar. Cuba lagi." };
    }
  }
  useEffect(() => {
    void retry();
    return () => {
      connection.current?.removeAllListeners();
      void connection.current?.leave(false);
    };
  }, []);
  return {
    room,
    busy,
    online,
    error,
    setError,
    send,
    retry,
    messages,
    chatError,
    syncChat,
    sendChat,
  };
}
