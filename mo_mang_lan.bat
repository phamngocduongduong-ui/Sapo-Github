@echo off
title Sua loi truy cap LAN - Sapo EMS
echo ==========================================
echo    DANG MO CONG 3000 TREN FIREWALL...
echo ==========================================

:: Kiem tra quyen Admin
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [LOI] Ban phai chuot phai vao file nay va chon "Run as Administrator"!
    pause
    exit /b
)

:: Xoa quy tac cu
netsh advfirewall firewall delete rule name="Sapo_EMS_LAN" >nul 2>&1

:: Them quy tac moi cho ca vao va ra
netsh advfirewall firewall add rule name="Sapo_EMS_LAN" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Sapo_EMS_LAN" dir=out action=allow protocol=TCP localport=3000

:: Lay IP LAN hien tai
for /f "tokens=4" %%a in ('route print ^| findstr 0.0.0.0 ^| findstr /v "127.0.0.1"') do (
    set MY_IP=%%a
)

echo ==========================================
echo [THANH CONG] Da mo cong 3000 tren Firewall.
echo ------------------------------------------
echo Dia chi truy cap tu may khac trong mang:
echo http://%MY_IP%:3000
echo ------------------------------------------
echo Luu y: Ban phai TAT va BAT LAI he thong EMS 
echo (dung file KICH_HOAT_EMS.bat) thi LAN moi co tac dung.
echo ==========================================
pause
