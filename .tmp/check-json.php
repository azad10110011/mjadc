<?php
$j = json_decode(file_get_contents(__DIR__ . '/students_12th_export.json'), true);
echo 'PHP parses: ';
var_dump($j !== null);
echo 'students=' . count($j['students']) . ' users=' . count($j['users']) . "\n";
echo "Sample Bengali check: " . $j['students'][0]['present_address'] . "\n";
