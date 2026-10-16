@echo off
chcp 65001 >nul
cd /d "%~dp0"
node scripts\local-launcher.mjs %*
if errorlevel 1 (
  pause
  exit /b 1
)
