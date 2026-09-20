SET @notification_application_column_exists := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'application_id'
);
SET @add_notification_application_column := IF(
  @notification_application_column_exists = 0,
  'ALTER TABLE notifications ADD COLUMN application_id BIGINT NULL',
  'SELECT 1'
);
PREPARE add_notification_application_column FROM @add_notification_application;
EXECUTE add_notification_application_column;
DEALLOCATE PREPARE add_notification_application_column;

SET @notification_application_fk_exists := (
  SELECT COUNT(*) FROM information_schema.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
    AND COLUMN_NAME = 'application_id' AND REFERENCED_TABLE_NAME = 'applications'
);
SET @add_notification_application_fk := IF(
  @notification_application_fk_exists = 0,
  'ALTER TABLE notifications ADD CONSTRAINT fk_notifications_application FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE',
  'SELECT 1'
);
PREPARE add_notification_application_fk FROM @add_notification_application_fk;
EXECUTE add_notification_application_fk;
DEALLOCATE PREPARE add_notification_application_fk;

SET @notification_event_index_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications'
    AND INDEX_NAME = 'uq_notifications_application_event'
);
SET @add_notification_event_index := IF(
  @notification_event_index_exists = 0,
  'ALTER TABLE notifications ADD UNIQUE KEY uq_notifications_application_event (user_id, type, application_id)',
  'SELECT 1'
);
PREPARE add_notification_event_index FROM @add_notification_event_index;
EXECUTE add_notification_event_index;
DEALLOCATE PREPARE add_notification_event_index;
