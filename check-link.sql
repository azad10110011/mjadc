USE mjadc_db;
SELECT DISTINCT student_group FROM students LIMIT 6;
SELECT name, `group` FROM subjects WHERE `group` IN ('Science','Business Studies','Humanities','General') LIMIT 20;
