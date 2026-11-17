// Generate the live-sync SQL from the local mjadc_db data.
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MYSQL = 'C:/xampp/mysql/bin/mysql.exe';
const DB = 'mjadc_db';

function query(sql) {
  const out = execFileSync(MYSQL, ['--default-character-set=utf8mb4', '-u', 'root', DB, '--batch', '--raw', '-e', sql], { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' });
  const lines = out.split('\n').filter((l) => l.length > 0).map((l) => l.replace(/\r$/, ''));
  const cols = lines[0].split('\t').map((c) => c.replace(/\r$/, ''));
  return lines.slice(1).map((line) => {
    const parts = line.split('\t');
    const obj = {};
    cols.forEach((c, i) => { obj[c] = parts[i] === 'NULL' ? null : (parts[i] ?? null); });
    return obj;
  });
}

const cfg = query('SELECT exam_id, subject_id, paper_selection, selected_paper_id, calculation_mode FROM exam_subject_config ORDER BY exam_id, subject_id');
const routines = query('SELECT year, class, exam_name, exam_date, subjects FROM exam_routines ORDER BY year, class, exam_name, exam_date');

const esc = (v) => v === null ? 'NULL' : `'${String(v).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

const header = `-- =====================================================================
-- LIVE SYNC: Exam Paper Selection (exam_subject_config) + Exam Routine (exam_routines)
-- Auto-generated from local mjadc_db on ${new Date().toISOString()}
-- Config rows: ${cfg.length}, Routine rows: ${routines.length}
-- RUN IN: cPanel -> phpMyAdmin -> database makauotv_mjadc -> SQL tab
-- Full refresh: backs up live rows, then replaces all rows with local data.
-- =====================================================================

CREATE TABLE IF NOT EXISTS exam_subject_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  exam_id INT NOT NULL,
  subject_id INT NOT NULL,
  paper_selection VARCHAR(20) NOT NULL DEFAULT 'single',
  selected_paper_id INT DEFAULT NULL,
  calculation_mode VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_exam_subject (exam_id, subject_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS exam_routines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  year YEAR NOT NULL,
  class VARCHAR(50) NOT NULL,
  exam_name VARCHAR(100) NOT NULL,
  exam_date DATE NOT NULL,
  subjects TEXT NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_routine (year, class, exam_name, exam_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TABLE IF EXISTS exam_subject_config_backup;
CREATE TABLE exam_subject_config_backup AS SELECT * FROM exam_subject_config;
DROP TABLE IF EXISTS exam_routines_backup;
CREATE TABLE exam_routines_backup AS SELECT * FROM exam_routines;

TRUNCATE exam_subject_config;
TRUNCATE exam_routines;
`;

const cfgSql = cfg.length ? `INSERT INTO exam_subject_config (exam_id, subject_id, paper_selection, selected_paper_id, calculation_mode) VALUES\n${cfg.map(r => `(${r.exam_id}, ${r.subject_id}, ${esc(r.paper_selection)}, ${r.selected_paper_id === null ? 'NULL' : r.selected_paper_id}, ${r.calculation_mode === null ? 'NULL' : `'${r.calculation_mode}'`})`).join(',\n')};\n\n` : '-- no config rows\n';

const rouSql = routines.length ? `INSERT INTO exam_routines (year, class, exam_name, exam_date, subjects) VALUES\n${routines.map(r => `(${r.year}, ${esc(r.class)}, ${esc(r.exam_name)}, ${esc(r.exam_date)}, ${esc(r.subjects)})`).join(',\n')};\n\n` : '-- no routine rows\n';

const footer = `-- Verification
SELECT COUNT(*) AS config_rows_loaded FROM exam_subject_config;
SELECT COUNT(*) AS routine_rows_loaded FROM exam_routines;
SELECT exam_name, COUNT(*) AS dates FROM exam_routines GROUP BY exam_name;
`;

const out = header + cfgSql + rouSql + footer;
const outPath = path.join(__dirname, 'sync-exam-config-LIVE.sql');
fs.writeFileSync(outPath, out);
console.log(`Generated ${outPath} (${out.length} chars): ${cfg.length} config rows + ${routines.length} routine rows`);
