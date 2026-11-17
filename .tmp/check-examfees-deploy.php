<?php
// Read-only deploy check: does the live exam-fees.php contain the lookup endpoint?
// Upload as check-examfees.php into mjadc-api/ root, open once, then DELETE.
header('Content-Type: text/plain; charset=utf-8');
$file = __DIR__ . '/routes/admin/exam-fees.php';
echo "file exists: " . (file_exists($file) ? 'YES' : 'NO') . "\n";
echo "size: " . (filesize($file)) . " bytes\n";
echo "md5: " . (md5_file($file)) . "\n";
echo "last modified: " . date('Y-m-d H:i:s', filemtime($file)) . "\n";
$c = file_get_contents($file);
echo "contains students/lookup: " . (strpos($c, 'students/lookup') !== false ? 'YES' : 'NO') . "\n";
echo "contains exam_fee_waivers: " . (strpos($c, 'exam_fee_waivers') !== false ? 'YES' : 'NO') . "\n";
echo "contains will_pay_within: " . (strpos($c, 'will_pay_within') !== false ? 'YES' : 'NO') . "\n";
echo "local md5 should be: 511A5EDD44FE54E8E366161F9A9F2967 (15015 bytes)\n";
