On Error Resume Next
Set sh = CreateObject("WScript.Shell")

' 1. Bat MySQL (An hoan toan)
' Dung duong dan truc tiep de tranh loi
sh.Run "cmd /c ""C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe"" --datadir=""d:\Sapo-Antigravity\mysql_data"" --port=3306", 0, false

' 2. Bat Web Server (An hoan toan)
' Chay npm dev truc tiep trong thu muc du an
sh.Run "cmd /c cd /d d:\Sapo-Antigravity && npm run dev", 0, false

' 3. Thong bao
MsgBox "Dang kich hoat Sapo EMS ngam. Vui long doi 15 giay roi vao localhost:3000", 64, "Sapo EMS"
