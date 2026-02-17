param(
  [string]$AppName = "StatsApp",
  [string]$ExePath
)

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$packagerExePath = Join-Path $projectRoot "release\StatsApp-win32-x64\StatsApp.exe"
$builderExePath = Join-Path $projectRoot "release\win-unpacked\StatsApp.exe"

$resolvedExePathInput = if ($ExePath) {
  $ExePath
} elseif (Test-Path $packagerExePath) {
  $packagerExePath
} else {
  $builderExePath
}

if (-not (Test-Path $resolvedExePathInput)) {
  Write-Error "Executable not found: $resolvedExePathInput"
  exit 1
}

$resolvedExePath = (Resolve-Path $resolvedExePathInput).Path
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "$AppName.lnk"
$powerShellPath = Join-Path $env:WINDIR "System32\WindowsPowerShell\v1.0\powershell.exe"
$workingDir = Split-Path $resolvedExePath
$escapedExePath = $resolvedExePath.Replace("'", "''")
$escapedWorkingDir = $workingDir.Replace("'", "''")
$psCommand = "Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue; Start-Process -FilePath '$escapedExePath' -WorkingDirectory '$escapedWorkingDir'"

$wScriptShell = New-Object -ComObject WScript.Shell
$shortcut = $wScriptShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $powerShellPath
$shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command `"$psCommand`""
$shortcut.WorkingDirectory = $workingDir
$shortcut.IconLocation = "$resolvedExePath,0"
$shortcut.Save()

Write-Output "Desktop shortcut created: $shortcutPath"
