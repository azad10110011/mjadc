$src = 'd:/opencode 09062026/backend/routes/teacher/results.php'
$dst = 'C:/xampp/htdocs/mjadc-api/routes/teacher/results.php'
Copy-Item $src $dst -Force
$content = Get-Content -Path $dst -Raw
$content = $content.Replace("Router::get(", '$router->get(').Replace("Router::post(", '$router->post(')
$content = $content.Replace('AuthMiddleware::authenticate();', "`$user = Auth::requireAnyRole(['teacher', 'exam_controller']);")
$content = $content.Replace("require_once __DIR__ . '/../../middleware/auth.php';", "")
$content = $content.Replace("`$_SESSION['user_id']", "`$user['id']")
Set-Content -Path $dst -Value $content -NoNewline
$check = Get-Content -Path $dst -Raw
Write-Output ('RouterStatic=' + ($check -match 'Router::'))
Write-Output ('AuthMiddleware=' + ($check -match 'AuthMiddleware'))
Write-Output ('SessionUse=' + ($check -match 'SESSION'))
Write-Output ('Routes=' + ([regex]::Matches($check, '\$router->(get|post)\(').Count))
