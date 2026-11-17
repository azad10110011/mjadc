// Remove the duplicate students/lookup registration in students.php (keep first).
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/students.php';
let c = fs.readFileSync(f, 'utf8');
const marker = "// GET /api/admin/students/lookup?id=X";
const first = c.indexOf(marker);
const second = c.indexOf(marker, first + 1);
if (second === -1) { console.log('no duplicate found'); process.exit(0); }
// each block ends right before the next comment line "// GET /api/admin/students/{id}"
const blockEnd = c.indexOf("// GET /api/admin/students/{id}", second);
if (blockEnd === -1) { console.error('cannot find block end'); process.exit(1); }
c = c.slice(0, second) + c.slice(blockEnd);
fs.writeFileSync(f, c, 'utf8');
console.log('duplicate removed; occurrences now:', (c.match(/students\/lookup/g) || []).length);
