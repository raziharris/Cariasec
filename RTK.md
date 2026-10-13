<!-- rtk-owned: written by `rtk init --codex`, removed by `rtk init --codex --uninstall` -->

# Command output

RTK filters shell output; it can omit context. Prefer supported RTK commands
for routine development, but read full output whenever diagnosis or review
requires it. Keep command semantics and exit codes intact. Unsupported commands
continue using their original execution method.

Verified Windows forms are documented in `docs/RTK-INTEGRATION.md`:

- `rtk git status`, `rtk git diff`, `rtk git log -n 5`
- `rtk rg -n pattern frontend/src`
- `rtk tsc --noEmit`
- `rtk npm test` for the existing Node.js test suite (retains test counts and warnings)
- `rtk gain -p`, `rtk gain -p --daily`, `rtk gain -p --history`

The `.cmd` forms of npm/npx are not automatically rewritten by RTK 0.50.0.
Use explicit wrappers after checking their syntax and behavior. PowerShell
cmdlets and scripts remain native. Do not change npm scripts just to fit RTK.
Use `Get-ChildItem` for directories: `rtk ls` has no GNU ls in this PATH,
and `rtk tree` is incompatible with the native Windows tree command.
The project hook skips those commands, mutations, deployment commands and
compound shell scripts. It delegates simple routine commands to RTK's official
`rtk hook codex` processor. It requires Codex hook trust after restarting.

Use `rtk recall <hash> --full` when output supplies a recovery hash, or rerun
the original command using `rtk proxy <command> <arguments>` for full output.
For example: `rtk proxy git diff` or `rtk proxy npm.cmd test`.
If a filtered command fails, retrieve its full diagnostics before deciding on
a fix. Do not use the generic `rtk test` filter for this project's Node runner:
verification showed it falls back to only five lines of output.
For deployment, security operations and detailed multiplayer debugging, use
full original output. Keep `npm.cmd run dev` and live Colyseus logs unfiltered.

Compression statistics are estimates of command-output tokens, not total
Codex context, API costs or subscription usage. See the integration report
for the observed hook status and limitations; installation alone does not
prove automatic rewriting in the VS Code extension.
