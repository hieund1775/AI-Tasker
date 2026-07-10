$res = Invoke-RestMethod -Uri 'https://aitaskerbe-production.up.railway.app/api/JobPosts'
$res | Select-Object id, title, status | ConvertTo-Json
