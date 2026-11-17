<?php
// One-time import: push 12th students + their login users from local export to live DB.
// Upload BOTH files (this script + students_12th_export.json) into the live
// mjadc-api folder (same folder that contains .env, index.php, config/),
// open it once via browser, then DELETE both files.
//
// Safe: checks by student_id; skips existing; reports counts.

header('Content-Type: text/plain; charset=utf-8');
error_reporting(E_ALL);
ini_set('display_errors', '1');

echo "== env diagnostics ==\n";
echo "script dir: " . __DIR__ . "\n";

// Load .env from THIS folder (self-contained; does not depend on config/)
$envFile = __DIR__ . '/.env';
echo "looking for .env at: $envFile -> " . (file_exists($envFile) ? 'FOUND' : 'NOT FOUND') . "\n";
if (!file_exists($envFile)) {
    echo "ABORT: .env not found next to this script. Upload this script into the\n";
    echo "folder that contains .env, index.php and config/ (the mjadc-api root).\n";
    exit;
}
foreach (file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    $line = trim($line);
    if ($line === '' || $line[0] === '#') continue;
    $pos = strpos($line, '=');
    if ($pos === false) continue;
    $key = trim(substr($line, 0, $pos));
    $val = trim(substr($line, $pos + 1));
    // strip surrounding quotes
    if (strlen($val) >= 2 && (($val[0] === "'" && substr($val, -1) === "'") || ($val[0] === '"' && substr($val, -1) === '"'))) {
        $val = substr($val, 1, -1);
    }
    if (!isset($_ENV[$key])) $_ENV[$key] = $val;
}
$dbName = $_ENV['DB_NAME'] ?? '';
$dbHost = $_ENV['DB_HOST'] ?? '';
$dbPort = $_ENV['DB_PORT'] ?? '3306';
echo "DB_HOST=$dbHost DB_PORT=$dbPort DB_NAME=$dbName\n";
if ($dbName !== 'makauotv_mjadc') {
    echo "WARNING: DB_NAME is not 'makauotv_mjadc' - aborting.\n";
    exit;
}

$payloadFile = __DIR__ . '/students_12th_export.json';
echo "looking for export at: $payloadFile -> " . (file_exists($payloadFile) ? 'FOUND' : 'NOT FOUND') . "\n";
if (!file_exists($payloadFile)) { echo "ABORT: students_12th_export.json not found next to this script.\n"; exit; }
$payload = json_decode(file_get_contents($payloadFile), true);
if (!$payload || empty($payload['students'])) { echo "ABORT: could not parse students_12th_export.json\n"; exit; }

$students = $payload['students'];
$users = $payload['users'] ?? [];
echo "Loaded " . count($students) . " students, " . count($users) . " users\n";

// Connect directly with PDO (no dependency on config/)
try {
    $pdo = new PDO(
        "mysql:host={$dbHost};port={$dbPort};dbname={$dbName};charset=utf8mb4",
        $_ENV['DB_USER'] ?? 'root',
        $_ENV['DB_PASS'] ?? '',
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION, PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC]
    );
    echo "DB connected OK\n";
} catch (Exception $e) {
    echo "ABORT: DB connection failed: " . $e->getMessage() . "\n";
    exit;
}

$pdo->beginTransaction();
try {
    // ensure required columns exist (older live schema)
    $pdo->exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS custom_fields TEXT NULL");
    $pdo->exec("ALTER TABLE students ADD COLUMN IF NOT EXISTS class_roll VARCHAR(10) NULL");

    // map local user id -> live users.id (create missing users)
    $liveUserIdByLocal = [];
    $userCreated = 0; $userExists = 0;
    $stU = $pdo->prepare("SELECT id FROM users WHERE email = ? LIMIT 1");
    $inU = $pdo->prepare("INSERT INTO users (name, email, password_hash, gender, date_of_birth, default_role, status) VALUES (?,?,?,?,?,?,?)");
    foreach ($users as $u) {
        $email = $u['email'];
        $stU->execute([$email]);
        $existing = $stU->fetch();
        if ($existing) { $liveUserIdByLocal[$u['id']] = (int)$existing['id']; $userExists++; continue; }
        $inU->execute([
            $u['name'], $email, $u['password_hash'],
            ($u['gender'] ?: 'male'), ($u['date_of_birth'] ?: null),
            ($u['default_role'] ?: 'student'), ($u['status'] ?: 'active'),
        ]);
        $liveUserIdByLocal[$u['id']] = (int)$pdo->lastInsertId();
        $userCreated++;
    }
    echo "Users: existing=$userExists created=$userCreated\n";

    $created = 0; $skipped = 0;
    $stS = $pdo->prepare("SELECT id FROM students WHERE student_id = ? LIMIT 1");
    $inS = $pdo->prepare("INSERT INTO students
        (user_id, student_id, registration_no, name, name_bn, father_name, father_name_bn, mother_name, mother_name_bn,
         date_of_birth, blood_group, class, section, joining_year, academic_session, class_roll, student_type,
         optional_subject, mobile, parent_mobile, whatsapp, email, gender, present_address, permanent_address,
         student_group, compulsory_subjects, selective_subjects, photo_path, custom_fields)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)");
    foreach ($students as $s) {
        $stS->execute([$s['student_id']]);
        if ($stS->fetch()) { $skipped++; continue; }
        $liveUserId = $liveUserIdByLocal[$s['user_id']] ?? null;
        $inS->execute([
            $liveUserId,
            $s['student_id'],
            ($s['registration_no'] ?: null),
            $s['name'],
            ($s['name_bn'] ?: null),
            ($s['father_name'] ?: null),
            ($s['father_name_bn'] ?: null),
            ($s['mother_name'] ?: null),
            ($s['mother_name_bn'] ?: null),
            ($s['date_of_birth'] ?: null),
            ($s['blood_group'] ?: null),
            $s['class'],
            ($s['section'] ?: null),
            ($s['joining_year'] ?: date('Y')),
            ($s['academic_session'] ?: null),
            ($s['class_roll'] ?: null),
            ($s['student_type'] ?: 'Regular'),
            ($s['optional_subject'] ?: null),
            ($s['mobile'] ?: null),
            ($s['parent_mobile'] ?: null),
            ($s['whatsapp'] ?: null),
            ($s['email'] ?: null),
            $s['gender'],
            ($s['present_address'] ?: null),
            ($s['permanent_address'] ?: null),
            ($s['student_group'] ?: null),
            ($s['compulsory_subjects'] ?: null),
            ($s['selective_subjects'] ?: null),
            ($s['photo_path'] ?: null),
            ($s['custom_fields'] ?: null),
        ]);
        $created++;
    }
    echo "Students: created=$created skipped(existing)=$skipped\n";

    $pdo->commit();
    echo "COMMITTED OK\n";
    echo "NOTE: delete this script and students_12th_export.json from the server now.\n";
} catch (Exception $e) {
    $pdo->rollBack();
    echo "FAILED, rolled back: " . $e->getMessage() . "\n";
}
