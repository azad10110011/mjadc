// Add exam_time support to backend exam-routines.php (normalize + POST).
const fs = require("fs");
const f = "d:/opencode 09062026/backend/routes/admin/exam-routines.php";
let c = fs.readFileSync(f, "utf8");
const nl = c.includes("\r\n") ? "\r\n" : "\n";
const L = (s) => s.split("\n").join(nl);

// 1. normalize: expose exam_time
const nBefore = L(`        'exam_date' => $row['exam_date'],
        'subjects' => is_array($subs) ? $subs : [],`);
const nAfter = L(`        'exam_date' => $row['exam_date'],
        'exam_time' => $row['exam_time'] ?? null,
        'subjects' => is_array($subs) ? $subs : [],`);
if (!c.includes(nBefore)) {
  console.error("normalize anchor missing");
  process.exit(1);
}
c = c.replace(nBefore, nAfter);

// 2. POST: persist exam_time when provided
const pBefore = L(`        'exam_date' => $date,
        'subjects' => json_encode($subjects),
    ]);`);
const pAfter = L(`        'exam_date' => $date,
        'exam_time' => (isset($data['exam_time']) && trim($data['exam_time']) !== '') ? trim($data['exam_time']) : null,
        'subjects' => json_encode($subjects),
    ]);`);
if (!c.includes(pBefore)) {
  console.error("post anchor missing");
  process.exit(1);
}
c = c.replace(pBefore, pAfter);

fs.writeFileSync(f, c, "utf8");
console.log("backend exam_time patched");
