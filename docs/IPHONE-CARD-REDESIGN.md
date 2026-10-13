# iPhone-first card readability

The former phone hand used 76px overlapping cards with ~56px artwork and 9px labels. It now presents two complete, upright cards per page, 116–144px wide and at least 202px tall, with ~121–134px artwork and 12–14px job labels. All hand cards remain reachable; large hands are no longer silently restricted to the selected family. Horizontal gestures and 44px previous/next controls browse the hand. A tap opens the existing larger card preview; a swipe does not open it. Card movements, sounds, reduced motion and the accessible React hand mirror remain intact.

The Phaser canvas uses a device-density backing buffer capped at 2x, a CSS-pixel camera and matching high-resolution text textures. A ResizeObserver tracks real container sizes and disconnects at game teardown. Guards avoid negative drawing dimensions while route/viewport transitions temporarily collapse the container. Phone request-card choices also use two larger columns. Preview artwork uses contain sizing, and its modal now sits above the fixed request dock. Existing occupation images and all multiplayer rules remain unchanged.

Browser coverage targets 320/375/390/430px at simulated DPR 3, full hand navigation, touch swipes (Chromium), preview tap/close and portrait-to-landscape resizing. WebKit coverage uses mouse-drag browsing and touchscreen taps in mobile emulation; this is not physical iPhone Safari testing.

Known SDK diagnostic: WebKit reports `Wrong protocol for WebSocket '[object Object]'` when Colyseus 0.18.5 probes the Node WebSocket constructor signature. An isolated `try/catch` reproduced this pageerror even though the exception is caught. The SDK subsequently connects through its normal browser fallback. Tests retain this exact diagnostic separately in attachments while still failing on any other page errors. No transport/gameplay code or dependency was modified to suppress it.

Build/typecheck and all 29 unit/socket tests passed. All 18 existing browser regressions passed on the redesign, including complete rounds, reconnect/rematch, clipboard, accessibility and responsive layout. After gesture hardening, the final focused Chromium run passed all nine tests (four phone-size readability tests plus accessibility, sound and tap-flow). The 430px readability scenario also passed three consecutive repeats. This is not a claim that the earlier full 22-test run passed; its swipe failures were investigated and fixed before the final focused run.

Final local WebKit checks passed all four sizes. On Tencent, all four Chromium and all four WebKit readability checks passed again, including navigation through the complete hand, preview, resize and absence of horizontal page overflow. The isolated caught SDK probe diagnostic remains recorded as described above; other page errors fail the tests.

## Tencent release

Application source commit `9581ee52bb5a2f2fc210fd73fbb4b382b3bd71ef` was pushed to GitHub and published to `http://43.156.11.241/Cariasec/`. New versioned assets were copied before atomic HTML replacement; older assets remain available for already-open clients. Server hash and PM2 PID `3457889` remained unchanged. Nginx was not edited; all configured public protected routes passed before/after publication.

The online SQLite backup `/var/lib/cariasec/cariasec-pre-iphone-cards-1791902576716.sqlite` passed integrity validation. The preflight found no connected players. Prior frontend files are backed up at `/var/backups/Cariasec-iphone-ui-20261013225147`.

Both live gameplay and sound scripts passed after publication (`tencent-live-smoke.json`, `tencent-sound-smoke.json`), checking Colyseus requests, private-hand refresh recovery, sound synchronization, mute/volume persistence and retained character-free UI. The live 375px board and 390px WebKit preview screenshots were visually inspected. This remains browser emulation, not physical iPhone/Safari or physical speaker verification.

Local/deployed SHA-256 values match:

- HTML: `b3095c189b48dc779ab8f4fb7e2f789f2fda741ab8af9b2f1c35b1041fa52302`
- `index-Dt9OzLVP.js`: `4434bc1f65a365801466736ce8b946f3a4bc0bccfc5283cf7b1fd927be73dd53`
- `PhaserBoard-CkjPozhI.js`: `e86ce1fe5d45cae363cb7f2ea44a04cf8c5c88cdcd92e0a70f1f10f3e0545ac5`

The follow-up commit contains verification reports/documentation only.
