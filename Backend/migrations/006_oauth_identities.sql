-- Additive: Google identity linking and optional local password (OAuth-only accounts).
-- Existing users, roles, and password hashes are preserved.

CREATE TABLE IF NOT EXISTS oauth_identities (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  provider VARCHAR(40) NOT NULL,
  provider_sub VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_oauth_provider_sub (provider, provider_sub),
  INDEX idx_oauth_identities_user (user_id),
  INDEX idx_oauth_identities_email (email),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SET @password_nullable := (
  SELECT IS_NULLABLE FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'password_hash'
);
SET @alter_password := IF(
  @password_nullable = 'NO',
  'ALTER TABLE users MODIFY COLUMN password_hash VARCHAR(255) NULL',
  'SELECT 1'
);
PREPARE alter_password_stmt FROM @alter_password;
EXECUTE alter_password_stmt;
DEALLOCATE PREPARE alter_password_stmt;
