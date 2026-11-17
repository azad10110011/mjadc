$path = 'C:/xampp/htdocs/mjadc-api/routes/teacher/results.php'
$content = Get-Content -Path $path -Raw
$content = $content -replace '(?m)^\\->', '$router->'
Set-Content -Path $path -Value $content -NoNewline
$content2 = Get-Content -Path $path -Raw
if ($content2 -match '(?m)^\\->') { Write-Output 'STILL_BROKEN' } else { Write-Output 'OK' }
