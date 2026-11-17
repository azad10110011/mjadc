$r = Invoke-WebRequest "https://www.mjadc.ac.bd/student/login/" -UseBasicParsing -TimeoutSec 30
"login page status: " + $r.StatusCode
$chunks = [regex]::Matches($r.Content, '/_next/static/chunks/[^"]+\.js') | ForEach-Object { $_.Value } | Select-Object -Unique
"chunks: " + $chunks.Count
foreach ($c in $chunks) {
  try {
    $js = Invoke-WebRequest ("https://www.mjadc.ac.bd" + $c) -UseBasicParsing -TimeoutSec 20
    if ($js.Content -match 'localhost/mjadc-api') { "STALE: $c has localhost" }
    elseif ($js.Content -match 'www\.mjadc\.ac\.bd/mjadc-api') { "OK: $c has prod API URL" }
  } catch { "chunk fetch fail: $c" }
}
# check homepage hero parsing fix (objects {path:...}) present in any chunk
$homeChunks = [regex]::Matches((Invoke-WebRequest "https://www.mjadc.ac.bd/" -UseBasicParsing -TimeoutSec 30).Content, '/_next/static/chunks/[^"]+\.js') | ForEach-Object { $_.Value } | Select-Object -Unique
foreach ($c in $homeChunks) {
  try {
    $js = Invoke-WebRequest ("https://www.mjadc.ac.bd" + $c) -UseBasicParsing -TimeoutSec 20
    if ($js.Content -match 'setting_value') {
      if ($js.Content -match 'in item') { "HERO PARSE FIX PRESENT in $c" }
      else { "HERO PARSE FIX MISSING in $c" }
    }
  } catch {}
}
