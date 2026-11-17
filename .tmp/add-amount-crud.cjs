// Add list-all + delete endpoints for exam fee amounts (admin CRUD).
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/exam-fees.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes("exam-fees/amounts'")) { console.log('already added'); process.exit(0); }
const anchor = "$router->post('/api/admin/exam-fees/amount', function () {";
const ins = `$router->get('/api/admin/exam-fees/amounts', function () {
    Auth::requireAnyRole(['admin', 'exam_controller', 'administration']);
    $rows = Database::fetchAll(
        "SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'exam_fee_amount_%' ORDER BY setting_key"
    );
    $list = [];
    foreach ($rows as $r) {
        $name = preg_replace('/^exam_fee_amount_/', '', $r['setting_key']);
        $name = str_replace('_', ' ', $name);
        // restore "(class)" suffix formatting from underscore-serialized keys
        $name = preg_replace('/\\s*\\((.*)\\)$/u', ' ($1)', $name);
        $name = ucwords($name);
        $list[] = ['exam_name' => $name, 'amount' => (float)$r['setting_value']];
    }
    Response::success($list);
});

// DELETE /api/admin/exam-fees/amount?exam_name=X — remove a fee amount (admin)
$router->delete('/api/admin/exam-fees/amount', function () {
    Auth::requireRole('admin');
    $examName = trim($_GET['exam_name'] ?? '');
    if (!$examName) Response::validationError(['exam_name is required']);
    Database::delete('site_settings', 'setting_key = ?', ['exam_fee_amount_' . strtolower(str_replace(' ', '_', $examName))]);
    Response::success(['deleted' => true], 'Fee amount removed');
});

$router->post('/api/admin/exam-fees/amount', function () {`;
if (!c.includes(anchor)) { console.error('anchor missing'); process.exit(1); }
c = c.replace(anchor, ins);
fs.writeFileSync(f, c, 'utf8');
console.log('amounts list + delete endpoints added');
