# Minimal room chat

React renders a collapsible, room-scoped chat panel in the lobby, game and results. It shows player names, timestamps, own-message styling and unread counts. The composer is 16px on phones, supports Enter to send and Shift+Enter to insert a line break, and retains a draft during disconnection. The message list is keyboard-focusable and politely announces additions. Incoming messages are silent; successful sends use the existing shared confirmation sound.

Colyseus uses separate `chat-send`, `chat-message` and `chat-sync` messages. The authenticated connection determines sender identity; client-supplied sender fields are rejected. Chat does not modify card state, turn deadlines, game versions, actions or the gameplay command budget. Broadcast and history are restricted to room members. Browser text is rendered as plain React text, never HTML. Input validation allows short messages and emojis (up to 240 characters), and rejects malformed/control-character payloads.

No chat-specific anti-spam cooldown or rate limiter was added, as requested. Repeated messages with different IDs are allowed. The pre-existing Colyseus connection-wide 20 messages/second safety limit is unchanged. Retries with the same ID within retained history return the original acknowledgement without rebroadcasting; the frontend merges echo/history/acknowledgement by ID to avoid duplicate display.

The latest 50 messages per room are stored in the new SQLite `room_chat` table and restored after refresh, reconnect or server restart. Room deletion/expiry deletes its chat history. The migration only adds a table and migration marker; existing game snapshots and results are unchanged. History is not saved to browser localStorage and is not included in public room lookup or game/private-hand views.

Build/typecheck and all 31 unit/socket tests passed. New server tests cover identity, isolation, invalid/spoofed payloads, repeated sends without a new cooldown, retry deduplication, unchanged game state, bounded history, restart recovery and deletion. The chat browser scenario checks three independent clients, phone widths 320/375/390/430px, plaintext HTML, unread counts, refresh/offline draft recovery, message synchronization, English labels, accessibility and gameplay after chat. The WebKit scenario passed with the already-documented caught Colyseus constructor-probe diagnostic recorded separately. Physical iPhone Safari is not claimed.

The final complete Chromium run passed all 23 browser tests. Five WebKit card/chat checks also passed. An earlier run exposed an underlying-card tap while Settings was open after the layout shifted; the Phaser bridge now disables scene input while React modals are open and requires matching native card pointer-down/up before inspection. The existing Settings/tap regression checks that a card dialog cannot open behind it. All checks above passed after that fix; the final chat scenario also checks the memoized timestamp formatter and retained offline draft.

The Node test runner emits existing SQLite experimental warnings and Colyseus process-listener warnings when many test-server instances share a process; these were not suppressed by changing production networking.

Initial Tencent preflight found no connected players. Immediately before publication there was one connected player in a finished round, but no active playing rounds. Online backups at `/var/lib/cariasec/cariasec-pre-chat-1791903940365.sqlite` and the refreshed `/var/lib/cariasec/cariasec-pre-chat-final-1791904880776.sqlite` passed integrity validation.

## Tencent release

Application source commit `3c80c8f68967c31d264eaac3f21a0ce207284731` was pushed to GitHub and deployed through the full guarded backend/frontend workflow. PM2 restarted to load the new chat handlers and table. The prior app is backed up at `/var/backups/Cariasec-20261013232127`; its older hashed frontend assets were retained for cached clients without replacing new assets. Nginx validation and configured public protected-route checks passed before/after release; internal survivor status codes were unchanged. The persistent database stayed in place.

The chat scenario passed on live Tencent in both Chromium and WebKit, checking three real clients, room isolation, eight rapid sends without a new chat cooldown, refresh history, retained offline drafts, reconnect, bilingual labels, accessibility, 320/375/390/430px layouts and gameplay after chat. `verify-live.mjs` and `verify-live-sound.ts` also passed. The live WebKit phone chat screenshot was visually inspected. Physical iPhone/Safari and physical speakers are untested; the known caught Colyseus WebKit constructor probe remains recorded separately.

Post-release SQLite integrity is OK, migration markers are 1 and 2, and retained chat histories are bounded. Recent game results from the pre-release backup were compared with the live database and preserved.

Local/deployed SHA-256 values match:

- Server: `bb4893d1e097202234aafacb3c8cbd8b6fc7871fbaffde4715908446c4746de9`
- `index-C4kgrP_M.js`: `78beb57a7717082ba201a777284cc902bcb1b22bf1fdc6de6f1f9d348d2837fc`
- `PhaserBoard-DcfPwGNw.js`: `40a4df0848902a64ab7d6b1e63cf2d8b14dca339529e64d23870cc631d178a30`

The follow-up commit contains verification documentation/reports only.
