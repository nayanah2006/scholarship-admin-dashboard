-- Idempotent migration: add tables for OAuth state tracking, webhooks, and chat sessions.
-- No existing tables or columns are modified or removed.

CREATE TABLE IF NOT EXISTS webhook_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  event_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(80) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  payload JSON NOT NULL,
  retries INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_webhook_event_id (event_id),
  INDEX idx_webhook_status (status),
  INDEX idx_webhook_created (created_at)
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  role VARCHAR(20) NOT NULL,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chat_user (user_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id INT NOT NULL,
  role VARCHAR(20) NOT NULL,
  content TEXT NOT NULL,
  sources JSON DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE,
  INDEX idx_chat_session (session_id)
);

CREATE TABLE IF NOT EXISTS oauth_state (
  state VARCHAR(128) NOT NULL PRIMARY KEY,
  email VARCHAR(255),
  purpose VARCHAR(20) NOT NULL DEFAULT 'google',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_oauth_state_created (created_at)
);
