const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/public/exam-fee-verify.php';
let c = fs.readFileSync(f, 'utf8');
const before = c.length;
c = c.replace(/â€"/g, '-').replace(/â€" /g, '- ').replace(/â€"/g, '-');
c = c.replace(/[\x80-\xFF]+(?=[^\x80-\xFF]|$)/g, '-');
fs.writeFileSync(f, c, 'utf8');
console.log('cleaned', before, '->', c.length);
