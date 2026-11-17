// QA: verify exam-configured subjects + subject-enrolled students + group ordering
const BASE = 'http://localhost/mjadc-api/api'

async function login(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const j = await r.json()
  if (!j.data || !j.data.token) throw new Error('login failed for ' + email + ': ' + JSON.stringify(j).slice(0, 200))
  return j.data.token
}

async function get(token, path) {
  const r = await fetch(`${BASE}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const j = await r.json().catch(() => ({}))
  return { status: r.status, body: j }
}

function groupOrderOk(list) {
  const rank = { Science: 1, 'Business Studies': 2, Humanities: 3 }
  let last = 0
  for (const s of list) {
    const r = rank[s.student_group] || 4
    if (r < last) return false
    last = r
  }
  return true
}

(async () => {
  const admin = await login('admin@mjadc.ac.bd', process.argv[2] || '12345678')
  console.log('admin login OK')

  for (const [cls, exam] of [['12th', 'Pre-Test'], ['11th', 'Half Yearly'], ['12th', 'Not-Configured-Exam']]) {
    const cfg = await get(admin, `/admin/results/exam-subjects?year=2026&class=${cls}&exam_name=${encodeURIComponent(exam)}`)
    const items = cfg.body.data?.subjects || []
    console.log(`\n=== ${cls} / ${exam} (${cfg.status}) -> ${items.length} configured subjects`)
    if (!items.length) continue
    console.log('   ', items.slice(0, 3).map((i) => i.label).join(' | '), '...')

    for (const item of items) {
      const q = new URLSearchParams({
        year: '2026', class: cls, exam_name: exam,
        subject: item.subject_name,
        subject_id: String(item.subject_id),
        paper_name: item.paper_name || '',
      })
      const res = await get(admin, `/admin/results/upload-data?${q}`)
      const students = res.body.data?.students || []
      const parts = res.body.data?.part_configs || []
      const bad = students.filter((s) => {
        const comp = (s.student_group || '').toLowerCase()
        return false || comp === ''
      })
      const groups = [...new Set(students.map((s) => s.student_group))]
      const flag = students.length === 0 ? 'EMPTY!' : (groupOrderOk(students) ? 'order OK' : 'ORDER BAD')
      const key = res.body.data?.subject_key
      console.log(
        `  ${String(res.status).padEnd(3)} ${item.label.padEnd(48)} students=${String(students.length).padEnd(3)} parts=${parts.map((p) => p.part_name).join('/')} groups=[${groups.join(',')}] ${flag} key="${key}"`
      )
      if (students.length && !groupOrderOk(students)) console.log('     order:', students.map((s) => `${s.class_roll}:${s.student_group}`).join(' '))
    }
  }

  // Enrollment sanity: Physics-2 on 12th Pre-Test must be Science-only (10 students), not the whole class
  const q = new URLSearchParams({ year: '2026', class: '12th', exam_name: 'Pre-Test', subject: 'Physics', subject_id: '104', paper_name: 'Physics-2' })
  const phy = await get(admin, `/admin/results/upload-data?${q}`)
  const phyStudents = phy.body.data?.students || []
  console.log('\nPhysics-2 check: count =', phyStudents.length, 'groups =', [...new Set(phyStudents.map((s) => s.student_group))])
  console.log('first 12:', phyStudents.slice(0, 12).map((s) => `${s.class_roll}:${s.student_group}`).join(' '))

  // Exam controller (uses teacher endpoints)
  const ec = await login('azad10110011@gmail.com', process.argv[3] || '12345678')
  const ecCfg = await get(ec, `/teacher/results/exam-subjects?year=2026&class=12th&exam_name=Pre-Test`)
  console.log('\nexam-controller exam-subjects:', ecCfg.status, (ecCfg.body.data?.subjects || []).length, 'subjects')
  const ecLoad = await get(ec, `/teacher/results/load-students?year=2026&class=12th&exam_name=Pre-Test&subject=Accounting&subject_id=80&paper_name=Accounting-2`)
  const ecS = ecLoad.body.data?.students || []
  console.log('exam-controller load-students (Accounting-2):', ecLoad.status, 'count =', ecS.length, 'groups =', [...new Set(ecS.map((s) => s.student_group))], groupOrderOk(ecS) ? 'order OK' : 'ORDER BAD')
  console.log('  first 10:', ecS.slice(0, 10).map((s) => `${s.class_roll}:${s.student_group}`).join(' '))
  const comp = await get(ec, `/teacher/results/load-students?year=2026&class=12th&exam_name=Pre-Test&subject=Bangla&subject_id=44&paper_name=Bangla-2`)
  const compS = comp.body.data?.students || []
  console.log('exam-controller load-students (Bangla-2, compulsory):', comp.status, 'count =', compS.length, groupOrderOk(compS) ? 'order OK' : 'ORDER BAD')
  console.log('  first 12:', compS.slice(0, 12).map((s) => `${s.class_roll}:${s.student_group}`).join(' '))
})().catch((e) => { console.error('FAILED:', e.message); process.exit(1) })
