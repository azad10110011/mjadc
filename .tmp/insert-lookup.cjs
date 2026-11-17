// Insert the students/lookup endpoint into exam-fees.php before the amount GET route.
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/exam-fees.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('students/lookup')) { console.log('already inserted'); process.exit(0); }
const needle = "// GET /api/admin/exam-fees/amount?exam_name=X";
if (!c.includes(needle)) { console.error('needle not found'); process.exit(1); }
const insert = `// GET /api/admin/students/lookup?id=X - quick student identity lookup
$router->get('/api/admin/students/lookup', function () {
    Auth::requireAnyRole(['admin', 'exam_controller']);
    $id = trim($_GET['id'] ?? '');
    if (!$id) Response::validationError(['id is required']);
    $s = Database::fetch(
        "SELECT s.id, s.user_id, s.student_id, s.name, s.father_name, s.class, s.student_group
         FROM students s WHERE s.student_id = ? LIMIT 1",
        [$id]
    );
    if (!$s) Response::error('Student not found', 404);
    Response::success($s);
});

` + needle;
c = c.replace(needle, insert);
fs.writeFileSync(f, c, 'utf8');
console.log('inserted lookup endpoint');
