$f = "d:\opencode 09062026\backend\routes\admin\exam-fees.php"
$c = Get-Content $f -Raw
$lookup = @"

// GET /api/admin/students/lookup?id=X - quick student identity lookup
`$router->get('/api/admin/students/lookup', function () {
    Auth::requireAnyRole(['admin', 'exam_controller']);
    `$id = trim(`$_GET['id'] ?? '');
    if (!`$id) Response::validationError(['id is required']);
    `$s = Database::fetch(
        "SELECT s.id, s.user_id, s.student_id, s.name, s.father_name, s.class, s.student_group
         FROM students s WHERE s.student_id = ? LIMIT 1",
        [`$id]
    );
    if (!`$s) Response::error('Student not found', 404);
    Response::success(`$s);
});

// GET /api/admin/exam-fees/amount?exam_name=X"@

$needle = "`n// GET /api/admin/exam-fees/amount?exam_name=X"
if ($c.Contains($needle)) {
    $c = $c.Replace($needle, $lookup)
    [System.IO.File]::WriteAllText($f, $c, (New-Object System.Text.UTF8Encoding $false))
    Write-Output "inserted lookup endpoint"
} else {
    Write-Output "needle not found"
}
