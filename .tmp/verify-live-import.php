<?php
// Read-only verification of the 12th import.
$envFile = __DIR__ . '/.env';
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') continue;
    $pos = strpos($line, '=');
    if ($pos === false) continue;
    $key = trim(substr($line, 0, $pos));
    $val = trim(substr($line, $pos + 1));
    if (strlen($val) >= 2 && (($val[0] === "'" && substr($val, -1) === "'") || ($val[0] === '"' && substr($val, -1) === '"'))) $val = substr($val, 1, -1);
    if (!isset($_ENV[$key])) $_ENV[$key] = $val;
}
$pdo = new PDO(
    "mysql:host=" . ($_ENV['DB_HOST'] ?? 'localhost') . ";port=" . ($_ENV['DB_PORT'] ?? '3306') . ";dbname=" . $_ENV['DB_NAME'] . ";charset=utf8mb4",
    $_ENV['DB_USER'], $_ENV['DB_PASS'],
    [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
);
echo "students by class/group:\n";
foreach ($pdo->query("SELECT class, student_group, COUNT(*) c FROM students GROUP BY class, student_group ORDER BY class, student_group") as $r) {
    echo "  {$r['class']} / {$r['student_group']}: {$r['c']}\n";
}
echo "12th ID ranges:\n";
foreach ($pdo->query("SELECT student_group, COUNT(*) c, MIN(student_id) f, MAX(student_id) l FROM students WHERE class='12th' GROUP BY student_group") as $r) {
    echo "  {$r['student_group']}: {$r['c']} ({$r['f']}..{$r['l']})\n";
}
echo "11th ID ranges:\n";
foreach ($pdo->query("SELECT student_group, COUNT(*) c, MIN(student_id) f, MAX(student_id) l FROM students WHERE class='11th' GROUP BY student_group") as $r) {
    echo "  {$r['student_group']}: {$r['c']} ({$r['f']}..{$r['l']})\n";
}
echo "login sync check: ";
$stmt = $pdo->query("SELECT COUNT(*) FROM students s JOIN users u ON u.id=s.user_id WHERE s.class='12th' AND u.email <> s.student_id");
echo "mismatches=" . $stmt->fetchColumn() . "\n";
$dup = $pdo->query("SELECT student_id, COUNT(*) c FROM students GROUP BY student_id HAVING c>1")->fetchAll();
echo "duplicate student_ids: " . count($dup) . "\n";
echo "Bengali sample: ";
$s = $pdo->query("SELECT name, present_address FROM students WHERE class='12th' AND student_id='271001'")->fetch();
echo $s ? ($s['name'] . " | " . $s['present_address']) : '(not found)';
echo "\n";
