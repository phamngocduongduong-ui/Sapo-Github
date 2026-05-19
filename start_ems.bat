@echo off
setlocal enabledelayedexpansion
title Sapo EMS - System Starter
cd /d "d:\Sapo-Antigravity"

echo ==========================================
echo    SAPO EMS - KHOI DONG HE THONG
echo ==========================================

:: 1. Kiem tra va khoi dong MySQL
echo [1/3] Dang kiem tra MySQL (Port 3306)...
netstat -ano | findstr :3306 > nul
if %errorlevel% neq 0 (
    echo [INFO] Dang khoi dong MySQL Server tu: mysql_data...
    start /min "MySQL Server" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="d:\Sapo-Antigravity\mysql_data" --port=3306
    timeout /t 5
) else (
    echo [OK] MySQL dang chay.
)

:: 2. Lay dia chi IP LAN
echo [2/3] Dang lay dia chi IP mang LAN...
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "127.0.0.1"') do (
    set IP=%%a
)
echo [OK] IP cua ban la: %IP%
echo [INFO] Cac may trong LAN truy cap tai: http://%IP%:3000

:: 3. Chay Next.js Dev Server
echo [3/3] Dang khoi dong Web Server...
echo ------------------------------------------
npm.cmd run dev > startup_log.txt 2>&1
