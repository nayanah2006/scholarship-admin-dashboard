-- Additive, idempotent migration:
-- 1) Extend users.role ENUM with GOVERNMENT (restores the government-officer role).
-- 2) Add a nullable district column on institutions so application analytics can be
--    grouped at district level without touching existing rows.
-- Existing roles, users and institution rows are preserved.

SET @role_column_type := (
  SELECT COLUMN_TYPE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'role'
);
SET @alter_role := IF(
  @role_column_type IS NULL OR LOCATE('GOVERNMENT', @role_column_type) = 0,
  "ALTER TABLE users MODIFY COLUMN role ENUM('STUDENT','INSTITUTION','ADMIN','GOVERNMENT') NOT NULL",
  'SELECT 1'
);
PREPARE alter_role_stmt FROM @alter_role;
EXECUTE alter_role_stmt;
DEALLOCATE PREPARE alter_role_stmt;

SET @institution_district_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'institutions' AND COLUMN_NAME = 'district'
);
SET @add_institution_district := IF(
  @institution_district_exists = 0,
  'ALTER TABLE institutions ADD COLUMN district VARCHAR(100) NULL AFTER state',
  'SELECT 1'
);
PREPARE add_institution_district_stmt FROM @add_institution_district;
EXECUTE add_institution_district_stmt;
DEALLOCATE PREPARE add_institution_district_stmt;