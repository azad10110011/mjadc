$path = 'C:/xampp/htdocs/mjadc-api/routes/teacher/results.php'
$content = Get-Content -Path $path -Raw
$content = $content -replace '\$user = AuthMiddleware::authenticate\(\);', '$user = Auth::requireAnyRole([''teacher'', ''exam_controller'']);'
$content = $content -replace '\$_SESSION\[''user_id''\]', '$user[''id'']'
Set-Content -Path $path -Value $content -NoNewline
$check = Get-Content -Path $path -Raw
if ($check -match 'AuthMiddleware') { Write-Output 'STILL_BROKEN' } else { Write-Output 'OK' }
