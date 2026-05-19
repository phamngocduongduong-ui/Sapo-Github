@echo off
title SAPO EMS - QUAN LY DOANH NGHIEP
mode con: cols=80 lines=20
color 0b

echo ==========================================
echo       SAPO EMS - HE THONG DANG CHAY
echo ==========================================
echo.
echo [1/3] Dang don dep he thong...
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM mysqld.exe /T 2>nul

echo [2/3] Dang khoi dong Database (MySQL)...
start /min "MySQL_Database" "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="d:\Sapo-Antigravity\mysql_data" --port=3306

echo [3/3] Dang khoi dong Web Server (Next.js)...
echo.
echo ------------------------------------------
echo  TRUY CAP TAI: http://localhost:3000
echo  TRUY CAP LAN: http://0.0.0.0:3000
echo ------------------------------------------
echo.
echo LUU Y: KHONG DUOC TAT CUA SO NAY KHI DANG DUNG.
echo Hay THU NHO (Minimize) cua so nay xuong Taskbar.
echo.

npm run dev
pause
