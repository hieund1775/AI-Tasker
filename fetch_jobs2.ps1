$res = Invoke-RestMethod -Uri 'https://unoverthrown-unspuriously-leyla.ngrok-free.dev/api/JobPosts'
$res | Select-Object id, title, status | ConvertTo-Json
