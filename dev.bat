@echo off
echo ========================================
echo   Building and Previewing Blog...
echo ========================================
echo.

echo [1/2] Building site...
python build.py build
if %errorlevel% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)
echo Build completed successfully!
echo.

echo [2/2] Starting preview server...
python build.py preview

pause
