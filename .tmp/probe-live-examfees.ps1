$base = "https://www.mjadc.ac.bd/mjadc-api/api"
$body = @{ email = "rabbi@gmail.com"; password = "12345678" } | ConvertTo-Json
$r = Invoke-WebRequest "$base/auth/login" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing -TimeoutSec 30
$j = $r.Content | ConvertFrom-Json
$tok = $j.data.token
Write-Output "login OK (roles: $($j.data.user.roles -join ','))"
$h = @{ Authorization = "Bearer $tok" }

function Probe($name, $method, $path, $payload) {
  try {
    if ($method -eq 'GET') {
      $l = Invoke-WebRequest "$base$path" -Headers $h -UseBasicParsing -TimeoutSec 20
    } else {
      $l = Invoke-WebRequest "$base$path" -Method Post -Body ($payload | ConvertTo-Json) -Headers $h -ContentType "application/json" -UseBasicParsing -TimeoutSec 20
    }
    $c = $l.Content
    if ($c.Length -gt 160) { $c = $c.Substring(0,160) }
    Write-Output "$name : $($l.StatusCode) $c"
  } catch {
    $resp = $_.Exception.Response
    if ($resp) {
      $sr = New-Object IO.StreamReader($resp.GetResponseStream())
      $t = $sr.ReadToEnd()
      if ($t.Length -gt 160) { $t = $t.Substring(0,160) }
      Write-Output "$name : $([int]$resp.StatusCode) $t"
    } else {
      Write-Output "$name : ERROR $($_.Exception.Message)"
    }
  }
}

Probe "lookup" "GET" "/admin/students/lookup?id=271009" $null
Probe "exams"  "GET" "/admin/exams?year=2026" $null
Probe "report" "POST" "/admin/exam-fees/report" @{ year = 2026 }
Probe "status" "POST" "/admin/exam-fees/status" @{ year = 2026; exam_name = "Pre-Test" }
Probe "amount" "GET" "/admin/exam-fees/amount?exam_name=Pre-Test" $null
