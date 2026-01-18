@echo off
echo ========================================
echo   Starting Preview Server (Live Reload)
echo ========================================
echo.
echo   Server will keep running and auto-refresh.
echo   Open another terminal and run 'build.bat' to compile changes.
echo.
echo   Press Ctrl+C to stop the server.
echo ========================================
echo.

python build.py preview

pause
