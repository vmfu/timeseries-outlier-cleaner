@echo off
echo ============================================
echo Outlier Cleaner Web Application
echo ============================================
echo.

:: Try Python first
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Python HTTP server...
    echo Server will be available at: http://localhost:8000
    echo.
    start "" http://localhost:8000
    timeout /t 1 /nobreak >nul
    python -m http.server 8000
    goto :eof
)

:: Try Node.js with serve
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Node.js with serve...
    echo Server will be available at: http://localhost:3000
    echo.
    start "" http://localhost:3000
    timeout /t 1 /nobreak >nul
    npx serve -p 3000
    goto :eof
)

:: Try Node.js with http-server
where node >nul 2>&1
if %errorlevel% equ 0 (
    echo Using Node.js with http-server...
    echo Server will be available at: http://localhost:8080
    echo.
    start "" http://localhost:8080
    timeout /t 1 /nobreak >nul
    npx -y http-server -p 8080
    goto :eof
)

echo ============================================
echo ERROR: No web server found!
echo ============================================
echo.
echo Please install one of the following:
echo   - Python 3 (recommended)
echo   - Node.js with npx
echo.
echo Alternative: Use VS Code Live Server extension
echo.
pause
