-- Additive migration: legacy scholarships remain the catalog of record.
CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('STUDENT','INSTITUTION','ADMIN') NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  phone VARCHAR(25) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_users_role_active (role, is_active)
);

CREATE TABLE IF NOT EXISTS institutions (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL UNIQUE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(60) NOT NULL UNIQUE,
  state VARCHAR(100) NULL,
  address TEXT NULL,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_profiles_v2 (
  user_id CHAR(36) PRIMARY KEY,
  date_of_birth DATE NULL,
  gender VARCHAR(30) NULL,
  community VARCHAR(100) NULL,
  religion VARCHAR(100) NULL,
  annual_income DECIMAL(12,2) NULL,
  citizenship VARCHAR(80) NULL,
  disability BOOLEAN NOT NULL DEFAULT FALSE,
  sports BOOLEAN NOT NULL DEFAULT FALSE,
  ex_servicemen BOOLEAN NOT NULL DEFAULT FALSE,
  state VARCHAR(100) NULL,
  institution_id CHAR(36) NULL,
  profile_completion TINYINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS education (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  qualification VARCHAR(150) NOT NULL,
  institution_name VARCHAR(255) NULL,
  course VARCHAR(200) NULL,
  percentage DECIMAL(5,2) NULL,
  graduation_year SMALLINT NULL,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_education_student_current (student_id, is_current)
);

CREATE TABLE IF NOT EXISTS saved_scholarships (
  student_id CHAR(36) NOT NULL,
  scholarship_id INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (student_id, scholarship_id),
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  public_id VARCHAR(30) NOT NULL UNIQUE,
  scholarship_id INT NOT NULL,
  student_id CHAR(36) NOT NULL,
  institution_id CHAR(36) NULL,
  status ENUM('DRAFT','SUBMITTED','INSTITUTION_VERIFICATION','DOCUMENT_VERIFICATION','CORRECTION_REQUIRED','UNDER_REVIEW','APPROVED','REJECTED') NOT NULL DEFAULT 'DRAFT',
  form_data JSON NULL,
  submitted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_application_student_scholarship (student_id, scholarship_id),
  INDEX idx_applications_institution_status (institution_id, status),
  INDEX idx_applications_student_status (student_id, status),
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id),
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (institution_id) REFERENCES institutions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS documents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  application_id BIGINT NULL,
  document_type VARCHAR(100) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  storage_name VARCHAR(255) NOT NULL UNIQUE,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT UNSIGNED NOT NULL,
  status ENUM('UPLOADED','PENDING','VERIFIED','REJECTED','REUPLOAD_REQUIRED') NOT NULL DEFAULT 'UPLOADED',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id),
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_documents_application_status (application_id, status)
);

CREATE TABLE IF NOT EXISTS document_verifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  document_id BIGINT NOT NULL,
  verifier_id CHAR(36) NOT NULL,
  decision ENUM('VERIFIED','REJECTED','REUPLOAD_REQUIRED') NOT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  FOREIGN KEY (verifier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS institution_verifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT NOT NULL,
  institution_id CHAR(36) NOT NULL,
  verifier_id CHAR(36) NOT NULL,
  decision ENUM('VERIFIED','REJECTED','CORRECTION_REQUIRED') NOT NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES institutions(id),
  FOREIGN KEY (verifier_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS application_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id BIGINT NOT NULL,
  status VARCHAR(40) NOT NULL,
  changed_by CHAR(36) NULL,
  remarks TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS recommendations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id CHAR(36) NOT NULL,
  scholarship_id INT NOT NULL,
  ml_eligible BOOLEAN NULL,
  reasons JSON NOT NULL,
  model_version VARCHAR(100) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE,
  INDEX idx_recommendations_student (student_id, created_at)
);

CREATE TABLE IF NOT EXISTS notifications (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  application_id BIGINT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (application_id) REFERENCES applications(id) ON DELETE CASCADE,
  INDEX idx_notifications_user_read (user_id, is_read, created_at),
  UNIQUE KEY uq_notifications_application_event (user_id, type, application_id)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  actor_id CHAR(36) NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(80) NULL,
  metadata JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_audit_entity (entity_type, entity_id)
);
