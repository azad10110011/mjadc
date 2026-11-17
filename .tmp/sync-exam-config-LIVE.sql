-- =====================================================================
-- LIVE SYNC: Exam Paper Selection (exam_subject_config) + Exam Routine (exam_routines)
-- Auto-generated from local mjadc_db on 2026-11-11T11:47:20.625Z
-- Config rows: 72, Routine rows: 10
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
INSERT INTO exam_subject_config (exam_id, subject_id, paper_selection, selected_paper_id, calculation_mode) VALUES
(1, 44, 'single', 3, 'separate'),
(1, 46, 'single', 7, 'separate'),
(1, 48, 'single', NULL, 'separate'),
(1, 51, 'single', 13, 'separate'),
(1, 52, 'single', 15, 'separate'),
(1, 54, 'single', 19, 'separate'),
(1, 56, 'single', 23, 'separate'),
(1, 57, 'single', 25, 'separate'),
(1, 58, 'single', 27, 'separate'),
(1, 59, 'single', 29, 'separate'),
(1, 60, 'single', 31, 'separate'),
(1, 61, 'single', 33, 'separate'),
(1, 64, 'single', 39, 'separate'),
(1, 65, 'single', 41, 'separate'),
(1, 66, 'single', 43, 'separate'),
(1, 67, 'single', 45, 'separate'),
(1, 68, 'single', 47, 'separate'),
(1, 69, 'single', 49, 'separate'),
(1, 70, 'single', 51, 'separate'),
(1, 80, 'single', 53, 'separate'),
(1, 104, 'single', 58, 'separate'),
(1, 105, 'single', 56, 'separate'),
(1, 106, 'single', 60, 'separate'),
(1, 107, 'single', 62, 'separate'),
(2, 44, 'single', 4, 'separate'),
(2, 46, 'single', 8, 'separate'),
(2, 48, 'single', NULL, 'separate'),
(2, 51, 'single', 14, 'separate'),
(2, 52, 'single', 16, 'separate'),
(2, 54, 'single', 20, 'separate'),
(2, 56, 'single', 24, 'separate'),
(2, 57, 'single', 26, 'separate'),
(2, 58, 'single', 28, 'separate'),
(2, 59, 'single', 30, 'separate'),
(2, 60, 'single', 32, 'separate'),
(2, 61, 'single', 34, 'separate'),
(2, 64, 'single', 40, 'separate'),
(2, 65, 'single', 42, 'separate'),
(2, 66, 'single', 44, 'separate'),
(2, 67, 'single', 46, 'separate'),
(2, 68, 'single', 48, 'separate'),
(2, 69, 'single', 50, 'separate'),
(2, 70, 'single', 52, 'separate'),
(2, 80, 'single', 54, 'separate'),
(2, 104, 'single', 59, 'separate'),
(2, 105, 'single', 57, 'separate'),
(2, 106, 'single', 61, 'separate'),
(2, 107, 'single', 63, 'separate'),
(3, 44, 'single', 3, 'separate'),
(3, 46, 'single', 7, 'separate'),
(3, 48, 'single', NULL, 'separate'),
(3, 51, 'single', 13, 'separate'),
(3, 52, 'single', 15, 'separate'),
(3, 54, 'single', 19, 'separate'),
(3, 56, 'single', 23, 'separate'),
(3, 57, 'single', 25, 'separate'),
(3, 58, 'single', 27, 'separate'),
(3, 59, 'single', 29, 'separate'),
(3, 60, 'single', 31, 'separate'),
(3, 61, 'single', 33, 'separate'),
(3, 64, 'single', 39, 'separate'),
(3, 65, 'single', 41, 'separate'),
(3, 66, 'single', 43, 'separate'),
(3, 67, 'single', 45, 'separate'),
(3, 68, 'single', 47, 'separate'),
(3, 69, 'single', 49, 'separate'),
(3, 70, 'single', 51, 'separate'),
(3, 80, 'single', 53, 'separate'),
(3, 104, 'single', 58, 'separate'),
(3, 105, 'single', 56, 'separate'),
(3, 106, 'single', 60, 'separate'),
(3, 107, 'single', 62, 'separate');

INSERT INTO exam_routines (year, class, exam_name, exam_date, subjects) VALUES
(2026, '12th', 'Pre-Test', '2026-11-17', '["Bangla"]'),
(2026, '12th', 'Pre-Test', '2026-11-19', '["English"]'),
(2026, '12th', 'Pre-Test', '2026-11-22', '["Information and Communication Technology"]'),
(2026, '12th', 'Pre-Test', '2026-11-23', '["Social Work","Sociology","Accounting"]'),
(2026, '12th', 'Pre-Test', '2026-11-24', '["Civics and Good Governance","Business Organization and Management","Physics"]'),
(2026, '12th', 'Pre-Test', '2026-11-25', '["Agriculture Studies","Home Science"]'),
(2026, '12th', 'Pre-Test', '2026-11-26', '["Chemistry","History","Islamic History and Culture"]'),
(2026, '12th', 'Pre-Test', '2026-11-29', '["Geography","Higher Mathematics","Finance, Banking and Insurance"]'),
(2026, '12th', 'Pre-Test', '2026-11-30', '["Economics","Production Management and Marketing"]'),
(2026, '12th', 'Pre-Test', '2026-12-01', '["Psychology","Islamic Studies","Logic","Statistics","Biology"]');

-- Verification
SELECT COUNT(*) AS config_rows_loaded FROM exam_subject_config;
SELECT COUNT(*) AS routine_rows_loaded FROM exam_routines;
SELECT exam_name, COUNT(*) AS dates FROM exam_routines GROUP BY exam_name;
