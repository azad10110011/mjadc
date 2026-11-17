// Diagnose: log in as rabbi@gmail.com on LIVE, then trace what the app does
// when the Administration user opens Exam Fee Collection.
// Steps: login -> whoami (users/auth endpoints) -> replicate frontend logic.
const base = 'https://www.mjadc.ac.bd/mjadc-api/api';

async function api(method, path, data, token) {
  const res = await fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch {}
  return { status: res.status, json, text: text.slice(0, 300) };
}

(async () => {
  const login = await api('POST', '/MAKARabbi/Rokon', { email: 'rabbi@gmail.com', password: '12345678' });
  console.log('LOGIN status:', login.status);
  const token = login.json?.data?.token;
  const user = login.json?.data?.user;
  console.log('user:', JSON.stringify(user));
  if (!token) { console.log('login failed:', login.text); return; }

  // What roles does the backend think this user has?
  const rolesProbe = await api('GET', '/admin/exams?year=2026', null, token);
  console.log('GET /admin/exams ->', rolesProbe.status, rolesProbe.text?.slice(0, 150));

  const lookup = await api('GET', '/admin/students/lookup?id=271009', null, token);
  console.log('GET /admin/students/lookup ->', lookup.status, lookup.text?.slice(0, 200));

  const report = await api('POST', '/admin/exam-fees/report', { year: 2026 }, token);
  console.log('POST /admin/exam-fees/report ->', report.status, report.text?.slice(0, 200));

  const status = await api('POST', '/admin/exam-fees/status', { year: 2026, exam_name: 'Pre-Test' }, token);
  console.log('POST /admin/exam-fees/status ->', status.status, status.text?.slice(0, 200));
})();
