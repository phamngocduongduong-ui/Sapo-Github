Set oShell = CreateObject("WScript.Shell")
' Chạy file start_ems.bat với tham số 0 để ẩn cửa sổ
oShell.Run "cmd.exe /c d:\Sapo-Antigravity\start_ems.bat", 0, false
