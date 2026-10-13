$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$projectPath = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$sourcePath = Join-Path $projectPath 'docs\branding\cariasec-icon-source.png'
$outputPath = Join-Path $projectPath 'public\icons'
New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
$sourceImage = [System.Drawing.Image]::FromFile($sourcePath)
try {
  if ($sourceImage.Width -ne $sourceImage.Height) { throw 'App icon source must be square.' }
  foreach ($size in @(32, 180, 192, 512, 1024)) {
    $bitmap = New-Object System.Drawing.Bitmap($size, $size, ([System.Drawing.Imaging.PixelFormat]::Format24bppRgb))
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    try {
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.DrawImage($sourceImage, 0, 0, $size, $size)
      $destination = Join-Path $outputPath "cariasec-careers-$size.png"
      $bitmap.Save($destination, [System.Drawing.Imaging.ImageFormat]::Png)
      Write-Output "$size x $size -> $destination"
    } finally {
      $graphics.Dispose()
      $bitmap.Dispose()
    }
  }
} finally {
  $sourceImage.Dispose()
}
