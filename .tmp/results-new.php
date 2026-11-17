<?php

require_once __DIR__ . '/../../middleware/auth.php';

function teacherResultNormSubject(string $name): string
{
    $n = trim($name);
    $n = preg_replace('/^(compulsory|selective|optional)\s*:\s*/i', '', $n);
    $n = preg_replace('/\s*\([^)]*\)\s*$/', '', $n);
    $n = preg_replace('/\s*-(?:1st|2nd|1|2|first|second)\s*(?:paper)?\b/i', '', $n);
    $n = preg_replace('/\s+(?:1st|2nd|first|second)\s*(?:paper)?\b/i', '', $n);
    $n = preg_replace('/\s+paper\b/i', '', $n);
    $n = preg_replace('/\s+/', ' ', $n);
    return mb_strtolower(trim($n));
}

function teacherResultCanonicalize(string $name): string
{
    $norm = teacherResultNormSubject($name);
    $aliases = [
        'bangla' => 'bangla',
        'bengali' => 'bangla',
        'english' => 'english',
        'ict' => 'ict',
        'information and communication technology' => 'ict',
        'information & communication technology' => 'ict',
        'physics' => 'physics',
        'chemistry' => 'chemistry',
        'biology' => 'biology',
        'higher math' => 'higher mathematics',
        'higher mathematics' => 'higher mathematics',
    ];
    return $aliases[$norm] ?? $norm;
}

function teacherResultSameSubject(?string $a, ?string $b): bool
{
    if (!$a || !$b) {
        return false;
    }
    return teacherResultCanonicalize($a) === teacherResultCanonicalize($b);
}

function teacherResultGetConfiguredItems(int $year, string $class, string $examName): array
{
    $configs = Database::fetchAll(
        "SELECT esc.id as config_id, esc.subject_id, esc.paper_id, esc.subject_type,
                s.subject_name, s.subject_code, s.class, s.parts_target,
                p.paper_name, p.paper_code
         FROM exam_subject_config esc
         JOIN subjects s ON esc.subject_id = s.id
         LEFT JOIN subject_papers p ON esc.paper_id = p.id
         WHERE esc.year = ? AND esc.class = ? AND esc.exam_name = ?
         ORDER BY s.subject_code ASC, p.paper_code ASC, esc.id ASC",
        [$year, $class, $examName]
    );

    $items = [];
    foreach ($configs as $c) {
        $hasPaper = !empty($c['paper_name']);
        $label = $hasPaper ? ($c['subject_name'] . ' - ' . $c['paper_name']) : $c['subject_name'];
        $key = $c['subject_id'] . ($hasPaper ? ('_' . $c['paper_id']) : '');
        $partsTarget = !empty($c['parts_target']) ? $c['parts_target'] : ($hasPaper ? ($c['subject_name'] . '-' . trim(str_ireplace('Paper', '', $c['paper_name']))) : $c['subject_name']);

        $items[] = [
            'key' => $key,
            'label' => $label,
            'subject_id' => (int)$c['subject_id'],
            'paper_id' => $c['paper_id'] ? (int)$c['paper_id'] : null,
            'subject_name' => $c['subject_name'],
            'paper_name' => $c['paper_name'] ?: null,
            'subject_type' => $c['subject_type'] ?: 'compulsory',
            'parts_target' => $partsTarget,
        ];
    }

    return $items;
}

// GET /api/teacher/results/exam-subjects - Returns only subjects configured for the selected exam
Router::get('/api/teacher/results/exam-subjects', function () {
    AuthMiddleware::authenticate();

    $year = (int)($_GET['year'] ?? 0);
    $class = trim($_GET['class'] ?? '');
    $examName = trim($_GET['exam_name'] ?? '');

    if (!$year || !$class || !$examName) {
        Response::error('year, class, and exam_name are required', 400);
    }

    $items = teacherResultGetConfiguredItems($year, $class, $examName);
    Response::success(['subjects' => $items]);
});

// GET /api/teacher/results/subjects - Kept for backwards compatibility
Router::get('/api/teacher/results/subjects', function () {
    AuthMiddleware::authenticate();
    $subjects = Database::fetchAll("SELECT DISTINCT subject FROM teacher_subjects WHERE teacher_id = ? ORDER BY subject", [$_SESSION['user_id']]);
    Response::success(array_column($subjects, 'subject'));
});

