const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
if (!c.includes('const [tab, setTab]')) {
  const anchor = 'const canCollect = role === "admin" || role === "exam_controller";';
  if (!c.includes(anchor)) { console.error('anchor missing'); process.exit(1); }
  c = c.replace(anchor, anchor + '\n  const [tab, setTab] = useState<"collect" | "report">("collect");');
  fs.writeFileSync(f, c, 'utf8');
  console.log('tab state added');
} else {
  console.log('tab state exists');
}
