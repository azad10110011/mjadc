$path = 'C:/xampp/htdocs/mjadc-api/routes/teacher/results.php'
$content = Get-Content -Path $path -Raw
$content = $content.Replace('AuthMiddleware::authenticate();', "`$user = Auth::requireAnyRole(['teacher', 'exam_controller']);")
$content = $content.Replace("require_once __DIR__ . '/../../middleware/auth.php';", "")
$content = $content.Replace("`$_SESSION['user_id']", "`$user['id']")
Set-Content -Path $path -Value $content -NoNewline
$check = Get-Content -Path $path -Raw
if ($check -match 'AuthMiddleware') { Write-Output 'STILL_BROKEN' } else { Write-Output 'OK' }
Write-Output ('SESSION_LEFT=' + ($check -match 'SESSION'))