// GET /api/teacher/results/load-students - Loads enrolled students for the selected subject
Router::get('/api/teacher/results/load-students', function () {
    AuthMiddleware::authenticate();

    $year = (int)($_GET['year'] ?? 0);
    $class = trim($_GET['class'] ?? '');
    $examName = trim($_GET['exam_name'] ?? '');
    $subject = trim($_GET['subject'] ?? '');
    $subjectId = isset($_GET['subject_id']) && $_GET['subject_id'] !== '' ? (int)$_GET['subject_id'] : 0;
    $paperName = trim($_GET['paper_name'] ?? '');

    if (!$year || !$class || !$examName || (!$subject && !$subjectId)) {
        Response::error('Year, class, exam_name, and subject are required', 400);
    }

    $configuredItems = teacherResultGetConfiguredItems($year, $class, $examName);
    $matchedItem = null;

    if ($subjectId > 0) {
        foreach ($configuredItems as $item) {
            if ($item['subject_id'] === $subjectId) {
                if ($paperName !== '') {
                    if (strcasecmp((string)$item['paper_name'], $paperName) === 0) {
                        $matchedItem = $item;
                        break;
                    }
                } else {
                    $matchedItem = $item;
                    break;
                }
            }
        }
    }

    if (!$matchedItem && $subject !== '') {
        foreach ($configuredItems as $item) {
            if (teacherResultSameSubject($item['subject_name'], $subject)) {
                $matchedItem = $item;
                break;
            }
        }
    }

    $subjectToMatch = $matchedItem ? $matchedItem['subject_name'] : $subject;
    $partsTarget = $matchedItem ? $matchedItem['parts_target'] : $subject;

    // Fetch part configurations for this subject
    $partConfigs = Database::fetchAll(
        "SELECT part_name, full_mark, pass_mark
         FROM subject_parts
         WHERE subject = ?
         ORDER BY sort_order ASC, id ASC",
        [$partsTarget]
    );

    if (empty($partConfigs) && $subjectToMatch !== $partsTarget) {
        $partConfigs = Database::fetchAll(
            "SELECT part_name, full_mark, pass_mark
             FROM subject_parts
             WHERE subject = ?
             ORDER BY sort_order ASC, id ASC",
            [$subjectToMatch]
        );
    }

    if (empty($partConfigs) && teacherResultSameSubject($subjectToMatch, 'ICT')) {
        $partConfigs = Database::fetchAll(
            "SELECT part_name, full_mark, pass_mark
             FROM subject_parts
             WHERE subject IN ('ICT', 'Information and Communication Technology')
             ORDER BY sort_order ASC, id ASC"
        );
    }

    $partConfigs = array_map(function ($p) {
        return [
            'part_name' => $p['part_name'],
            'full_mark' => (float)$p['full_mark'],
            'pass_mark' => (float)$p['pass_mark'],
        ];
    }, $partConfigs);

    // Fetch all active students for this class/year
    $allStudents = Database::fetchAll(
        "SELECT id, student_id, name, class_roll, class, section, student_group,
                compulsory_subjects, selective_subjects, optional_subject
         FROM students
         WHERE class = ? AND status = 'active'
         ORDER BY CAST(class_roll AS UNSIGNED) ASC, student_id ASC",
        [$class]
    );

    // Filter students enrolled in this subject (same logic as mark entry form)
    $filteredStudents = [];
    foreach ($allStudents as $st) {
        $takes = false;

        // 1. Compulsory
        if (!empty($st['compulsory_subjects'])) {
            $compArray = json_decode($st['compulsory_subjects'], true);
            if (is_array($compArray)) {
                foreach ($compArray as $s) {
                    if (teacherResultSameSubject($subjectToMatch, $s)) {
                        $takes = true;
                        break;
                    }
                }
            }
        }

        // 2. Selective
        if (!$takes && !empty($st['selective_subjects'])) {
            $selArray = json_decode($st['selective_subjects'], true);
            if (is_array($selArray)) {
                foreach ($selArray as $s) {
                    if (teacherResultSameSubject($subjectToMatch, $s)) {
                        $takes = true;
                        break;
                    }
                }
            }
        }

        // 3. Optional
        if (!$takes && !empty($st['optional_subject'])) {
            if (teacherResultSameSubject($subjectToMatch, $st['optional_subject'])) {
                $takes = true;
            }
        }

        // Fallback: If student has no subject selection records at all, include them
        if (!$takes && empty($st['compulsory_subjects']) && empty($st['selective_subjects']) && empty($st['optional_subject'])) {
            $takes = true;
        }

        if ($takes) {
            $filteredStudents[] = $st;
        }
    }

    // Find exam_id
    $exam = Database::fetch(
        "SELECT id FROM exams WHERE year = ? AND class = ? AND exam_name = ?",
        [$year, $class, $examName]
    );
    $examId = $exam ? $exam['id'] : null;

    // Load existing marks if exam exists
    $existingMarks = [];
    if ($examId) {
        $marksData = Database::fetchAll(
            "SELECT student_id, cq, mcq, practical, total, grade, gpa, is_absent, parts_data, absent_in
             FROM exam_results
             WHERE exam_id = ? AND subject = ?",
            [$examId, $subjectToMatch]
        );
        foreach ($marksData as $m) {
            $existingMarks[$m['student_id']] = $m;
        }
    }

    $result = [];
    foreach ($filteredStudents as $s) {
        $existing = $existingMarks[$s['id']] ?? null;
        $partsData = [];
        $absentIn = [];

        if ($existing && !empty($existing['parts_data'])) {
            $decoded = json_decode($existing['parts_data'], true);
            if (is_array($decoded)) {
                $partsData = $decoded;
            }
        }
        if ($existing && !empty($existing['absent_in'])) {
            $decoded = json_decode($existing['absent_in'], true);
            if (is_array($decoded)) {
                $absentIn = $decoded;
            }
        }

        $result[] = [
            'id' => $s['id'],
            'student_id' => $s['student_id'],
            'name' => $s['name'],
            'class_roll' => $s['class_roll'],
            'section' => $s['section'],
            'student_group' => $s['student_group'],
            'cq' => $existing ? $existing['cq'] : 0,
            'mcq' => $existing ? $existing['mcq'] : 0,
            'practical' => $existing ? $existing['practical'] : 0,
            'total' => $existing ? $existing['total'] : 0,
            'grade' => $existing ? $existing['grade'] : '',
            'gpa' => $existing ? $existing['gpa'] : 0,
            'is_absent' => $existing ? (bool)$existing['is_absent'] : false,
            'parts_data' => $partsData,
            'absent_in' => $absentIn,
        ];
    }

    Response::success([
        'students' => $result,
        'part_configs' => $partConfigs,
    ]);
});

