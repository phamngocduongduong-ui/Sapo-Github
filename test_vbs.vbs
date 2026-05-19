Set fso = CreateObject("Scripting.FileSystemObject")
Set oFile = fso.CreateTextFile("d:\Sapo-Antigravity\vbs_test.txt", True)
oFile.WriteLine "VBS is working at " & Now()
oFile.Close
