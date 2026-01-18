@echo off
echo ========================================
echo   Building Site (Clean Build)
echo ========================================
echo.

echo [1/2] Cleaning _site directory...
python build.py clean
echo.

echo [2/2] Building site...
python build.py build

if %errorlevel% neq 0 (
    echo.
    echo Build failed!
    pause
    exit /b 1
)

echo.
echo Build completed! Browser will auto-refresh.
echo ========================================
