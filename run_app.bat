@echo off
echo [INFO] Dang kiem tra ket noi den Database...
npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong the generate Prisma Client. Hay kiem tra MySQL (XAMPP)!
    pause
    exit
)

echo [INFO] Dang khoi dong Server...
npm run dev
echo [INFO] Neu ban thay dong nay, server da bi dung dot ngot.
pause
