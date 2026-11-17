<?php
// Diagnostic: what fee records exist for 271009, and what the verify query matches.
$envFile = __DIR__ . '/.env';
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') continue;
    $pos = strpos($line, '=');
    if ($pos === false) continue;
    $k = trim(substr($line, 0, $pos));
    $v = trim(substr($line, $pos + 1));
    if (strlen($v) >= 2 && (($v[0] === "'" && substr($v, -1) === "'") || ($v[0] === '"' && substr($v, -1) === '"'))) $v = substr($v, 1, -1);
    if (!isset($_ENV[$k])) $_ENV[$k] = $v;
}
$pdo = new PDO(
    "mysql:host=" . ($_ENV['DB_HOST'] ?? 'localhost') . ";dbname=" . $_ENV['DB_NAME'] . ";charset=utf8mb4",
    $_ENV['DB_USER'], $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
echo "=== all exam_fees rows ===\n";
foreach ($pdo->query("SELECT ef.id, ef.student_user_id, ef.year, ef.exam_name, ef.amount, s.student_id, s.name
                      FROM exam_fees ef LEFT JOIN students s ON s.user_id = ef.student_user_id
                      ORDER BY ef.id") as $r) {
    echo "fee#{$r['id']} uid={$r['student_user_id']} year={$r['year']} exam='{$r['exam_name']}' amount={$r['amount']} student={$r['student_id']} ({$r['name']})\n";
}
echo "\n=== student 271009 identity ===\n";
$s = $pdo->query("SELECT id, user_id, student_id, name FROM students WHERE student_id='271009'")->fetch(PDO::FETCH_ASSOC);
echo $s ? json_encode($s) : 'not found';
echo "\n";
