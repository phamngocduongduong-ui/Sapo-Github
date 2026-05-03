@echo off
cd /d "d:\Sapo-Antigravity"

echo Checking for MySQL on port 3306...
netstat -ano | findstr :3306 > nul
if %errorlevel% neq 0 (
    echo [INFO] Starting Local MySQL Server...
    start /min "" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="d:\Sapo-Antigravity\mysql_data" --port=3306
    timeout /t 5
)

echo Starting Sapo EMS Development Server...
npm.cmd run dev
pause
