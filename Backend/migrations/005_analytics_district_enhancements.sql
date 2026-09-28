-- Additive migration 005: Analytics, District, and Index Enhancements
-- 1) Add district column to student_profiles_v2 if not present
-- 2) Update institutions district for existing JSS Institute
-- 3) Ensure indexes on applications for high-performance aggregation

SET @sp_district_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'student_profiles_v2' AND COLUMN_NAME = 'district'
);
SET @add_sp_district := IF(
  @sp_district_exists = 0,
  'ALTER TABLE student_profiles_v2 ADD COLUMN district VARCHAR(100) NULL AFTER state',
  'SELECT 1'
);
PREPARE add_sp_district_stmt FROM @add_sp_district;
EXECUTE add_sp_district_stmt;
DEALLOCATE PREPARE add_sp_district_stmt;

-- Update JSS Institute to Mysuru district if null
UPDATE institutions SET district = 'Mysuru', state = 'Karnataka' WHERE (name LIKE '%JSS%' OR code = 'jssit0011') AND (district IS NULL OR district = '');

-- Add helpful indexes if not already existing
SET @idx_apps_created := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'applications' AND INDEX_NAME = 'idx_applications_created_status'
);
SET @add_idx_created := IF(
  @idx_apps_created = 0,
  'ALTER TABLE applications ADD INDEX idx_applications_created_status (created_at, status)',
  'SELECT 1'
);
PREPARE add_idx_created_stmt FROM @add_idx_created;
EXECUTE add_idx_created_stmt;
DEALLOCATE PREPARE add_idx_created_stmt;
