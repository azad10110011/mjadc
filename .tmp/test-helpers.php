function teacherResultNormSubject(string $name): string {
    $n = trim($name);
    $n = preg_replace('/^(compulsory|selective|optional)\s*:\s*/i', '', $n);
    $n = preg_replace('/\s*\([^)]*\)\s*$/', '', $n);
    $n = preg_replace('/\s*-(?:1st|2nd|1|2|first|second)\s*(?:paper)?\b/i', '', $n);
    $n = preg_replace('/\s+(?:1st|2nd|first|second)\s*(?:paper)?\b/i', '', $n);
    $n = preg_replace('/\s+paper\b/i', '', $n);
    $n = preg_replace('/\s+/', ' ', $n);
    return mb_strtolower(trim($n));
}
function teacherResultCanonicalize(string $name): string {
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
function teacherResultSameSubject(?string $a, ?string $b): bool {
    if (!$a || !$b) return false;
    return teacherResultCanonicalize($a) === teacherResultCanonicalize($b);
}
echo teacherResultSameSubject("Physics", "Physics 1st Paper") ? "MATCH" : "NO_MATCH";
