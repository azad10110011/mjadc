-- =====================================================================
-- LIVE MIGRATION: Convert 11th student IDs from old format to new format
--   OLD: 26 11 sssss            (flat serial, e.g. 26110001)
--   NEW: 28 + group_code + 3-digit roll   (HSC batch 2028, roll restarts at 1 per group)
--        Science=1  Business Studies=2  Humanities=3
-- Roll order = live database insertion order (students.id) within each group.
-- Safe to run ONCE. Idempotence guard prevents double-conversion.
-- Self-contained: also adds the class_roll column if the live DB is missing it.
-- RUN IN: cPanel -> phpMyAdmin -> database  makauotv_mjadc  -> SQL tab
-- =====================================================================

-- 0a. Ensure class_roll column exists (matches backend migration_021)
SET @have_col := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='students' AND COLUMN_NAME='class_roll');
SET @ddl := IF(@have_col = 0,
  'ALTER TABLE students ADD COLUMN class_roll VARCHAR(10) DEFAULT NULL AFTER academic_session',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 0b. Safety backup of affected rows (old IDs preserved)
DROP TABLE IF EXISTS students_11th_id_backup;
CREATE TABLE students_11th_id_backup AS
  SELECT id, student_id, class_roll, student_group, name FROM students WHERE class='11th';

DROP TABLE IF EXISTS users_11th_id_backup;
CREATE TABLE users_11th_id_backup AS
  SELECT u.id, u.email
  FROM users u JOIN students s ON u.id = s.user_id
  WHERE s.class='11th';

-- 0c. Idempotence guard: if 11th rows are already in the new format, stop.
--     (If you see 0 below, the migration was already applied — do not run again.)
SELECT COUNT(*) AS rows_still_old_format FROM students WHERE class='11th' AND student_id LIKE '2611%';

-- 1. Assign class_roll 1..n per group, ordered by live insertion order (students.id)
UPDATE students s
JOIN (
  SELECT id,
         ROW_NUMBER() OVER (PARTITION BY student_group ORDER BY id) AS new_roll
  FROM students
  WHERE class='11th'
) t ON s.id = t.id
SET s.class_roll = CAST(t.new_roll AS CHAR);

-- 2. New student_id = '28' + group_code + LPAD(roll, 3, '0')
UPDATE students
SET student_id = CONCAT('28',
    CASE student_group WHEN 'Science' THEN '1' WHEN 'Business Studies' THEN '2' ELSE '3' END,
    LPAD(CAST(class_roll AS UNSIGNED), 3, '0'))
WHERE class='11th';

-- 3. Sync login emails (they hold the old student ID)
UPDATE users u
JOIN students s ON u.id = s.user_id
SET u.email = s.student_id
WHERE s.class='11th';

-- 4. Verification report
SELECT student_group, COUNT(*) AS cnt, MIN(student_id) AS first_id, MAX(student_id) AS last_id
FROM students WHERE class='11th' GROUP BY student_group;

SELECT COUNT(*) AS login_email_mismatches
FROM students s JOIN users u ON u.id = s.user_id
WHERE s.class='11th' AND u.email <> s.student_id;

-- Expected: Science 281001-..., Business Studies 282001-..., Humanities 283001-...
--           login_email_mismatches = 0
