-- Convert 11th student IDs from old format (26 11 sssss) to new format:
--   YY(batch) + group_code + 3-digit roll, HSC batch 2028, roll starts at 1 per group
-- Roll order = current insertion order (students.id) within each group.
USE mjadc_db;

START TRANSACTION;

-- 0. Safety backup of affected rows
CREATE TABLE IF NOT EXISTS students_11th_id_backup AS
  SELECT id, student_id, class_roll, student_group FROM students WHERE class='11th';
CREATE TABLE IF NOT EXISTS users_11th_id_backup AS
  SELECT u.id, u.email FROM users u JOIN students s ON u.id=s.user_id WHERE s.class='11th';

-- 1. Assign class_roll 1..n per group, ordered by insertion (students.id)
SET @grp := '', @rn := 0;
UPDATE students s
JOIN (
  SELECT id, student_group,
         (@rn := IF(@grp = student_group, @rn + 1, 1)) AS new_roll,
         (@grp := student_group) AS grp_dummy
  FROM students WHERE class='11th'
  ORDER BY student_group, id
) t ON s.id = t.id
SET s.class_roll = t.new_roll;

-- 2. New student_id = 28 + group_code + LPAD(roll,3,'0')
UPDATE students
SET student_id = CONCAT('28',
    CASE student_group WHEN 'Science' THEN '1' WHEN 'Business Studies' THEN '2' ELSE '3' END,
    LPAD(class_roll, 3, '0'))
WHERE class='11th';

-- 3. Sync login emails (they hold the old student ID)
UPDATE users u
JOIN students s ON u.id = s.user_id
SET u.email = s.student_id
WHERE s.class='11th';

-- 4. Report
SELECT student_group, COUNT(*) cnt, MIN(student_id) first_id, MAX(student_id) last_id
FROM students WHERE class='11th' GROUP BY student_group;
SELECT student_id, class_roll, name FROM students WHERE class='11th' ORDER BY student_group, class_roll LIMIT 8;

-- Review the output; then either:
--   COMMIT;
-- or  ROLLBACK;
