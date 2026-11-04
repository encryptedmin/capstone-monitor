@echo off
setlocal
cd /d "%~dp0"

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\start-system.ps1"
if errorlevel 1 (
    echo.
    echo Startup did not complete. Review the message above, fix the issue, and run this file again.
    pause
    exit /b 1
)

echo.
echo Backend and frontend were launched in separate windows.
pause
exit /b 0
