# Player setup and languages

Each new browser tab/app session starts with a name and Bahasa Malaysia/English choice. Names use the same 2–20 character validation as the game server. A valid name and selected language are stored in `localStorage` as `cariasec-profile`; completion is stored per tab in `sessionStorage` as `cariasec-onboarded`. Reloading a running game preserves setup and the existing room session. A new tab asks again with saved choices prefilled. Restricted storage falls back to in-memory state.

The header language selector updates menus, 36 careers, six RIASEC families, instructions, errors, activity and results without changing player identity, room state or card IDs. Players in the same room can choose different languages. The room form prefills the chosen name and lets a player resolve duplicate-name errors. Existing Home Screen icon and `/Cariasec/` routing are preserved.

`frontend/src/translations.ts` contains English display strings and educational content. `frontend/src/i18n.tsx` owns local preferences and formats existing server events for each player; player names are interpolated without translation. Source Malay PDF transcriptions remain in `shared/`.

Validation: `tests/language.test.ts` covers data coverage, interpolation, events and shared name validation. `tests/e2e/language.spec.ts` covers both mobile languages, setup validation, persistence, mixed-language multiplayer, errors, reconnect, language switching, learning and cancelled results. Existing full-round, accessibility and mobile tests complete the regression checks. `scripts/verify-live.mjs` verifies the deployed mixed-language flow.
