<?php
// Direct backend test bypassing HTTP auth: call the lookup query path the route uses.
require __DIR__ . '/../../backend/vendor/autoload.php' ;
// Simpler: just replicate the SQL the endpoint runs.
$env = parse_ini_file('C:/xampp/htdocs/mjadc-api/.env');
$pdo = new PDO("mysql:host={$env['DB_HOST']};dbname={$env['DB_NAME']};charset=utf8mb4", $env['DB_USER'], $env['DB_PASS'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$id = '271009';
$stmt = $pdo->prepare("SELECT s.id, s.user_id, s.student_id, s.name, s.father_name, s.class, s.student_group FROM students s WHERE s.student_id = ? LIMIT 1");
$stmt->execute([$id]);
$row = $stmt->fetch(PDO::FETCH_ASSOC);
echo $row ? json_encode($row, JSON_UNESCAPED_UNICODE) : "NO ROW for $id";
echo "\n";
