# Character selection removal

The character picker and its five SVG character assets have been removed from onboarding, Settings, the lobby, results and the Phaser board. Player names and neutral initials identify players instead. Career card illustrations remain unchanged.

The frontend profile and create/join commands no longer send character metadata. Public views no longer expose it. Older localStorage profiles and older command payloads remain compatible: unknown character metadata is ignored, while names, language, sound preferences and reduced-motion settings remain intact. No database migration or gameplay-rule changes are needed.

The socket regression checks legacy metadata and authenticated player identity recovery. Browser and Tencent verification scripts check character controls are absent and neutral initials remain synchronized between two players. Sound, card animations, collection progress and motion settings are retained.

Production build/typecheck, all 29 unit/socket tests, all 13 Chromium browser regressions and the local production multiplayer smoke test passed. Browser coverage includes character controls being absent, neutral initials, complete rounds, reconnect/rematch, mobile layouts and real audio playback. Physical iPhone/Safari and speakers are not tested.

## Tencent release

Application source commit `75ebe680c01007d8312eb102d214f7635d3af790` was pushed to `origin/main` and deployed to `http://43.156.11.241/Cariasec/`. The online SQLite backup `/var/lib/cariasec/cariasec-pre-no-characters-1791900856856.sqlite` passed integrity validation. At preflight one playing room had two connected players; the guarded release restarted the app with its persistent database unchanged. No unrelated hosted route was changed; public protected-route checks and Nginx validation passed before/after deployment. Internal survivor response codes were unchanged.

Both live verification scripts passed: `node scripts/verify-live.mjs` and `npx.cmd tsx scripts/verify-live-sound.ts`. Reports in `tencent-live-smoke.json` and `tencent-sound-smoke.json` confirm character controls are absent, neutral player identity, two-client multiplayer requests and refresh recovery, sound/mute/volume persistence, and no page errors or failed requests. Mobile widths 320/375/390/430px passed overflow checks. The live 375px game screenshot was visually inspected. These are test-client checks, not verification of any pre-existing user's session.

Local and deployed SHA-256 values match:

- Server: `a418f888c62bb0a85457ea347646d117dbce124605f6ce987f02289d88d36f1d`
- Main bundle `index-Cjd1QJux.js`: `e7f93f2854dfd8ca28300ef90aa4fc5958d272a1c71987da202d6ec551f56b4d`
- Phaser bundle `PhaserBoard-CkJ5tC2V.js`: `c3210a6f1c0ab88b6f82a96563bf300baf187a2f45cb5c1aded14499eaac33df`

The follow-up verification commit changes reports/documentation only. The earlier `UI-UPGRADE.md` documents the original release before this removal.
