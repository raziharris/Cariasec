param(
  [string]$NginxExe = 'tmp/release-tools/nginx-1.30.5/nginx.exe',
  [string]$OpenSslExe = 'C:/Program Files/Git/usr/bin/openssl.exe'
)
$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectRoot
$nginxBinary = (Resolve-Path -LiteralPath $NginxExe).Path
$opensslBinary = (Resolve-Path -LiteralPath $OpenSslExe).Path
foreach ($testPort in @(8089,8443,8081,3002)) {
  if (Get-NetTCPConnection -LocalPort $testPort -State Listen -ErrorAction SilentlyContinue) { throw "Test port $testPort is already in use" }
}
$scratch = Join-Path $projectRoot 'tmp/proxy-check'
New-Item -ItemType Directory -Force -Path $scratch,(Join-Path $scratch 'logs'),(Join-Path $scratch 'temp') | Out-Null
$scratchPosix = $scratch.Replace('\','/')
$nginxRoot = (Split-Path $nginxBinary).Replace('\','/')
$publicRoot = (Join-Path $projectRoot 'dist/public').Replace('\','/')
$certPath = Join-Path $scratch 'local-cert.pem'
$keyPath = Join-Path $scratch 'local-key.pem'
$certProcess=Start-Process -FilePath $opensslBinary -ArgumentList @('req','-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',"`"$keyPath`"",'-out',"`"$certPath`"",'-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1') -WindowStyle Hidden -Wait -PassThru -RedirectStandardError (Join-Path $scratch 'certificate.log')
if ($certProcess.ExitCode -ne 0) { throw 'Local test certificate generation failed' }
# Only paths, test ports, DNS address and the local backend differ from templates.
$containerConf = Get-Content deployment/nginx/container.conf -Raw
$containerConf = $containerConf.Replace('listen 8080;','listen 127.0.0.1:8089;').Replace('root /usr/share/nginx/html;',"root `"$publicRoot`";").Replace('http://backend:3001','http://127.0.0.1:3002')
$httpConf = Get-Content deployment/nginx/host-http.conf -Raw
$httpConf = $httpConf.Replace('listen 80;','listen 127.0.0.1:8081;').Replace('listen [::]:80;','').Replace('game.example.com','127.0.0.1').Replace('https://$host$request_uri','https://$host:8443$request_uri').Replace('/var/www/certbot',"`"$scratchPosix`"")
$httpsConf = Get-Content deployment/nginx/host-https.conf -Raw
$httpsConf = $httpsConf.Replace('listen 443 ssl;','listen 127.0.0.1:8443 ssl;').Replace('listen [::]:443 ssl;','').Replace('/etc/letsencrypt/live/game.example.com/fullchain.pem',"`"$scratchPosix/local-cert.pem`"").Replace('/etc/letsencrypt/live/game.example.com/privkey.pem',"`"$scratchPosix/local-key.pem`"").Replace('game.example.com','127.0.0.1').Replace('http://127.0.0.1:8088','http://127.0.0.1:8089')
$config = @"
worker_processes 1;
daemon off;
error_log logs/error.log;
pid logs/nginx.pid;
events { worker_connections 256; }
http {
  include "$nginxRoot/conf/mime.types";
  default_type application/octet-stream;
  $containerConf
  $httpConf
  $httpsConf
}
"@
[IO.File]::WriteAllText((Join-Path $scratch 'nginx.conf'),$config,[Text.UTF8Encoding]::new($false))
$configProcess=Start-Process -FilePath $nginxBinary -ArgumentList @('-p',"`"$scratchPosix/`"",'-c','nginx.conf','-t') -WindowStyle Hidden -Wait -PassThru -RedirectStandardError (Join-Path $scratch 'config-check.log')
Get-Content (Join-Path $scratch 'config-check.log')
if ($configProcess.ExitCode -ne 0) { throw 'Nginx configuration check failed' }
$nginxProcess = Start-Process -FilePath $nginxBinary -ArgumentList @('-p',"$scratchPosix/",'-c','nginx.conf') -WorkingDirectory $scratch -WindowStyle Hidden -PassThru
$previousProxyOrigin=$env:PROXY_TEST_ORIGIN
try {
  $available=$false
  for($attempt=0;$attempt -lt 40;$attempt++) {
    try { $health=Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:8089/healthz';if($health.StatusCode -eq 200){$available=$true;break} } catch {}
    Start-Sleep -Milliseconds 100
  }
  if(-not $available){throw 'Nginx did not start'}
  $env:PROXY_TEST_ORIGIN='https://127.0.0.1:8443'
  node scripts/verify-production.mjs
  if($LASTEXITCODE -ne 0){throw 'Proxied two-browser test failed'}
} finally {
  $env:PROXY_TEST_ORIGIN=$previousProxyOrigin
  Start-Process -FilePath $nginxBinary -ArgumentList @('-p',"`"$scratchPosix/`"",'-c','nginx.conf','-s','quit') -WindowStyle Hidden -Wait -RedirectStandardError (Join-Path $scratch 'shutdown.log')
  if(-not $nginxProcess.WaitForExit(10000)){Stop-Process -Id $nginxProcess.Id -Force}
}
