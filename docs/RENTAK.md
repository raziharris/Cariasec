# CARIASEC: RENTAK

The active game is now the `rentak-v1` server-authoritative card game. React owns navigation, hands and accessible actions; Phaser draws the central table. The existing Colyseus sessions, chat, SQLite store and Tencent `/Cariasec/` route remain the infrastructure.

## Rules

- 2–6 players, seven cards each. Normal has 102 unique instances; Beginner has 90 and omits Pusing, Teduh and Rentak.
- Match the active suit, number or action. Prisma chooses a suit. After Prisma only that suit or another Prisma matches.
- Pintas skips the next player. Pusing reverses direction; in two-player games the opponent still gets the next turn.
- Beban requires the next player to draw two and end their turn, or play any Teduh to cancel it. No stacking. Outside a penalty Teduh is an ordinary matching card.
- Rentak: once per round, play two consecutive numbers of the same suit, ascending or descending. The first must match normally. No wrap, no penalty response, no Rentak after drawing.
- Drawing is voluntary. If the new card matches, play only that card or choose Keep & end. Otherwise the turn ends immediately. The original deadline remains.
- Empty hand wins immediately, before the final card's effect. A final Rentak may win. One-card status is automatic.
- Preserve the top discard when recycling. A full cycle with no played or drawn cards ends in a draw with no points.
- Normal timer 30s; Beginner 45s. Timeout draws once (or accepts the penalty) and ends the turn, without auto-playing. If already drawn it only ends the turn.
- Quick Round is one round. Party Match is three; wins earn one point. Highest score wins, ties share the result, with an optional extra round. Every next round/rematch requires all players to ready up.
- Disconnect pauses up to 30s per interruption, with a 60s budget per player per round. Seats are reserved for 90s. Expiry/leave withdraws the player and returns their cards privately to the draw pile. Two or more remaining players continue; one remaining player wins by withdrawal.

Chaos and commercial features are intentionally deferred, as specified. The 5–10 minute duration is a playtest target, not a measured claim.

## Code and verification

- `shared/rentak.ts`: deck, identities, matching and versioned state.
- `backend/src/game/engine.ts`: validated actions, endgame, pauses and per-player projections. Draw identities never appear in shared events.
- `frontend/src/features/rentak/`: session hook, hand controls, native SVG characters, Phaser table and tutorial.
- `npm.cmd test`: engine edge cases, 300 complete simulations across 2–6 players and both modes, real Colyseus clients from 2 through 6, reconnect/restart, privacy, chat, origin and rate limits.
- `npm.cmd run test:e2e`: active Rentak UI suite, including 320/375/390/430px, tutorial, English, accessibility, real browser multiplayer, refresh, chat, Normal Party Match and Beginner Quick Round. Older E2E files describe the retired family-request UI and are retained as historical references, not selected by the active Playwright configuration.
- `npm.cmd run build`: TypeScript, Vite client and bundled Node server.
- `node scripts/verify-live.mjs`: runs the same browser suite against the public HTTPS route and writes a separate Rentak report.

## Cutover and rollback

Use `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/release-rentak.ps1`. It temporarily blocks new room creation on both target virtual hosts, refuses cutover while a legacy round is playing, creates a SQLite online backup and verifies its integrity, then invokes the existing guarded Tencent deployment. The temporary creation block is always removed. Other hosted routes are checked by the established deploy script.

Snapshots now carry schema version 2. Old snapshots stay in SQLite but are never loaded as Rentak rooms. Historical result records remain; new records include `rulesVersion`, round number, scores and outcome. The old application directory and pre-cutover database backup are kept on Tencent. An application rollback may use the previous directory; restore the pre-cutover database before a rules rollback so the old engine never reads new Rentak snapshots. Do not restore a database while its process is writing.

Keep keys, environment files, SQLite databases and the source PDF out of Git. `docs/tencent-live-smoke.json` is a pre-existing unrelated working-tree change and is not part of this release.
