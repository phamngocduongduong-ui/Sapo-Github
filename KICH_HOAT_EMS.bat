@echo off
title Sapo EMS Starter
cd /d "d:\Sapo-Antigravity"

:: 1. Don dep ban cu
echo Dang lam sach he thong...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM mysqld.exe /T 2>nul

:: 2. Chay MySQL o che do thu nho
echo Dang bat Database...
start /min "" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="d:\Sapo-Antigravity\mysql_data" --port=3306

:: 3. Chay Web Server o che do thu nho
echo Dang bat Web Server...
start /min cmd /c "npm run dev"

echo ------------------------------------------
echo [THANH CONG] He thong dang khoi dong duoi Taskbar.
echo Vui long doi 15 giay roi vao localhost:3000
timeout /t 3
exit
