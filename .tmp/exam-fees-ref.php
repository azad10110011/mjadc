<?php
// Exam fee collection + QR verification
// Admin & Exam Controller collect fees; QR code on admit card points to public verify endpoint.

// POST /api/admin/exam-fees/collect — record a fee payment (admin / exam_controller)
$router->post('/api/admin/exam-fees/collect', function () {
    $user = Auth::requireAnyRole(['admin', 'exam_controller']);
    $data = json_decode(file_get_contents('php://input'), true);
    $studentUserId = (int)($data['student_user_id'] ?? 0);
    $year = (int)($data['year'] ?? 0);
    $examName = trim($data['exam_name'] ?? '');
    $amount = (float)($data['amount'] ?? 0);
    $method = in_array($data['payment_method'] ?? 'cash', ['cash', 'online']) ? $data['payment_method'] : 'cash';
    $transactionId = trim($data['transaction_id'] ?? '') ?: null;

    if (!$studentUserId || !$year || !$examName) {
        Response::validationError(['student_user_id, year and exam_name are required']);
    }

    // prevent double collection
    $existing = Database::fetch(
        "SELECT id FROM exam_fees WHERE student_user_id = ? AND year = ? AND exam_name = ?",
        [$studentUserId, $year, $examName]
    );
    if ($existing) {
        Response::error('Exam fee already collected for this student and exam', 409);
    }

    Database::insert('exam_fees', [
        'student_user_id' => $studentUserId,
        'year' => $year,
        'exam_name' => $examName,
        'amount' => $amount,
        'payment_method' => $method,
        'transaction_id' => $transactionId,
        'collected_by' => $user['id'],
    ]);
    Response::success(['collected' => true], 'Exam fee collected successfully');
});

// POST /api/admin/exam-fees/status — fee status for a list of students (admin / exam_controller)
$router->post('/api/admin/exam-fees/status', function () {
    Auth::requireAnyRole(['admin', 'exam_controller']);
    $data = json_decode(file_get_contents('php://input'), true);
    $year = (int)($data['year'] ?? 0);
    $examName = trim($data['exam_name'] ?? '');
    if (!$year || !$examName) {
        Response::validationError(['year and exam_name are required']);
    }
    $rows = Database::fetchAll(
        "SELECT student_user_id, amount, payment_method, collected_at
         FROM exam_fees WHERE year = ? AND exam_name = ?",
        [$year, $examName]
    );
    $map = [];
    foreach ($rows as $r) {
        $map[(string)$r['student_user_id']] = [
            'paid' => true,
            'amount' => (float)$r['amount'],
            'payment_method' => $r['payment_method'],
            'collected_at' => $r['collected_at'],
        ];
    }
    Response::success($map);
});

// DELETE /api/admin/exam-fees/{id} — undo mistaken collection (admin only)
$router->delete('/api/admin/exam-fees/{id}', function ($params) {
    Auth::requireRole('admin');
    Database::delete('exam_fees', 'id = ?', [(int)$params['id']]);
    Response::success(['deleted' => true], 'Fee record removed');
});
