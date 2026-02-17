param()

$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$tempOut = "C:\temp\stats-app-electron-dist"
$distOut = Join-Path $projectRoot "dist"

if (Test-Path $tempOut) {
  Remove-Item -Recurse -Force $tempOut
}

New-Item -ItemType Directory -Path $tempOut -Force | Out-Null

Push-Location $projectRoot
try {
  & npx vite build --config vite.electron.config.js --outDir $tempOut --emptyOutDir
  if ($LASTEXITCODE -ne 0) {
    throw "vite build failed with exit code $LASTEXITCODE"
  }

  if (Test-Path $distOut) {
    Remove-Item -Recurse -Force $distOut
  }

  Copy-Item -Recurse -Force $tempOut $distOut
  Write-Output "Electron dist refreshed at: $distOut"
}
finally {
  Pop-Location
}
