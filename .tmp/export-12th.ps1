# Export local 12th students + linked users to JSON for the live import script.
$out = "D:\opencode 09062026\frontend\.tmp\students_12th_export.json"
$students = & "C:\xampp\mysql\bin\mysql.exe" -u root mjadc_db --default-character-set=utf8mb4 --batch --raw -e `
  "SELECT id, user_id, student_id, registration_no, name, name_bn, father_name, father_name_bn, mother_name, mother_name_bn, date_of_birth, blood_group, class, section, joining_year, academic_session, class_roll, student_type, optional_subject, mobile, parent_mobile, whatsapp, email, gender, present_address, permanent_address, student_group, compulsory_subjects, selective_subjects, photo_path, custom_fields FROM students WHERE class='12th';"
$users = & "C:\xampp\mysql\bin\mysql.exe" -u root mjadc_db --default-character-set=utf8mb4 --batch --raw -e `
  "SELECT u.id, u.name, u.email, u.password_hash, u.gender, u.date_of_birth, u.default_role, u.status FROM users u JOIN students s ON u.id=s.user_id WHERE s.class='12th';"

function Parse-Tsv($lines) {
  $lines | Where-Object { $_ -ne $null -and $_ -ne '' } | ForEach-Object {
    $parts = $_ -split "`t"
    $obj = @{}
    for ($i = 0; $i -lt $cols.Count; $i++) {
      $v = if ($i -lt $parts.Count) { $parts[$i] } else { '' }
      if ($v -eq 'NULL') { $v = '' }
      $obj[$cols[$i]] = $v
    }
    , $obj
  }
}

$stCols = "id user_id student_id registration_no name name_bn father_name father_name_bn mother_name mother_name_bn date_of_birth blood_group class section joining_year academic_session class_roll student_type optional_subject mobile parent_mobile whatsapp email gender present_address permanent_address student_group compulsory_subjects selective_subjects photo_path custom_fields" -split ' '
$usCols = "id name email password_hash gender date_of_birth default_role status" -split ' '

$stLines = $students | Select-Object -Skip 1
$usLines = $users | Select-Object -Skip 1

$json = @{
  students = @($stLines | ForEach-Object {
      $p = $_ -split "`t"
      $o = [ordered]@{}
      for ($i = 0; $i -lt $stCols.Count; $i++) { $o[$stCols[$i]] = if ($p[$i] -eq 'NULL') { '' } else { $p[$i] } }
      $o
    })
  users    = @($usLines | ForEach-Object {
      $p = $_ -split "`t"
      $o = [ordered]@{}
      for ($i = 0; $i -lt $usCols.Count; $i++) { $o[$usCols[$i]] = if ($p[$i] -eq 'NULL') { '' } else { $p[$i] } }
      $o
    })
} | ConvertTo-Json -Depth 3 -Compress

Set-Content -Path $out -Value $json -Encoding UTF8
$size = (Get-Item $out).Length
"Wrote $out ($size bytes)"
