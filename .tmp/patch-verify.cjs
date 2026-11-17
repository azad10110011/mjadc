// Patch public/exam-fee-verify.php: match student_user_id via users.id + try both exam-name key styles.
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/public/exam-fee-verify.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes('examVariants')) { console.log('already patched'); process.exit(0); }
const oldSelect = "SELECT s.id, s.student_id, s.name, s.class, s.student_group, s.photo_path";
c = c.replace(oldSelect, "SELECT s.id, s.user_id, s.student_id, s.name, s.class, s.student_group, s.photo_path");
const oldQuery = `    $fee = Database::fetch(
        "SELECT amount, payment_method, collected_at FROM exam_fees
         WHERE student_user_id = ? AND year = ? AND exam_name = ? LIMIT 1",
        [$student['id'], $year, $exam]
    );`;
const newQuery = `    // exam_fees.student_user_id stores the USERS id, not students.id; try both key styles
    $examVariants = [$exam];
    $suffix = ' (' . $student['class'] . ')';
    if (substr($exam, -strlen($suffix)) === $suffix) {
        $examVariants[] = substr($exam, 0, -strlen($suffix));
    } else {
        $examVariants[] = $exam . $suffix;
    }
    $fee = null;
    foreach ($examVariants as $variant) {
        $fee = Database::fetch(
            "SELECT amount, payment_method, collected_at FROM exam_fees
             WHERE student_user_id = ? AND year = ? AND exam_name = ? LIMIT 1",
            [$student['user_id'], $year, $variant]
        );
        if ($fee) break;
    }`;
if (!c.includes(oldQuery)) { console.error('fee query not found'); process.exit(1); }
c = c.replace(oldQuery, newQuery);
fs.writeFileSync(f, c, 'utf8');
console.log('verify patched');
