// Point the fee-collection page at the lookup's default_exam (no selectors anymore).
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
let n = 0;
if (c.includes('res.data.latest_exam')) { c = c.split('res.data.latest_exam || ""').join('res.data.default_exam'); n++; }
if (c.includes('lookupStudent.latest_exam')) { c = c.split('lookupStudent.latest_exam || ""').join('lookupStudent.default_exam'); n++; }
fs.writeFileSync(f, c, 'utf8');
console.log('frontend references updated:', n);
