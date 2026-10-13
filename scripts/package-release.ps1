param([string]$ReleaseName='cariasec-source')
$ErrorActionPreference='Stop'
if($ReleaseName -notmatch '^[a-zA-Z0-9_-]+$'){throw 'Invalid release name'}
$projectRoot=(Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Set-Location -LiteralPath $projectRoot
$outputFolder=Join-Path $projectRoot 'output'
New-Item -ItemType Directory -Force -Path $outputFolder | Out-Null
$zipPath=Join-Path $outputFolder "$ReleaseName.zip"
if(Test-Path -LiteralPath $zipPath){throw 'Release already exists. Choose a new ReleaseName.'}
$allowList=@('frontend','backend','shared','public','deployment','scripts','tests','docs','package.json','package-lock.json','tsconfig.json','vite.config.ts','playwright.config.ts','index.html','docker-compose.yml','.env.example','.gitignore','.dockerignore','README.md')
Add-Type -AssemblyName System.IO.Compression,System.IO.Compression.FileSystem
$zipStream=[IO.File]::Open($zipPath,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None)
$archive=[IO.Compression.ZipArchive]::new($zipStream,[IO.Compression.ZipArchiveMode]::Create,$false)
try {
  foreach($item in $allowList) {
    $sourceItem=Get-Item -LiteralPath (Join-Path $projectRoot $item) -Force
    $sourceFiles=if($sourceItem.PSIsContainer){Get-ChildItem -LiteralPath $sourceItem.FullName -Recurse -File -Force}else{@($sourceItem)}
    foreach($sourceFile in $sourceFiles) {
      $entryName=$sourceFile.FullName.Substring($projectRoot.Length+1).Replace('\','/')
      $entry=$archive.CreateEntry($entryName,[IO.Compression.CompressionLevel]::Optimal)
      $inputStream=[IO.File]::Open($sourceFile.FullName,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::ReadWrite)
      $entryStream=$entry.Open()
      try{$inputStream.CopyTo($entryStream)}finally{$entryStream.Dispose();$inputStream.Dispose()}
    }
  }
} finally {$archive.Dispose();$zipStream.Dispose()}
$zip=[IO.Compression.ZipFile]::OpenRead($zipPath)
try {
  $entries=@($zip.Entries | ForEach-Object {$_.FullName.Replace('\','/')})
  foreach($required in @('package-lock.json','shared/cards.json','frontend/src/main.tsx','backend/src/server.ts','deployment/docker/Dockerfile','.env.example','.dockerignore','docs/DEPLOYMENT.md')){if($entries -notcontains $required){throw "Missing required release file: $required"}}
  if(($entries | Where-Object {$_ -match '^public/cards/.+\.webp$'}).Count -ne 36){throw 'Expected 36 card assets'}
  if($entries | Where-Object {$_ -match '(^|/)(node_modules|data|tmp|dist)/|\.sqlite|\.pem$|\.pdf$|(^|/)\.env$'}){throw 'Private or development files found in release'}
  $hash=(Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLower()
  $manifest=[ordered]@{file=(Split-Path $zipPath -Leaf);sha256=$hash;files=$entries.Count;cardAssets=36;bytes=(Get-Item $zipPath).Length;excludes=@('credentials','.env','SQLite sessions','source PDF','node_modules','temporary certificates','downloaded tools');runtime='Node 24 LTS; run npm ci and npm run build; or follow Docker guide'}
  $manifest | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $outputFolder "$ReleaseName.manifest.json") -Encoding utf8
  $manifest | ConvertTo-Json
} finally {$zip.Dispose()}
