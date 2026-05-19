@echo off
title Sapo EMS - Stop System
echo Dang dung he thong Sapo EMS...

:: Tat Next.js Node process
taskkill /F /IM node.exe /T 2>nul

:: Tat MySQL Server
taskkill /F /IM mysqld.exe /T 2>nul

echo ------------------------------------------
echo [OK] Da dung tat ca cac tien trinh ngam.
pause
