@echo off
title LexiPilot - Secure Setup
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\Configure-Secrets.ps1"
if errorlevel 1 (
  echo.
  echo Setup failed. This window will stay open so the error can be read.
  pause
)
