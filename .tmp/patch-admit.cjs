// Admit card modifications: label rename, 2-space separators, routine Time column,
// college logo in header, attractive color design (screen + PDF).
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/admit-card/page.tsx';
let c = fs.readFileSync(f, 'utf8');

// 1. Rename label
c = c.replace('{ value: "student_group", label: "Group/Department", key: "student_group" }', '{ value: "student_group", label: "Group", key: "student_group" }');

// 2. find studentFields builder to append 2 spaces on specific labels
const sfIdx = c.indexOf('const studentFields =');
if (sfIdx > -1) {
  c = c.replace(
    /const studentFields = \(s: AdmitStudent\)[^=]*=> \[/,
    `const SPACED = new Set(["Student Name", "Father's Name", "Mother's Name", "Group", "Student Type"]);
const studentFields = (s: AdmitStudent): [string, string][] => [`,
  );
  // append mapping before its closing "];" — safer: convert the returned array by wrapping.
  // Instead of restructuring, add a post-processor export below studentFields: patch usage.
}
fs.writeFileSync(f, c, 'utf8');
console.log('phase 1 done');
