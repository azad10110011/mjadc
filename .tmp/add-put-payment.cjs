// Add PUT /api/admin/exam-fees/{id} (admin) to edit a payment record's amount/method.
const fs = require('fs');
const f = 'd:/opencode 09062026/backend/routes/admin/exam-fees.php';
let c = fs.readFileSync(f, 'utf8');
if (c.includes("exam-fees/{id}'"), false) {}
if (c.includes("// PUT /api/admin/exam-fees/{id}")) { console.log('already added'); process.exit(0); }
const anchor = "// DELETE /api/admin/exam-fees/by-student/{uid}/{year}/{exam}";
const ins = `// PUT /api/admin/exam-fees/{id} - edit a payment record (admin only)
$router->put('/api/admin/exam-fees/{id}', function ($params) {
    Auth::requireRole('admin');
    $id = (int)$params['id'];
    $data = json_decode(file_get_contents('php://input'), true);
    $updates = [];
    if (isset($data['amount']) && (float)$data['amount'] > 0) $updates['amount'] = (float)$data['amount'];
    if (isset($data['payment_method']) && in_array($data['payment_method'], ['cash', 'online'])) $updates['payment_method'] = $data['payment_method'];
    if (isset($data['will_pay_within'])) $updates['will_pay_within'] = trim($data['will_pay_within']) ?: null;
    if (empty($updates)) Response::validationError(['nothing to update']);
    Database::update('exam_fees', $updates, 'id = ?', [$id]);
    Response::success(['updated' => true], 'Payment record updated');
});

// DELETE /api/admin/exam-fees/by-student/{uid}/{year}/{exam}`;
if (!c.includes(anchor)) { console.error('anchor missing'); process.exit(1); }
c = c.replace(anchor, ins);
fs.writeFileSync(f, c, 'utf8');
console.log('PUT endpoint added');
