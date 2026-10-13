export const CHAT_LIMIT = 240;
export const CHAT_HISTORY_LIMIT = 50;
export interface ChatInput { id: string; text: string }
export interface ChatMessage {
  id: string;
  playerId: string;
  name: string;
  text: string;
  sentAt: number;
  sequence: number;
}
export type ChatReply = { ok: true; message: ChatMessage } | { ok: false; error: string };
export function mergeChat(...lists: ChatMessage[][]): ChatMessage[] {
  const unique = new Map<string, ChatMessage>();
  for (const list of lists) for (const message of list) unique.set(message.id, message);
  return [...unique.values()].sort((a, b) => a.sequence - b.sequence).slice(-CHAT_HISTORY_LIMIT);
}