// POST /api/teacher/results/upload - Upload and save results for exam-configured subject
Router::post('/api/teacher/results/upload', function () {
    AuthMiddleware::authenticate();

    $data = json_decode(file_get_contents('php://input'), true);
    $year = $data['year'] ?? '';
    $class = $data['class'] ?? '';
    $examName = $data['exam_name'] ?? '';
    $subject = $data['subject'] ?? '';
    $subjectId = isset($data['subject_id']) ? (int)$data['subject_id'] : 0;
    $marks = $data['marks'] ?? [];

    if (!$year || !$class || !$examName || (!$subject && !$subjectId) || empty($marks)) {
        Response::error('All fields and marks are required', 400);
    }

    // Verify subject is configured for this exam if subject_id is supplied
    $configuredItems = teacherResultGetConfiguredItems((int)$year, $class, $examName);
    if (!empty($configuredItems)) {
        $valid = false;
        foreach ($configuredItems as $item) {
            if ($subjectId > 0 && $item['subject_id'] === $subjectId) {
                $valid = true;
                $subject = $item['subject_name'];
                break;
            } elseif ($subject && teacherResultSameSubject($item['subject_name'], $subject)) {
                $valid = true;
                $subject = $item['subject_name'];
                break;
            }
        }
        if (!$valid) {
            Response::error('Selected subject is not configured for this exam', 400);
        }
    }

    $exam = Database::fetch(
        "SELECT id FROM exams WHERE year = ? AND class = ? AND exam_name = ?",
        [$year, $class, $examName]
    );

    if (!$exam) {
        $examId = Database::insert(
            "INSERT INTO exams (year, class, exam_name) VALUES (?, ?, ?)",
            [$year, $class, $examName]
        );
    } else {
        $examId = $exam['id'];
    }

    $partConfigs = Database::fetchAll(
        "SELECT part_name, full_mark, pass_mark FROM subject_parts WHERE subject = ? ORDER BY sort_order ASC, id ASC",
        [$subject]
    );

    $saved = 0;
    foreach ($marks as $m) {
        $studentId = $m['student_id'] ?? '';
        if (!$studentId) {
            continue;
        }

        $student = Database::fetch("SELECT id FROM students WHERE student_id = ?", [$studentId]);
        if (!$student) {
            continue;
        }

        $partsData = $m['parts_data'] ?? [];
        $absentIn = $m['absent_in'] ?? [];
        $cq = (float)($m['cq'] ?? ($partsData['cq'] ?? 0));
        $mcq = (float)($m['mcq'] ?? ($partsData['mcq'] ?? 0));
        $practical = (float)($m['practical'] ?? ($partsData['practical'] ?? 0));

        if (!empty($partConfigs)) {
            $total = 0;
            $failed = false;
            $allAbsent = count($partConfigs) > 0;

            foreach ($partConfigs as $p) {
                $pn = $p['part_name'];
                $isAbs = in_array($pn, $absentIn, true);
                if (!$isAbs) {
                    $allAbsent = false;
                }
                $val = (float)($partsData[$pn] ?? 0);
                $total += $val;
                if ($isAbs || $val < (float)$p['pass_mark']) {
                    $failed = true;
                }
            }

            if ($allAbsent) {
                $grade = 'F';
                $gpa = 0.00;
                $isAbsent = 1;
            } elseif ($failed) {
                $grade = 'F';
                $gpa = 0.00;
                $isAbsent = 0;
            } else {
                $gInfo = calculateGradeFromTotal($total);
                $grade = $gInfo['grade'];
                $gpa = $gInfo['points'];
                $isAbsent = 0;
            }
        } else {
            $total = (float)($m['total'] ?? ($cq + $mcq + $practical));
            $isAbsent = !empty($m['is_absent']) ? 1 : 0;
            if ($isAbsent) {
                $grade = 'F';
                $gpa = 0.00;
            } else {
                $gInfo = calculateGradeFromTotal($total);
                $grade = $gInfo['grade'];
                $gpa = $gInfo['points'];
            }
        }

        $existing = Database::fetch(
            "SELECT id FROM exam_results WHERE exam_id = ? AND student_id = ? AND subject = ?",
            [$examId, $student['id'], $subject]
        );

        $partsJson = !empty($partsData) ? json_encode($partsData) : null;
        $absentJson = !empty($absentIn) ? json_encode($absentIn) : null;

        if ($existing) {
            Database::execute(
                "UPDATE exam_results SET cq = ?, mcq = ?, practical = ?, total = ?, grade = ?, gpa = ?, is_absent = ?, parts_data = ?, absent_in = ? WHERE id = ?",
                [$cq, $mcq, $practical, $total, $grade, $gpa, $isAbsent, $partsJson, $absentJson, $existing['id']]
            );
        } else {
            Database::execute(
                "INSERT INTO exam_results (exam_id, student_id, subject, cq, mcq, practical, total, grade, gpa, is_absent, parts_data, absent_in)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [$examId, $student['id'], $subject, $cq, $mcq, $practical, $total, $grade, $gpa, $isAbsent, $partsJson, $absentJson]
            );
        }
        $saved++;
    }

    Response::success(['message' => 'Results uploaded successfully', 'saved_count' => $saved]);
});

