# Room code clipboard fix

The former handler called `navigator.clipboard.writeText` only. The Tencent HTTP origin reports `isSecureContext: false` and `navigator.clipboard` undefined, so the operation could not copy. The modern API requires a secure context: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText.

The shared copy helper prefers the modern API on secure origins, then falls back to a selected, temporary read-only textarea and `execCommand('copy')` when the API is absent or rejects. This deprecated compatibility path is necessary for the existing HTTP origin; browsers that block both paths receive a focused, selected manual-copy field instead of a false success message. Focus is restored and temporary fields are removed. Both copy buttons share the helper. Duplicate pending actions are ignored, success timers are cleaned up and feedback resets between rooms.

Build/typecheck, 29 unit/socket tests and 10 browser checks passed: five new clipboard tests plus accessibility, sound and tap-game regressions. Clipboard tests verify the exact code by pasting it from the real browser clipboard at desktop/375px touch emulation, test the secure API, permission rejection and blocked/manual behavior. Physical Safari/iPhone testing is not claimed.

Release is frontend-only because the generated backend hash is unchanged and four players were connected at preflight. No gameplay code, PM2 process, Nginx configuration or database needs modification. Existing hashed assets are retained for already-open tabs; the HTML entry point is replaced only after new assets are published. The online database backup `/var/lib/cariasec/cariasec-pre-clipboard-1791901422573.sqlite` passed integrity validation.

## Live release verification

Source commit `190308d` was pushed to GitHub and published to Tencent without a PM2 restart. The process PID stayed `3457889` before/after publication; application health remained OK. Prior UI files are backed up at `/var/backups/Cariasec-clipboard-ui-20261013222619`. New hashed assets were published first, old hashed assets retained, then `index.html` atomically replaced. Nginx was not edited. All configured public protected routes returned 200 before/after release.

`LIVE_URL=http://43.156.11.241/Cariasec/` clipboard tests passed four live checks (desktop/mobile real paste, rejection compatibility and selected manual fallback); the secure-API test was deliberately skipped on this HTTP origin and passed locally. The normal two-client live smoke test also passed gameplay, refresh recovery and 320/375/390/430px layout checks without page errors, failed requests or HTTP errors. No actual Safari/iPhone verification is claimed.

Local/deployed SHA-256 match: HTML `f23a6dd94a24184669df3cf48e5ed847bfa265f56f9c2d74064faa9758bd2e6c`, main bundle `index-DRLcWtmj.js` `ca225e6523f2665432cab00269b7dde0d8f267d093d6b3ff1570fed58a430ba4`. The backend remained byte-identical to the prior release (`a418f888c62bb0a85457ea347646d117dbce124605f6ce987f02289d88d36f1d`). The follow-up commit contains release verification only.
