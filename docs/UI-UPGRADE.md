# CARIASEC playful game UI

Local implementation, 13 October 2026. Work is based on the existing GitHub-linked checkout. No commit, push or Tencent deployment is included in this change.

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

Known build warning: Phaser's lazy chunk is larger than Vite's default 500kB advisory limit; it remains separately loaded from the main application. No additional art/audio/game dependencies were installed.
