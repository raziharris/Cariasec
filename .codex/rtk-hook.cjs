// Project guard for the official RTK Codex processor. No application runtime use.
const { spawnSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const { join } = require('node:path');

let input = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => { input += chunk; });
process.stdin.on('end', () => {
  try {
    const event = JSON.parse(input);
    const command = event.tool_input?.command;
    if (event.hook_event_name !== 'PreToolUse' || event.tool_name !== 'Bash' || typeof command !== 'string') return;
    // Avoid compound scripts, shell substitutions and redirections. Native PS
    // aliases (ls/tree), .cmd invocations, deployment and mutations pass through.
    if (/[;&|<>`$\r\n]/.test(command)) return;
    if (!/^(?:git (?:status|diff|log)\b|rg\b|(?:npx )?tsc\b|npm (?:test\b|run (?:build|test|test:e2e)\b))/.test(command.trim())) return;
    const installed = process.platform === 'win32' && process.env.LOCALAPPDATA
      ? join(process.env.LOCALAPPDATA, 'Microsoft', 'WinGet', 'Packages', 'rtk-ai.rtk_Microsoft.Winget.Source_8wekyb3d8bbwe', 'rtk.exe')
      : undefined;
    const binary = installed && existsSync(installed) ? installed : 'rtk';
    const result = spawnSync(binary, ['hook', 'codex'], { input, encoding: 'utf8', timeout: 4000, windowsHide: true });
    if (result.status !== 0 || !result.stdout.trim()) return;
    const response = JSON.parse(result.stdout);
    if (typeof response.hookSpecificOutput?.updatedInput?.command === 'string') {
      process.stdout.write(JSON.stringify(response));
    }
  } catch { /* Fail open: Codex executes the original command. */ }
});
