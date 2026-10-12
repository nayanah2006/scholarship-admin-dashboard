-- Additive migration: webhook delivery observability.
-- Existing migrations 004/005/006 and all prior data are preserved.
-- MySQL 8.4 has `ADD COLUMN IF NOT EXISTS`; on any older server the block is a
-- no-op guarded by information_schema, so this file is safe to re-run.

SET @db := DATABASE();

SET @has_response_status := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'webhook_events' AND COLUMN_NAME = 'response_status'
);
SET @ddl := IF(@has_response_status = 0,
  'ALTER TABLE webhook_events ADD COLUMN response_status INT NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_last_error := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'webhook_events' AND COLUMN_NAME = 'last_error'
);
SET @ddl := IF(@has_last_error = 0,
  'ALTER TABLE webhook_events ADD COLUMN last_error VARCHAR(500) NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @has_delivered_at := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'webhook_events' AND COLUMN_NAME = 'delivered_at'
);
SET @ddl := IF(@has_delivered_at = 0,
  'ALTER TABLE webhook_events ADD COLUMN delivered_at TIMESTAMP NULL',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Supports the admin delivery list (newest first per status) without touching
-- the existing idx_webhook_status / idx_webhook_created indexes.
SET @has_recent_idx := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'webhook_events' AND INDEX_NAME = 'idx_webhook_status_created'
);
SET @ddl := IF(@has_recent_idx = 0,
  'ALTER TABLE webhook_events ADD INDEX idx_webhook_status_created (status, created_at)',
  'SELECT 1');
PREPARE stmt FROM @ddl; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Widen the status column so terminal/dead-letter states are explicit.
ALTER TABLE webhook_events MODIFY COLUMN status VARCHAR(20) NOT NULL DEFAULT 'pending';
