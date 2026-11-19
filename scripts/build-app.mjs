// Build the Android apps' web files (Session 116). Two apps come from this code:
//   staff   → "MJADC"          (admin, principal, administration, exam controller, teacher, staff)
//   student → "MJADC Student"  (students)
//
//   npm run build:app                      → both apps, LIVE API
//   npm run build:app -- --kind=student    → one app
//   npm run build:app -- --local [--api-host=http://host:port] [--to=<dir>]
//                                          → local XAMPP API, copied to <dir> (testing only)
//
// For each app:
// 1. next build with NEXT_PUBLIC_APP_MODE=1 + NEXT_PUBLIC_APP_KIND → out-app/  (website out/ is never touched)
// 2. refuse to continue if a live build still points at localhost
// 3. copy into the Android flavor: ../mobile/android/app/src/<kind>/assets/public
//    (start page index.html jumps straight to the app login /app/)
// Then build the APKs: cd ../mobile/android && gradlew assembleStaffDebug assembleStudentDebug
// Do NOT run "npx cap sync" — it would put a copy back into src/main/assets/public for both apps.

import { spawnSync } from 'node:child_process'
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=')
const local = process.argv.includes('--local')
const LOCAL_HOST = (arg('api-host') || 'http://localhost').replace(/\/+$/, '')
const LIVE = 'https://www.mjadc.ac.bd'
const kindArg = arg('kind') || 'all'
const kinds = kindArg === 'all' ? ['staff', 'student'] : [kindArg]
if (!kinds.every((k) => k === 'staff' || k === 'student')) {
  console.error('✖ --kind must be staff, student or all')
  process.exit(1)
}
const testTo = arg('to')
if (local && !testTo) {
  console.error('✖ A --local build must not go into the real app. Add --to=<test folder>.')
  process.exit(1)
}
const androidApp = resolve(root, '..', 'mobile', 'android', 'app', 'src')
const NAMES = { staff: 'MJADC', student: 'MJADC Student' }

// leftovers of an old "cap sync" would be packed into BOTH apps
rmSync(join(androidApp, 'main', 'assets', 'public'), { recursive: true, force: true })

for (const kind of kinds) {
  // Explicit values always win over .env.local (Next never overrides variables already set).
  const env = {
    ...process.env,
    NEXT_PUBLIC_APP_MODE: '1',
    NEXT_PUBLIC_APP_KIND: kind,
    NEXT_PUBLIC_API_URL: local ? `${LOCAL_HOST}/mjadc-api/api` : `${LIVE}/mjadc-api/api`,
    NEXT_PUBLIC_UPLOAD_URL: local ? `${LOCAL_HOST}/mjadc-api` : `${LIVE}/mjadc-api`,
    NEXT_PUBLIC_SITE_URL: LIVE, // QR codes always point at the public website
  }

  console.log(`\n▶ Building "${NAMES[kind]}" (${kind}) web files — ${local ? 'LOCAL test API' : 'LIVE API'}…\n`)
  const r = spawnSync('npx next build', { cwd: root, env, stdio: 'inherit', shell: true })
  if (r.status !== 0) process.exit(r.status ?? 1)

  const outDir = join(root, 'out-app')
  if (!existsSync(join(outDir, 'app', 'index.html'))) {
    console.error('✖ out-app/app/index.html is missing — the export did not produce the app login.')
    process.exit(1)
  }

  if (!local) {
    const bad = []
    const walk = (d) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(js|html|txt)$/.test(f) && readFileSync(p, 'utf8').includes('localhost/mjadc-api')) bad.push(p)
      }
    }
    walk(outDir)
    if (bad.length) {
      console.error(`✖ ${bad.length} file(s) still point at localhost/mjadc-api — not copying. First: ${bad[0]}`)
      process.exit(1)
    }
  }

  const dest = testTo ? resolve(testTo) : join(androidApp, kind, 'assets', 'public')
  rmSync(dest, { recursive: true, force: true })
  cpSync(outDir, dest, { recursive: true })
  // The app never shows the public homepage: its start page jumps straight to the login.
  writeFileSync(join(dest, 'index.html'), `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${NAMES[kind]}</title><script>location.replace('/app/')</script></head>
<body style="background:#1e3a8a"></body></html>
`)
  console.log(`\n✔ "${NAMES[kind]}" web files ready in ${dest}\n`)
}
if (!testTo) console.log('Next: cd ../mobile/android && gradlew assembleStaffDebug assembleStudentDebug\n')
