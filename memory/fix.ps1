$ErrorActionPreference = "Stop"

$task1Name = "스마트팜 일일 리포트 생성"
$task2Name = "출근길 리포트"
$pythonPath = "C:\Users\copi7_000\AppData\Local\Programs\Python\Python313\python.exe"
$workingDir = "c:\Users\copi7_000\스마트팜을관리하는인공지능에이전트스팜"

$action1 = New-ScheduledTaskAction -Execute $pythonPath -Argument "c:\Users\copi7_000\스마트팜을관리하는인공지능에이전트스팜\reporter.py" -WorkingDirectory $workingDir
Set-ScheduledTask -TaskName $task1Name -Action $action1 | Out-Null
Write-Host "Task 1 Updated"

$action2 = New-ScheduledTaskAction -Execute $pythonPath -Argument "c:\Users\copi7_000\스마트팜을관리하는인공지능에이전트스팜\ui_popup.py" -WorkingDirectory $workingDir
Set-ScheduledTask -TaskName $task2Name -Action $action2 | Out-Null
Write-Host "Task 2 Updated"
