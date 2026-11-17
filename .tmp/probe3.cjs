const base = 'https://www.mjadc.ac.bd/mjadc-api/api';
async function api(method, path, data, token) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  return { status: res.status, text: text.slice(0, 220) };
}
(async () => {
  const login = await api('POST', '/auth/login', { email: 'rabbi@gmail.com', password: '12345678' });
  let tok = null; let roleInfo = '';
  try { const j = JSON.parse(login.text); tok = j.data.token; roleInfo = (j.data.user.roles || []).join(','); } catch {}
  console.log('login:', login.status, '[' + roleInfo + ']', tok ? 'token OK' : login.text);

  const r1 = await api('GET', '/admin/students/lookup?id=271009', null, tok);
  console.log('lookup  :', r1.status, r1.text);
  const r2 = await api('GET', '/admin/exams?year=2026', null, tok);
  console.log('exams   :', r2.status, r2.text.slice(0, 120));
  const r3 = await api('POST', '/admin/exam-fees/status', { year: 2026, exam_name: 'Pre-Test' }, tok);
  console.log('status  :', r3.status, r3.text.slice(0, 140));
  const r4 = await api('POST', '/admin/exam-fees/report', { year: 2026 }, tok);
  console.log('report  :', r4.status, r4.text.slice(0, 140));
})();
