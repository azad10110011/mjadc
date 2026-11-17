// Strip waiver UI and per-exam amount editor from the collection page (now dedicated pages).
const fs = require('fs');
const f = 'd:/opencode 09062026/frontend/src/app/p_Xk7mN/exam-fee-collection/page.tsx';
let c = fs.readFileSync(f, 'utf8');
// remove the waiver dialog block if present
const start = c.indexOf('{/* Waiver dialog */}');
if (start > -1) {
  // find matching end: the closing of the conditional block ")}" that follows the Card
  const endMarker = 'Cancel\n                    </Button>\n                  </div>\n                </CardContent>\n              </Card>\n            )}';
  const e = c.indexOf(endMarker, start);
  if (e > -1) {
    c = c.slice(0, start) + c.slice(e + endMarker.length);
    console.log('waiver dialog removed');
  } else {
    console.log('waiver dialog end not found — skipping removal');
  }
}
fs.writeFileSync(f, c, 'utf8');
console.log('done');
