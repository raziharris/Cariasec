param([string]$HostName = '43.156.11.241', [string]$UserName = 'ubuntu')
$ErrorActionPreference = 'Stop'
$projectPath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$keyPath = (Resolve-Path (Join-Path $projectPath 'tencent-key/RaziKey.pem')).Path
$deployScript = Join-Path $projectPath 'tencent-key/scripts/deploy-cariasec.ps1'
function Invoke-Remote([string]$Script) {
  $encoded = [Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($Script.Replace("`r", '')))
  & ssh.exe -o BatchMode=yes -o ConnectTimeout=10 -i $keyPath "${UserName}@${HostName}" "echo $encoded | base64 -d | bash"
  if ($LASTEXITCODE -ne 0) { throw 'Remote release gate failed.' }
}
$unlock = @'
set -euo pipefail
sudo python3 - <<'PY'
from pathlib import Path
for name in ['icecream', 'cariasec-domain']:
 p=Path('/etc/nginx/sites-available')/name
 text=p.read_text()
 begin='    # BEGIN RENTAK DRAIN\n'; end='    # END RENTAK DRAIN\n'
 if begin in text:
  start=text.index(begin); finish=text.index(end,start)+len(end)
  p.write_text(text[:start]+text[finish:])
PY
sudo nginx -t
sudo systemctl reload nginx
'@
try {
  Invoke-Remote @'
set -euo pipefail
sudo python3 - <<'PY'
from pathlib import Path
import shutil, time
block='''    # BEGIN RENTAK DRAIN
    location = /Cariasec/matchmake/create/cariasec { return 503; }
    location = /Cariasec/matchmake/joinOrCreate/cariasec { return 503; }
    # END RENTAK DRAIN
'''
for name in ['icecream', 'cariasec-domain']:
 p=Path('/etc/nginx/sites-available')/name
 text=p.read_text()
 if '# BEGIN RENTAK DRAIN' in text: continue
 marker='    location /Cariasec/ {'
 if marker not in text: raise SystemExit('Expected Cariasec location missing: '+name)
 shutil.copy2(p, '/var/backups/'+name+'-rentak-'+str(int(time.time())))
 p.write_text(text.replace(marker,block+marker,1))
PY
sudo nginx -t
sudo systemctl reload nginx
sudo /home/ubuntu/.nvm/versions/node/v24.18.0/bin/node --input-type=module <<'JS'
import {DatabaseSync, backup} from 'node:sqlite';
process.umask(0o077);
const db=new DatabaseSync('/var/lib/cariasec/cariasec.sqlite',{readOnly:true});
const active=db.prepare('SELECT snapshot FROM rooms').all().map(r=>JSON.parse(r.snapshot)).filter(r=>r.phase==='playing');
if(active.length){console.error('CUTOVER_BLOCKED: '+active.length+' playing rooms; preserve them and retry after they finish.');process.exit(2);}
const path='/var/backups/cariasec-pre-rentak-'+Date.now()+'.sqlite';
await backup(db,path); db.close();
const check=new DatabaseSync(path,{readOnly:true});
if(check.prepare('PRAGMA integrity_check').get().integrity_check!=='ok')throw Error('Backup integrity failed');
check.close();console.log('BACKUP_OK '+path);
JS
'@
  # The established release script handles app rollback and protected route checks.
  # Resolve/check its staging target before its recursive cleanup runs.
  $stage = [IO.Path]::GetFullPath((Join-Path $env:TEMP 'cariasec-deploy-stage'))
  $tempRoot = [IO.Path]::GetFullPath($env:TEMP).TrimEnd('\') + '\'
  if (-not $stage.StartsWith($tempRoot, [StringComparison]::OrdinalIgnoreCase) -or (Split-Path $stage -Leaf) -ne 'cariasec-deploy-stage') { throw 'Unexpected deployment staging directory.' }
  & $deployScript -HostName $HostName -User $UserName -PublicOrigin 'https://cariasec.site'
  if ($LASTEXITCODE -ne 0) { throw 'Deployment failed.' }
} finally {
  Invoke-Remote $unlock
}
