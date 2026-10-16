@echo off
chcp 65001 >nul
cd /d "%~dp0"
powershell -NoProfile -File scripts\stop-local.ps1
powershell -NoProfile -File scripts\stop.ps1
if errorlevel 1 (
  pause
  exit /b 1
)
