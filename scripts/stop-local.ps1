$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$recordPath = Join-Path $projectRoot '.local-server.json'
if (-not (Test-Path -LiteralPath $recordPath)) { Write-Output 'No Node static service record.'; exit 0 }
$record = Get-Content -LiteralPath $recordPath -Raw | ConvertFrom-Json
$expectedScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'static-server.mjs'))
$serviceProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($record.pid)" -ErrorAction SilentlyContinue
if ($serviceProcess -and $serviceProcess.CommandLine -and $serviceProcess.CommandLine.Contains($expectedScript) -and $record.script -eq $expectedScript) {
    Stop-Process -Id $record.pid
    Write-Output 'Emojis Plus Node static service stopped.'
} else { Write-Output 'Static service no longer running; no other process stopped.' }
Remove-Item -LiteralPath $recordPath
