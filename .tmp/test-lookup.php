<?php
// Simulate a browser call to the lookup endpoint with a real token.
// Get token by logging in, then call lookup.
$base = 'http://localhost/mjadc-api/api';

function api(string $method, string $url, array $data = [], array $headers = []): array {
    $ch = curl_init($url);
    $hdrs = ['Content-Type: application/json'];
    foreach ($headers as $k => $v) $hdrs[] = "$k: $v";
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $hdrs,
        CURLOPT_POSTFIELDS => $method === 'GET' ? null : json_encode($data),
    ]);
    $res = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, $res];
}

[$code, $body] = api('POST', "$base/MAKARabbi/Rokon", ['email' => 'azad10110011@gmail.com', 'password' => 'YOUR_ADMIN_PASSWORD_HERE']);
echo "login: $code\n";
$j = json_decode($body, true);
$token = $j['data']['token'] ?? null;
if (!$token) { echo "no token: $body\n"; exit(1); }

[$code2, $body2] = api('GET', "$base/admin/students/lookup?id=271009", [], ['Authorization' => "Bearer $token"]);
echo "lookup: $code2\n$body2\n";
