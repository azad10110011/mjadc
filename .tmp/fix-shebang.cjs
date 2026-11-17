const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
const bad = '"Conuse client"';
if (c.includes(bad)) {
  c = c.replace(bad, '"use client"');
  fs.writeFileSync(f, c, 'utf8');
  console.log('fixed corrupted shebang');
} else {
  console.log('shebang looks fine:', JSON.stringify(c.slice(0, 20)));
}
