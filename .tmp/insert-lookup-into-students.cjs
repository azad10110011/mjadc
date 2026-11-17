// Insert students/lookup into students.php BEFORE the {id} route to fix route collision.
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/students.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('students/lookup')) { console.log('already inserted'); process.exit(0); }
const needle = "// GET /api/admin/students/{id}";
if (!c.includes(needle)) { console.error('needle missing'); process.exit(1); }
const ins = `// GET /api/admin/students/lookup?id=X - quick lookup (BEFORE {id} to avoid collision)
$router->get('/api/admin/students/lookup', function () {
    Auth::requireAnyRole(['admin', 'exam_controller', 'administration']);
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

`;
c = c.replace(needle, ins + needle);
fs.writeFileSync(f, c, 'utf8');
console.log('inserted before {id} route');
