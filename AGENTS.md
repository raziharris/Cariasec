@RTK.md

# CARIASEC development

If `RTK.md` exists, read it for this project's command-output workflow and use RTK explicitly when automatic rewriting is unavailable or has not been verified. If it has been removed, use original commands. This is a native Windows PowerShell project; use `npm.cmd` and `npx.cmd` for raw npm commands.

The application uses React, TypeScript, Vite, Phaser, Node.js, Colyseus and SQLite. React owns pages/lobby/settings; Phaser renders the game board; the server owns multiplayer game rules. Apply requested changes to the existing application.

Never prioritize compressed output over accurate debugging. Use original commands or `rtk proxy` for security-sensitive work, production deployment, complete diffs and detailed root-cause investigation. Do not wrap long-running dev servers or multiplayer logs in failure-only filters.

The user's standing CARIASEC release workflow is: after implementing requested application changes and passing relevant checks, commit and push the completed changes to `origin/main`, deploy to the existing Tencent `/Cariasec/` target, then verify the live UI and multiplayer. Follow explicit local-only, no-push or no-deploy instructions when a task supplies them. This does not authorize implementation or deployment for questions, ideas or read-only reviews. Preserve unrelated work and protect other hosted routes during release. Keep Tencent keys, environment secrets, database files and the original PDF out of Git.
