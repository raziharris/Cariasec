# CARIASEC sound effects

The six WAV files in `public/sounds` are unchanged originals from the provided
CARIASEC Sound Kit. Its reusable `SoundProvider`, `useSound`, and `SoundSettings`
interfaces have been adapted to CARIASEC's bilingual React and Phaser application.

| Effect | Interaction |
| --- | --- |
| `ui-click.wav` | Ordinary native buttons, tabs, opponent selection |
| `ui-confirm.wav` | Successful onboarding, create/join, ready, rematch, copy, preview |
| `ui-back.wav` | Navigation, closing dialogs, leaving a room |
| `ui-error.wav` | Invalid names/forms, rejected actions and errors |
| `ui-card.wav` | Dealing, drawing, transfers, inspecting a Phaser card |
| `ui-win.wav` | Your completed family and winning a round |

`frontend/src/audio/SoundManager.ts` owns one Web Audio context, one cached decoded
buffer per WAV, one master gain, and one active effect at a time. Effects have
gentle relative gain trims; the supplied samples are not altered. Default master
volume is 45%, with a 0–100% slider and independent mute. Preferences use the
kit's `cariasec:sfx-volume` and `cariasec:sfx-muted` localStorage keys. Muting stops
current playback immediately; unmuting retains the chosen volume. Restricted
storage does not prevent controls working in memory.

`SoundProvider` delegates native button clicks, including keyboard activation.
Use `data-sound="back"` or another effect name to override a button, and
`data-sound="none"` when an explicit handler or server event owns its feedback.
This prevents a generic click playing alongside an action-specific cue.

The Phaser `game-sound` event goes through `PhaserBoard` into the same manager.
Phaser's own audio context is disabled. `useGameSound` compares committed server
snapshots, assigns a cue key per room/version, and passes card cues to Phaser to
play when the board updates. A completed family takes priority over card movement
in that snapshot. Winners receive a results cue from React. Snapshot syncs,
refreshes, navigation back to the board, and historical logs do not replay cues.
Colyseus commands, networking, private hands and rules are unchanged.

Files are prefetched once. Audio context creation/resume happens only from trusted
pointer or keyboard interactions, following [Web Audio autoplay guidance](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices#autoplay_policy).
No audio is queued before unlocking, in hidden tabs, while muted, or at zero
volume. Repeated event keys and rapid duplicate cues are suppressed; pending
loads older than 250 ms are dropped. Missing audio or a blocked context never
blocks gameplay. Asset URLs honor Vite's configured base path.

The Settings gear in the existing navigation opens the normal modal styling and
focus trap. Sound labels follow the selected BM/EN language. The speaker toggle
has an accessible name/pressed state, and the slider supports keyboard controls.

Verification uses `npx.cmd tsc --noEmit`, `npm.cmd test`, and
`npm.cmd run test:e2e` through the existing Vite development workflow. Audio tests
observe real WAV decode, source starts and gain values rather than mocking the
sound manager. They cover gestures, default and adjusted gain, zero volume,
mute/unmute, refresh persistence, duplicate suppression, and multiplayer cues.
The full-round test also observes the winner's actual win playback. The WAV test
checks source-kit hashes, valid PCM, short duration, sample peaks and HTTP serving.
Desktop and touch-enabled mobile Chromium viewports are exercised. The installed
Windows WebKit port does not expose AudioContext, so its real-playback checks are
explicitly skipped; its asset check still runs. Physical speakers and Safari on
an actual iPhone require a listening/device check.

Verified locally on 11 October 2026: TypeScript check passed, all 28 existing
engine/socket/localization/data tests passed, and all 12 Chromium browser tests
passed in a single final run (1.9 minutes). No application build or deployment
was performed for this integration; the existing production bundle is unchanged.
# Tencent release — 11 October 2026

The sound system and Phaser board are now deployed at http://43.156.11.241/Cariasec/.
Production build/typecheck passed. SQLite was backed up with the online backup API and integrity checked before deployment; previous application releases remain available for rollback. Nginx configuration validation and protected-route pre/post checks passed.

Live verification: `npx.cmd tsx scripts/verify-live-sound.ts` and `node scripts/verify-live.mjs` passed. Evidence is in `tencent-sound-smoke.json` and `tencent-live-smoke.json`: six WAV files match originals, real Web Audio source playback, default 45%, volume adjustment, mute/unmute, refresh persistence, synchronized Phaser dealing/request sounds, no duplicated sources, two-player Colyseus gameplay/reconnect, and responsive layouts. Chromium desktop/mobile emulation only; physical speaker listening and real Safari/iPhone remain unverified.

Live checks also caught and fixed HTTP compatibility for action UUID generation (secure getRandomValues fallback, independently tested) and enabled only `blob:` images in CSP for Phaser's locally decoded textures. Multiplayer rules and networking were not changed.