// GET /api/teacher/results/download
Router::get('/api/teacher/results/download', function () {
    AuthMiddleware::authenticate();

    $year = $_GET['year'] ?? '';
    $class = $_GET['class'] ?? '';
    $examName = $_GET['exam_name'] ?? '';
    $subject = $_GET['subject'] ?? '';

    if (!$year || !$class || !$examName || !$subject) {
        Response::error('All fields are required', 400);
    }

    $results = Database::fetchAll(
        "SELECT s.student_id, s.name, s.class_roll, s.section,
                er.cq, er.mcq, er.practical, er.total, er.grade, er.gpa, er.is_absent
         FROM exam_results er
         JOIN students s ON er.student_id = s.id
         JOIN exams e ON er.exam_id = e.id
         WHERE e.year = ? AND e.class = ? AND e.exam_name = ? AND er.subject = ?
         ORDER BY s.student_id",
        [$year, $class, $examName, $subject]
    );

    Response::success($results);
});

function calculateGradeFromTotal(float $total): array
{
    $grades = [
        ['min' => 80, 'grade' => 'A+', 'points' => 5.00],
        ['min' => 70, 'grade' => 'A', 'points' => 4.00],
        ['min' => 60, 'grade' => 'A-', 'points' => 3.50],
        ['min' => 50, 'grade' => 'B', 'points' => 3.00],
        ['min' => 40, 'grade' => 'C', 'points' => 2.00],
        ['min' => 33, 'grade' => 'D', 'points' => 1.00],
        ['min' => 0, 'grade' => 'F', 'points' => 0.00],
    ];

    foreach ($grades as $g) {
        if ($total >= $g['min']) {
            return $g;
        }
    }

    return ['grade' => 'F', 'points' => 0.00];
}
