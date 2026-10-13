# CARIASEC playful game UI

Implemented and released on 13 October 2026. Application source commit `d5fa327e408af4f363e039f620bcc8a0edad28d5` was pushed to GitHub `main` and deployed at http://43.156.11.241/Cariasec/. The user's subsequent release instruction authorized publishing this work and set the standing implementation → checks → GitHub push → Tencent deploy → live verification workflow.

## Changes

1. **Tap-based requests:** choose a friend, choose a family, then tap an illustrated missing card. A readable request sentence confirms the intended card and recipient. Dropdown controls remain available under “Pilihan dropdown” for keyboard users and existing workflows. The server still validates every request.
2. **Mobile layout:** compact Phaser board and wrapping opponents, plus a fixed bottom request dock with safe-area padding. Screens from 320 to 430px retain visible actions without horizontal scrolling. Large hands show the selected family on the canvas to avoid unreadably narrow overlapping cards; all cards remain in the semantic mirror and family counts.
3. **Turn clarity:** a visible React HUD, player avatar, countdown ring, brief turn transition and latest public activity. Disconnected players have a distinct state. Room transport connectivity is tracked separately from the HTTP healthcheck so a healthy HTTP endpoint cannot incorrectly re-enable a disconnected player's action button.
4. **RIASEC collections:** six color badges show real private-hand counts out of six. Completed families show trophies and count six even after their cards leave the hand. These counts come only from the player's own server view.
5. **Character choices:** native SVG cat, rabbit, robot, boy student and girl student avatars, selected during onboarding or settings before entering a room. Preferences persist locally. Optional validated avatar metadata is shared with peers and retained on authenticated resume; older players/saved rooms default to cat. No database migration or new dependencies are needed.
6. **Card polish and celebrations:** selected-card lift and family borders, readable request-card previews, larger career detail cards with a short flip transition, short winner confetti, and an explicit persistent “Kurangkan animasi” option that also respects OS motion preferences. Audio remains centralized in the existing SoundManager.
7. **Loading/reconnect:** animated card-loading states, loader progress, a slow-load retry, automatic module-import retry on interrupted loading, and a bounded error boundary with session-preserving reload. The loading overlay clears only after Phaser renders its first frame. Startup uses the latest server view; old game instances cannot mark a new board ready. Scene teardown disables stale input callbacks and wakes the sleeping loop to complete destruction.

## Architecture

React owns onboarding, avatar selection, settings, accessible HUD, request controls, previews and results. Phaser owns the interactive card board, avatar textures, dealing and card/particle effects. Existing Colyseus game commands and engine rules are preserved; the only public game-data addition is optional cosmetic `avatar` metadata. Credentials and other players' private hands remain excluded from public views.

The existing sound suite checks that server actions still produce one matching cue per player, preferences persist, and sources do not overlap. The turn transition does not introduce a second sound for the same server action.

## Verification

Production build/typecheck passed. All 29 engine/socket/localization/data tests passed. All 13 Chromium browser regression tests passed in a final full run; the final live-region adjustment is also checked with the focused accessibility and tap-flow tests. Desktop, mobile/touch emulation and 320/375/390/430px layouts are covered. Physical Safari/iPhone devices have not been tested.

Evidence is in the Playwright report and `docs/screenshots/ui-upgrade-*`. The regression suite exercises the real local Colyseus server, including complete rounds, network recovery, refresh, winner audio and rematch. New coverage checks shared avatars, actual Phaser first-frame readiness, tap requests, persistent motion preferences and a deliberately interrupted Phaser module request. Six-player layout and accessibility are checked at 320px as well as desktop.

Production smoke testing uses the built local HTTP server and verifies both boards reach rendered-ready state, a request synchronizes, refresh restores the hand, CSP remains present, and no page errors or failed requests occur. This is not Tencent or physical iPhone/Safari verification.

## Tencent release verification

The release ran through the existing guarded deployment script. No rooms were active at preflight. An online SQLite backup at `/var/lib/cariasec/cariasec-pre-ui-1791899802844.sqlite` passed `PRAGMA integrity_check`. The prior application version remains in the deployment backup directory for rollback. Nginx configuration validation and all configured public protected-route checks passed before and after release; internal survivor status codes were unchanged.

Both `node scripts/verify-live.mjs` and `npx.cmd tsx scripts/verify-live-sound.ts` passed against Tencent. Reports are `docs/tencent-live-smoke.json` and `docs/tencent-sound-smoke.json`. They verify two real browser clients over Colyseus WebSockets, rendered Phaser boards, shared girl-student/robot avatar choices, tap card requests, mobile action visibility, six progress badges, refresh recovery, persisted motion settings, real sound-source playback, gain/mute preferences and matching original WAV assets. No page errors or failed requests occurred. Layout checks covered 320/375/390/430px. `docs/screenshots/tencent-ui-upgrade-375.png` was visually inspected; screenshots remain local and are excluded from Git.

The deployed server and main/Phaser bundles match the local release artifacts byte for byte:

| Artifact | SHA-256 |
| --- | --- |
| `dist/server.js` | `2e9876b2994f46ab9ba4c743feea429b86a83cb13bbf07e770a5cbf61fe20794` |
| `index-D7oQxxJU.js` | `e2d1ff8a67ab41bf9aa8e243fdef826a7d778f7771b2cba124056b14b03118e9` |
| `PhaserBoard-D7bIjQ8B.js` | `2c947b7e7013db3ab659e46ce5bac131c2dec801ef960646a98c1c005cf3aebb` |

Live checks use Chromium desktop and mobile emulation. Physical speakers and actual Safari/iPhone devices remain untested. The verification follow-up commit contains reports/documentation and test-script improvements only; the deployed application code is the source commit above.

Known build warning: Phaser's lazy chunk is larger than Vite's default 500kB advisory limit; it remains separately loaded from the main application. No additional art/audio/game dependencies were installed.
