// Patch students.php lookup: add class-based default exam_name + year to the response.
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/students.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('default_exam')) { console.log('already patched'); process.exit(0); }
const needle = "    if (!$s) Response::error('Student not found', 404);\n    Response::success($s);";
const repl = `    if (!$s) Response::error('Student not found', 404);
    // class-based default exam for simplified fee collection
    $defaults = ['12th' => 'Pre-Test', '11th' => 'Half Yearly'];
    $s['default_exam'] = $defaults[$s['class']] ?? 'Pre-Test';
    Response::success($s);`;
if (!c.includes(needle)) { console.error('needle not found'); process.exit(1); }
c = c.replace(needle, repl);
fs.writeFileSync(f, c, 'utf8');
console.log('lookup patched with default_exam');
