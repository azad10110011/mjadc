// Patch students.php lookup: add class-based default exam_name to response.
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/students.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('default_exam')) { console.log('already patched'); process.exit(0); }
const needle = "Response::error('Student not found', 404);";
const idx = c.indexOf(needle);
if (idx === -1) { console.error('needle not found'); process.exit(1); }
const lineEnd = c.indexOf('\n', idx);
const lineStart = c.lastIndexOf('\n', idx) + 1;
const insert = `\n    // class-based default exam for simplified fee collection\n    $defaults = ['12th' => 'Pre-Test', '11th' => 'Half Yearly'];\n    $s['default_exam'] = $defaults[$s['class']] ?? 'Pre-Test';`;
c = c.slice(0, lineEnd) + insert + c.slice(lineEnd);
fs.writeFileSync(f, c, 'utf8');
console.log('lookup patched with default_exam');
