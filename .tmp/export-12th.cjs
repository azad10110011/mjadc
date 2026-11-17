// Export local 12th students + linked users to JSON for the live import script.
// Usage: node export-12th.cjs
// Output: students_12th_export.json (same folder)
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MYSQL = 'C:/xampp/mysql/bin/mysql.exe';
const DB = 'mjadc_db';

function query(sql) {
  const out = execFileSync(MYSQL, ['--default-character-set=utf8mb4', '-u', 'root', DB, '--batch', '--raw', '-e', sql], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
  const lines = out.split('\n').filter((l) => l.length > 0);
  const cols = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const parts = line.split('\t');
    const obj = {};
    cols.forEach((c, i) => { obj[c] = parts[i] === 'NULL' ? '' : (parts[i] ?? ''); });
    return obj;
  });
}

const students = query(`SELECT id, user_id, student_id, registration_no, name, name_bn, father_name, father_name_bn, mother_name, mother_name_bn, date_of_birth, blood_group, class, section, joining_year, academic_session, class_roll, student_type, optional_subject, mobile, parent_mobile, whatsapp, email, gender, present_address, permanent_address, student_group, compulsory_subjects, selective_subjects, photo_path, custom_fields FROM students WHERE class='12th'`);
const users = query(`SELECT u.id, u.name, u.email, u.password_hash, u.gender, u.date_of_birth, u.default_role, u.status FROM users u JOIN students s ON u.id=s.user_id WHERE s.class='12th'`);

const payload = { students, users };
const outPath = path.join(__dirname, 'students_12th_export.json');
fs.writeFileSync(outPath, JSON.stringify(payload));
console.log(`Wrote ${outPath} (${fs.statSync(outPath).size} bytes), students=${students.length}, users=${users.length}`);

// verify it round-trips
const check = JSON.parse(fs.readFileSync(outPath, 'utf8'));
console.log(`Round-trip OK: students=${check.students.length}, users=${check.users.length}`);
