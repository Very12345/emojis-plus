$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$dataDirectory = if ($env:EMOJIS_DATA_DIR) { [IO.Path]::GetFullPath($env:EMOJIS_DATA_DIR) } else { Join-Path $projectRoot 'data' }
$pidFile = Join-Path $dataDirectory 'server.json'
if (-not (Test-Path -LiteralPath $pidFile)) { Write-Output 'No background service record found for Emojis Plus.'; exit 0 }
$serviceInfo = Get-Content -LiteralPath $pidFile -Raw | ConvertFrom-Json
$serviceProcess = Get-CimInstance Win32_Process -Filter "ProcessId=$($serviceInfo.pid)" -ErrorAction SilentlyContinue
$expectedScript = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'serve.py'))
if ($serviceProcess -and $serviceProcess.CommandLine -and $serviceProcess.CommandLine.Contains($expectedScript)) {
    $renderWorkers = Get-CimInstance Win32_Process -Filter "ParentProcessId=$($serviceInfo.pid)" | Where-Object {
        $_.CommandLine -and $_.CommandLine.Contains('multiprocessing.spawn') -and $_.CreationDate -ge $serviceProcess.CreationDate
    }
    Stop-Process -Id $serviceInfo.pid
    foreach ($worker in $renderWorkers) {
        $currentWorker = Get-CimInstance Win32_Process -Filter "ProcessId=$($worker.ProcessId)" -ErrorAction SilentlyContinue
        if ($currentWorker -and $currentWorker.CreationDate -eq $worker.CreationDate -and $currentWorker.ParentProcessId -eq $serviceInfo.pid) {
            Stop-Process -Id $worker.ProcessId -ErrorAction SilentlyContinue
        }
    }
    Remove-Item -LiteralPath $pidFile
    Write-Output 'Emojis Plus stopped.'
} else {
    Write-Output 'Service already ended or process identity did not match. No other process was stopped.'
}
