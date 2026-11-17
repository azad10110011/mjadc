USE mjadc_db;
SELECT COUNT(*) AS total_11th FROM students WHERE class='11th';
SELECT student_id, name, student_group, roll, batch, created_at FROM students WHERE class='11th' ORDER BY student_group, id LIMIT 40;
SELECT DISTINCT student_group FROM students WHERE class='11th';
