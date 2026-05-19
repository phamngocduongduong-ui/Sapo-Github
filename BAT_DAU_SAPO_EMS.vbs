Set oShell = CreateObject("WScript.Shell")
' Chạy file start_ems.bat trước (không chặn)
oShell.Run "cmd.exe /c d:\Sapo-Antigravity\start_ems.bat", 0, false
' Hiện thông báo sau
MsgBox "He thong Sapo EMS dang duoc khoi dong ngam. Vui long doi 10-15 giay roi vao localhost:3000", 64, "Sapo EMS"
