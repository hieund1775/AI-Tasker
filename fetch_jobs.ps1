$res = Invoke-RestMethod -Uri 'https://ai-tasker-backend-production.up.railway.app/api/JobPosts'
$res | Select-Object id, title, status | ConvertTo-Json
