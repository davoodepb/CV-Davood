# setup-scheduler.ps1 — Register the Social Media Agent in Windows Task Scheduler
# Run this script with: powershell -ExecutionPolicy Bypass -File setup-scheduler.ps1

$scriptPath = "C:\Users\Davood\.gemini\antigravity\scratch\CV-Davood\src\scripts\social-media-agent.mjs"
$workingDir = "C:\Users\Davood\.gemini\antigravity\scratch\CV-Davood"
$nodePath = "node"

# Define the action (run node with the script path)
$action = New-ScheduledTaskAction -Execute $nodePath -Argument $scriptPath -WorkingDirectory $workingDir

# Define the trigger (Daily at 9:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM

# Define settings — key fix: AllowStartIfOnBatteries prevents 0x800710E0 error
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -StartWhenAvailable `
  -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Define principal — run whether user is logged on or not
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited

# Register the task
Register-ScheduledTask `
  -TaskName "SocialMediaAgent" `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Principal $principal `
  -Description "Daily social media cross-posting and viral video agent loop (v3)." `
  -Force

Write-Host "✅ Task 'SocialMediaAgent' successfully registered in Windows Task Scheduler!" -ForegroundColor Green
Write-Host "   Trigger: Daily at 9:00 AM" -ForegroundColor Cyan
Write-Host "   Battery: Runs even on battery power" -ForegroundColor Cyan
Write-Host "   Start when available: Yes (catches up if PC was off)" -ForegroundColor Cyan
