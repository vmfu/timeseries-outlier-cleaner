@echo off
echo ============================================
echo Outlier Cleaner Web Application
echo ============================================
echo.
echo Starting local web server...
echo.
start "" http://localhost:8000
timeout /t 1 /nobreak >nul
echo Server running at: http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8000
