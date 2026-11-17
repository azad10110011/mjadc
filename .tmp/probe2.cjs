const base = 'https://www.mjadc.ac.bd/mjadc-api/api';
async function api(method, path, data, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 250) };
}
(async () => {
  const login = await api('POST', '/auth/login', { email: 'rabbi@gmail.com', password: '12345678' });
  let tok = null;
  try { tok = JSON.parse(login.text).data.token; } catch {}
  console.log('login:', login.status, tok ? 'token OK' : login.text);
  console.log('lookup:', JSON.stringify(await api('GET', '/admin/students/lookup?id=271009', null, tok)));
  console.log('exams :', JSON.stringify(await api('GET', '/admin/exams?year=2026', null, tok)));
  console.log('report:', JSON.stringify(await api('POST', '/admin/exam-fees/report', { year: 2026 }, tok)));
  console.log('status:', JSON.stringify(await api('POST', '/admin/exam-fees/status', { year: 2026, exam_name: 'Pre-Test' }, tok)));
})();
