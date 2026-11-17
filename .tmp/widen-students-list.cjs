// Widen GET /api/admin/students to allow exam_controller + administration (read-only).
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/students.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes("requireAnyRole(['admin', 'exam_controller', 'administration'])")) {
  console.log('already widened');
  process.exit(0);
}
const re = /\$router->get\('\/api\/admin\/students', function \(\) \{\s*\n\s*Auth::requireRole\('admin'\);/;
const repl = "$router->get('/api/admin/students', function () {\n    Auth::requireAnyRole(['admin', 'exam_controller', 'administration']);";
if (!re.test(c)) { console.error('pattern not found'); process.exit(1); }
c = c.replace(re, repl);
fs.writeFileSync(f, c, 'utf8');
console.log('widened list endpoint OK');
