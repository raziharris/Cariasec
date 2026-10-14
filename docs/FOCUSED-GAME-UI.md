# Focused in-game UI

Requested scope: items 1, 3, 4, 5 and 8 only. Existing React pages, card artwork,
Phaser gestures, audio preferences, advanced dropdown controls and game rules
are preserved. No backend, Colyseus protocol, database or spam-limit changes.

- A single React HUD owns the turn, countdown and action counter. Phaser no
  longer duplicates this text or runs an extra one-second clock interval.
- Requests show one step at a time: friend, family, card. A card must be
  explicitly selected before submitting. Successful requests return to step one;
  unavailable or changed cards clear stale confirmation. The existing dropdown
  alternative remains collapsed for keyboard/assistive use.
- Six compact RIASEC badges stay on one row, including at 320px. Tapping a badge
  reveals its name/progress and an optional family shortcut.
- In-game chat becomes a header icon with unread count. Its on-demand dialog
  preserves message history/drafts across the lobby-to-game transition, traps
  focus, closes with Escape/backdrop/close button and restores focus. No new
  cooldown or anti-spam policy was added.
- A compact sticky header retains room-code copying and places settings,
  language, rules, RIASEC and exit inside an accessible game menu. Normal
  navigation remains unchanged outside the playing screen.
- Menu, chat and settings disable Phaser input while open. Card artwork stays
  large and uncropped; the board is shorter because duplicated status text was
  removed. Five/six-player board height is keyed to room size, not the currently
  visible wizard step.

## Verification

Regression coverage includes a full two-player round/rematch, six-player board,
reconnect/refresh, clipboard fallbacks, chat, audio, both languages and axe
accessibility checks. The focused UI test exercises widths 320/375/390/430,
step transitions, explicit confirmation, collection details, unread chat,
Escape/focus restoration and settings access. Screenshots are generated under
`docs/screenshots/` (ignored in Git).

Browser/device emulation is not a physical iPhone or speaker listening test.
Release results are recorded after verification below.

### 2026-10-14 checks

- Final complete Chromium regression run: **24/24 passed**, including the
  six-player height check, full round/rematch, sound and focused UI coverage.

- TypeScript and the `/Cariasec/` production build pass. All 31 engine, socket,
  localization and data tests pass. The existing lazy Phaser chunk-size advisory
  remains; no packages or artwork/audio assets were added.
- The built local production server passes two-client gameplay and refresh
  recovery with CSP present, no page errors and no failed requests; see
  `production-smoke.json`.
- WebKit checks pass for card sharpness, full-hand pagination, swipe, enlarged
  previews at all four phone widths, and the focused request/menu/chat flow.
  Explicit menu-trigger focus restoration handles WebKit's pointer-focus
  behavior. The six-player height regression and full-page axe audits pass.
- One earlier concurrent WebKit offline-chat run reported an access-control
  diagnostic from an intentionally failed health poll. The same chat test passed
  on re-run without changing error filters or networking code. Existing caught
  Colyseus constructor-probe diagnostics remain separately attached, as before.
- Menu, chat and request-step screenshots were visually inspected, not only
  HTTP-checked. These are Chromium/WebKit emulation checks, not physical Safari,
  iPhone keyboard or speaker listening tests.

### Tencent release

Live URL: `http://43.156.11.241/Cariasec/`.
Deployed application source: `f4977bbbb27fdae5ee0aeacc3dd34b940a11b234`.

The frontend was published by adding hashed assets and atomically switching the
HTML entry point. PM2 PID `3474325` stayed unchanged throughout deployment and
post-release checks. The backend bundle hash is unchanged:
`bb4893d1e097202234aafacb3c8cbd8b6fc7871fbaffde4715908446c4746de9`.
No Nginx, multiplayer process, networking, game rules or database migration was
changed. All eight protected public routes passed before and after publication.

Rollback files: `/var/backups/Cariasec-focus-ui-20261014223526/public`.
The online database backup
`/var/lib/cariasec/cariasec-pre-focus-ui-1791988311960.sqlite` was independently
reopened read-only and passed `PRAGMA integrity_check`.

Live verification passed:

- Six Chromium tests: all four phone-width card/swipe/preview checks, chat and
  the focused request/collection/menu flow.
- One WebKit focused UI test, including phone widths, game menu focus, chat,
  settings, translated labels and synchronized card requests.
- `node scripts/verify-live.mjs` and `npx.cmd tsx scripts/verify-live-sound.ts`:
  real two-client WebSockets, refresh recovery, all 36 card assets, preferences,
  sound gain/mute, synchronized deal/request cues and no page/request failures.
- Live menu/chat/request screenshots were visually inspected. Remote main JS,
  Phaser JS and CSS SHA-256 values match the local release files.

Live reports: `tencent-live-smoke.json`, `tencent-sound-smoke.json` and
`tencent-focused-ui-smoke.json`. Follow-up report commits do not change the
deployed application bundle.
