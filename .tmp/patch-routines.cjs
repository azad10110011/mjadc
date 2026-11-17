// Add exam_time to exam-routines.php (normalize, POST, PUT).
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/exam-routines.php';
let c = fs.readFileSync(f, 'utf8');

// normalize
c = c.replace(
  "        'exam_date' => $row['exam_date'],\n        'subjects' => is_array($subs) ? $subs : [],",
  "        'exam_date' => $row['exam_date'],\n        'exam_time' => $row['exam_time'] ?? null,\n        'subjects' => is_array($subs) ? $subs : [],",
);
// POST insert
c = c.replace(
  "        'exam_date' => $date,\n        'subjects' => json_encode($subjects),",
  "        'exam_date' => $date,\n        'exam_time' => trim($data['exam_time'] ?? '') ?: null,\n        'subjects' => json_encode($subjects),",
);
// PUT update
c = c.replace(
  "    if (isset($data['subjects'])) {",
  "    if (isset($data['exam_time'])) {\n        $upd['exam_time'] = trim($data['exam_time']) ?: null;\n    }\n    if (isset($data['subjects'])) {",
);
fs.writeFileSync(f, c, 'utf8');
console.log('routines backend patched');
