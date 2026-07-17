# setup-scheduler.ps1
# Get paths
$scriptPath = "C:\Users\Davood\.gemini\antigravity\scratch\CV-Davood\src\scripts\social-media-agent.mjs"
$nodePath = "node"

# Define the action (run node with the script path)
$action = New-ScheduledTaskAction -Execute $nodePath -Argument $scriptPath

# Define the trigger (Daily at 9:00 AM)
$trigger = New-ScheduledTaskTrigger -Daily -At 9:00AM

# Define settings
$settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 2)

# Register the task
Register-ScheduledTask -TaskName "SocialMediaAgent" -Action $action -Trigger $trigger -Settings $settings -Description "Daily social media cross-posting and viral video agent loop." -Force
Write-Host "Task successfully registered in Windows Task Scheduler!"
