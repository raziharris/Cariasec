# Room code clipboard fix

The former handler called `navigator.clipboard.writeText` only. The Tencent HTTP origin reports `isSecureContext: false` and `navigator.clipboard` undefined, so the operation could not copy. The modern API requires a secure context: https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText.

The shared copy helper prefers the modern API on secure origins, then falls back to a selected, temporary read-only textarea and `execCommand('copy')` when the API is absent or rejects. This deprecated compatibility path is necessary for the existing HTTP origin; browsers that block both paths receive a focused, selected manual-copy field instead of a false success message. Focus is restored and temporary fields are removed. Both copy buttons share the helper. Duplicate pending actions are ignored, success timers are cleaned up and feedback resets between rooms.

Build/typecheck, 29 unit/socket tests and 10 browser checks passed: five new clipboard tests plus accessibility, sound and tap-game regressions. Clipboard tests verify the exact code by pasting it from the real browser clipboard at desktop/375px touch emulation, test the secure API, permission rejection and blocked/manual behavior. Physical Safari/iPhone testing is not claimed.

Release is frontend-only because the generated backend hash is unchanged and four players were connected at preflight. No gameplay code, PM2 process, Nginx configuration or database needs modification. Existing hashed assets are retained for already-open tabs; the HTML entry point is replaced only after new assets are published. The online database backup `/var/lib/cariasec/cariasec-pre-clipboard-1791901422573.sqlite` passed integrity validation.

Live release verification will be recorded after publication.
