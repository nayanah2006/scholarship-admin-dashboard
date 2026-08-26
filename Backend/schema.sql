CREATE DATABASE IF NOT EXISTS scholarship_admin;
USE scholarship_admin;

CREATE TABLE IF NOT EXISTS districts (
  district_name VARCHAR(100) NOT NULL,
  district_code VARCHAR(20) DEFAULT NULL,
  district_id VARCHAR(50) DEFAULT NULL,
  inst_count VARCHAR(50) DEFAULT '0',
  reg_count VARCHAR(50) DEFAULT '0',
  approved_count VARCHAR(50) DEFAULT '0',
  pending_count VARCHAR(50) DEFAULT '0',
  coverage INT DEFAULT 0,
  institution_count VARCHAR(50) DEFAULT '0',
  PRIMARY KEY (district_name)
);

CREATE TABLE IF NOT EXISTS district_categories (
  district_name VARCHAR(100) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  category_name VARCHAR(100) NOT NULL,
  category_sub VARCHAR(200) DEFAULT '',
  total_count INT DEFAULT 0,
  students VARCHAR(50) DEFAULT '0',
  approved VARCHAR(50) DEFAULT '0',
  rate VARCHAR(20) DEFAULT '0%',
  badge VARCHAR(20) DEFAULT '0%',
  badge_color VARCHAR(100) DEFAULT 'bg-slate-100 text-slate-600',
  category_order INT DEFAULT 0,
  PRIMARY KEY (district_name, category_id)
);

CREATE TABLE IF NOT EXISTS district_institutions (
  district_name VARCHAR(100) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  institution_id VARCHAR(50) NOT NULL,
  institution_name VARCHAR(200) NOT NULL,
  total VARCHAR(50) DEFAULT '0',
  applied VARCHAR(50) DEFAULT '0',
  pct VARCHAR(20) DEFAULT '0%',
  approved VARCHAR(50) DEFAULT '0',
  rejected VARCHAR(50) DEFAULT '0',
  pending VARCHAR(50) DEFAULT '0',
  disbursed VARCHAR(50) DEFAULT '₹0',
  PRIMARY KEY (district_name, category_id, institution_id)
);

CREATE TABLE IF NOT EXISTS reference_options (
  option_group VARCHAR(80) NOT NULL,
  option_value VARCHAR(100) NOT NULL,
  option_label VARCHAR(150) NOT NULL,
  display_order INT DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  PRIMARY KEY (option_group, option_value)
);

CREATE TABLE IF NOT EXISTS scholarships (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  provider VARCHAR(200) NOT NULL,
  scholarship_type VARCHAR(100) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  category VARCHAR(100) DEFAULT NULL,
  eligible_course VARCHAR(200) DEFAULT NULL,
  district_name VARCHAR(100) DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'inactive',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_scholarships_status_dates (status, start_date, end_date),
  INDEX idx_scholarships_filters (category, eligible_course, district_name)
);

CREATE TABLE IF NOT EXISTS scholarship_eligibility_rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scholarship_id INT NOT NULL,
  rule_key VARCHAR(100) NOT NULL,
  operator VARCHAR(20) NOT NULL,
  rule_value VARCHAR(255) NOT NULL,
  description VARCHAR(500) DEFAULT NULL,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_profiles (
  student_id VARCHAR(100) PRIMARY KEY,
  profile_json JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS eligibility_evaluations (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  scholarship_id INT NOT NULL,
  eligible BOOLEAN NOT NULL,
  explanation TEXT NOT NULL,
  evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id),
  INDEX idx_evaluation_lookup (student_id, scholarship_id, evaluated_at)
);

CREATE TABLE IF NOT EXISTS eligibility_evaluation_rules (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  evaluation_id BIGINT NOT NULL,
  rule_id INT NOT NULL,
  rule_label VARCHAR(200) NOT NULL,
  passed BOOLEAN NOT NULL,
  actual_value VARCHAR(500) DEFAULT NULL,
  required_value VARCHAR(500) DEFAULT NULL,
  FOREIGN KEY (evaluation_id) REFERENCES eligibility_evaluations(id) ON DELETE CASCADE,
  FOREIGN KEY (rule_id) REFERENCES scholarship_eligibility_rules(id)
);

CREATE TABLE IF NOT EXISTS scholarship_required_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scholarship_id INT NOT NULL,
  document_name VARCHAR(200) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scholarship_form_fields (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scholarship_id INT NOT NULL,
  field_key VARCHAR(100) NOT NULL,
  label VARCHAR(200) NOT NULL,
  field_type VARCHAR(40) NOT NULL,
  required BOOLEAN NOT NULL DEFAULT FALSE,
  validation_json JSON DEFAULT NULL,
  options_json JSON DEFAULT NULL,
  display_order INT NOT NULL DEFAULT 0,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS scholarship_applications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scholarship_id INT NOT NULL,
  student_id VARCHAR(100) NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'submitted',
  form_data JSON DEFAULT NULL,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_student_scholarship (scholarship_id, student_id),
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id)
);

CREATE TABLE IF NOT EXISTS application_field_values (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  field_id INT NOT NULL,
  field_value TEXT DEFAULT NULL,
  FOREIGN KEY (application_id) REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (field_id) REFERENCES scholarship_form_fields(id),
  UNIQUE KEY unique_application_field (application_id, field_id)
);

CREATE TABLE IF NOT EXISTS application_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  required_document_id INT DEFAULT NULL,
  field_name VARCHAR(100) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  verification_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  FOREIGN KEY (required_document_id) REFERENCES scholarship_required_documents(id)
);

CREATE TABLE IF NOT EXISTS readiness_factors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  scholarship_id INT DEFAULT NULL,
  factor_key VARCHAR(100) NOT NULL,
  factor_name VARCHAR(200) NOT NULL,
  weight DECIMAL(8, 3) NOT NULL DEFAULT 0,
  config_json JSON DEFAULT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id) ON DELETE CASCADE,
  INDEX idx_readiness_factor_scope (scholarship_id, active)
);

CREATE TABLE IF NOT EXISTS readiness_statuses (
  status_code VARCHAR(40) PRIMARY KEY,
  status_label VARCHAR(100) NOT NULL,
  minimum_score DECIMAL(5, 2) NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT TRUE
);

INSERT INTO readiness_statuses (status_code, status_label, minimum_score, display_order)
VALUES
('NOT_READY', 'Not ready', 0, 1),
('PARTIALLY_READY', 'Partially ready', 50, 2),
('READY', 'Ready', 80, 3)
ON DUPLICATE KEY UPDATE
  status_label = VALUES(status_label),
  minimum_score = VALUES(minimum_score),
  display_order = VALUES(display_order),
  active = TRUE;

CREATE TABLE IF NOT EXISTS application_verification_stages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  stage_key VARCHAR(100) NOT NULL,
  status VARCHAR(40) NOT NULL DEFAULT 'pending',
  metadata_json JSON DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  UNIQUE KEY unique_application_stage (application_id, stage_key)
);

CREATE TABLE IF NOT EXISTS application_readiness_results (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  application_id INT NOT NULL,
  score DECIMAL(6, 2) NOT NULL,
  status_code VARCHAR(40) NOT NULL,
  missing_items_json JSON DEFAULT NULL,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (application_id) REFERENCES scholarship_applications(id) ON DELETE CASCADE,
  INDEX idx_readiness_application_time (application_id, calculated_at)
);

CREATE TABLE IF NOT EXISTS application_readiness_factors (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  readiness_result_id BIGINT NOT NULL,
  factor_id INT NOT NULL,
  factor_name VARCHAR(200) NOT NULL,
  score DECIMAL(8, 3) NOT NULL,
  max_score DECIMAL(8, 3) NOT NULL,
  completed BOOLEAN NOT NULL,
  missing_items_json JSON DEFAULT NULL,
  FOREIGN KEY (readiness_result_id) REFERENCES application_readiness_results(id) ON DELETE CASCADE,
  FOREIGN KEY (factor_id) REFERENCES readiness_factors(id)
);

CREATE TABLE IF NOT EXISTS ai_recommendation_runs (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  model_version VARCHAR(150) NOT NULL,
  model_available BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_recommendation_student_time (student_id, created_at)
);

CREATE TABLE IF NOT EXISTS ai_recommendation_items (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  run_id BIGINT NOT NULL,
  scholarship_id INT NOT NULL,
  recommendation_score DECIMAL(9, 6) DEFAULT NULL,
  eligible BOOLEAN NOT NULL,
  reason TEXT NOT NULL,
  prediction_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (run_id) REFERENCES ai_recommendation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id)
);

CREATE TABLE IF NOT EXISTS complaint_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_key VARCHAR(80) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS complaint_statuses (
  status_key VARCHAR(50) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  display_order INT NOT NULL DEFAULT 0
);

INSERT INTO complaint_statuses (status_key, label, display_order)
VALUES ('submitted', 'Submitted', 1), ('under_review', 'Under review', 2), ('resolved', 'Resolved', 3), ('closed', 'Closed', 4)
ON DUPLICATE KEY UPDATE label = VALUES(label), active = TRUE, display_order = VALUES(display_order);

CREATE TABLE IF NOT EXISTS complaints (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  student_id VARCHAR(100) NOT NULL,
  scholarship_id INT DEFAULT NULL,
  application_id INT DEFAULT NULL,
  category_id INT DEFAULT NULL,
  description TEXT NOT NULL,
  status_key VARCHAR(50) NOT NULL DEFAULT 'submitted',
  official_response TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (scholarship_id) REFERENCES scholarships(id),
  FOREIGN KEY (application_id) REFERENCES scholarship_applications(id),
  FOREIGN KEY (category_id) REFERENCES complaint_categories(id),
  FOREIGN KEY (status_key) REFERENCES complaint_statuses(status_key),
  INDEX idx_complaints_student (student_id, created_at)
);

CREATE TABLE IF NOT EXISTS complaint_predictions (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  prediction_type VARCHAR(80) NOT NULL,
  predicted_value VARCHAR(200) DEFAULT NULL,
  confidence DECIMAL(8, 6) DEFAULT NULL,
  model_version VARCHAR(150) DEFAULT NULL,
  is_ai_generated BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS complaint_duplicates (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  original_complaint_id BIGINT NOT NULL,
  similarity_score DECIMAL(8, 6) DEFAULT NULL,
  review_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (original_complaint_id) REFERENCES complaints(id)
);

CREATE TABLE IF NOT EXISTS complaint_status_history (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  status_key VARCHAR(50) NOT NULL,
  changed_by VARCHAR(100) NOT NULL,
  note TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
  FOREIGN KEY (status_key) REFERENCES complaint_statuses(status_key)
);

CREATE TABLE IF NOT EXISTS complaint_documents (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  complaint_id BIGINT NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  stored_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_size INT NOT NULL,
  storage_path VARCHAR(500) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
);

INSERT INTO reference_options (option_group, option_value, option_label, display_order)
VALUES
('roles', 'student', 'Student', 1),
('roles', 'institution', 'Institution', 2),
('roles', 'government', 'Government Officer', 3),
('roles', 'admin', 'Admin', 4)
ON DUPLICATE KEY UPDATE
  option_label = VALUES(option_label),
  display_order = VALUES(display_order),
  active = TRUE;

INSERT INTO districts (district_name, district_code, district_id, inst_count, reg_count, approved_count, pending_count, coverage, institution_count)
VALUES
('Bengaluru Urban', '101', '101', '2,410', '452,103', '398,401', '53,702', 88, '2,410'),
('Mysuru', '104', '104', '1,120', '184,200', '152,400', '31,800', 76, '1,120'),
('Belagavi', '112', '112', '1,450', '212,800', '168,400', '44,400', 82, '1,450'),
('Hubballi-Dharwad', '118', '118', '890', '125,400', '108,200', '17,200', 86, '890'),
('Mangaluru', '125', '125', '740', '98,200', '89,500', '8,700', 91, '740'),
('Kalaburagi', '132', '132', '1,210', '165,900', '112,400', '53,500', 68, '1,210')
ON DUPLICATE KEY UPDATE
  district_code = VALUES(district_code),
  inst_count = VALUES(inst_count),
  reg_count = VALUES(reg_count),
  approved_count = VALUES(approved_count),
  pending_count = VALUES(pending_count),
  coverage = VALUES(coverage),
  institution_count = VALUES(institution_count);

INSERT INTO district_categories (district_name, category_id, category_name, category_sub, total_count, students, approved, rate, badge, badge_color, category_order)
VALUES
('Bengaluru Urban', 'schools', 'Schools', 'Primary & Secondary Education', 1432, '425k', '284,102', '82.4%', '+2.1%', 'bg-emerald-50 text-emerald-600', 1),
('Bengaluru Urban', 'pu', 'Pre-University Colleges', 'Vocational & Junior Colleges', 648, '186k', '142,509', '75.1%', '-0.5%', 'bg-red-50 text-red-600', 2),
('Bengaluru Urban', 'univ', 'Universities', 'Undergraduate & Tech Studies', 82, '312k', '198,334', '90.2%', '+5.4%', 'bg-emerald-50 text-emerald-600', 3),
('Bengaluru Urban', 'pg', 'Postgraduate Institutions', 'Masters, Doctoral & Research', 124, '45k', '32,110', '62.8%', 'STABLE', 'bg-slate-100 text-slate-600', 4),
('Mysuru', 'schools', 'Schools', 'Primary & Secondary Education', 680, '110k', '92,100', '83.7%', '+1.2%', 'bg-emerald-50 text-emerald-600', 1),
('Mysuru', 'pu', 'Pre-University Colleges', 'Vocational & Junior Colleges', 310, '45k', '38,200', '84.8%', '+3.1%', 'bg-emerald-50 text-emerald-600', 2),
('Mysuru', 'univ', 'Universities', 'Undergraduate & Tech Studies', 24, '82k', '68,400', '83.4%', '+0.8%', 'bg-emerald-50 text-emerald-600', 3),
('Mysuru', 'pg', 'Postgraduate Institutions', 'Masters, Doctoral & Research', 42, '18k', '14,200', '78.8%', '+1.5%', 'bg-emerald-50 text-emerald-600', 4),
('Belagavi', 'schools', 'Schools', 'Primary & Secondary Education', 890, '130k', '105,000', '80.7%', '+0.4%', 'bg-emerald-50 text-emerald-600', 1),
('Belagavi', 'pu', 'Pre-University Colleges', 'Vocational & Junior Colleges', 420, '58k', '44,100', '76.0%', '-1.2%', 'bg-red-50 text-red-600', 2),
('Hubballi-Dharwad', 'pu', 'Pre-University Colleges', 'Junior Colleges', 240, '35k', '29,100', '83.1%', '+2.0%', 'bg-emerald-50 text-emerald-600', 1),
('Mangaluru', 'pu', 'Pre-University Colleges', 'Junior Colleges', 180, '28k', '25,400', '90.7%', '+4.1%', 'bg-emerald-50 text-emerald-600', 1),
('Kalaburagi', 'pu', 'Pre-University Colleges', 'Junior Colleges', 390, '48k', '32,100', '66.8%', '-3.5%', 'bg-red-50 text-red-600', 1)
ON DUPLICATE KEY UPDATE
  category_name = VALUES(category_name),
  category_sub = VALUES(category_sub),
  total_count = VALUES(total_count),
  students = VALUES(students),
  approved = VALUES(approved),
  rate = VALUES(rate),
  badge = VALUES(badge),
  badge_color = VALUES(badge_color),
  category_order = VALUES(category_order);

INSERT INTO district_institutions (district_name, category_id, institution_id, institution_name, total, applied, pct, approved, rejected, pending, disbursed)
VALUES
('Bengaluru Urban', 'pu', 'PU12849', 'Government PU College, Jayanagar', '1,240', '1,140', '92%', '1,140', '40', '60', '₹12.4L'),
('Bengaluru Urban', 'pu', 'PU33012', "St. Joseph's Pre-University College", '2,850', '2,109', '74%', '2,109', '121', '620', '₹28.5L'),
('Bengaluru Urban', 'pu', 'PU88211', 'Seshadripuram PU College, Yelahanka', '1,890', '907', '48%', '907', '93', '890', '₹9.8L'),
('Bengaluru Urban', 'pu', 'PU00291', 'Mount Carmel Pre-University College', '3,200', '2,816', '88%', '2,816', '70', '314', '₹34.1L'),
('Bengaluru Urban', 'schools', 'SCH101', 'Government High School, Malleshwaram', '850', '800', '94%', '780', '10', '10', '₹5.2L'),
('Bengaluru Urban', 'schools', 'SCH102', 'National High School, Basavanagudi', '1,100', '950', '86%', '910', '25', '15', '₹7.8L'),
('Bengaluru Urban', 'univ', 'UNV001', 'Bangalore University, Jnana Bharathi', '12,400', '11,800', '95%', '11,200', '300', '300', '₹1.4Cr'),
('Bengaluru Urban', 'pg', 'PG001', 'Indian Institute of Science (IISc)', '3,200', '2,900', '90%', '2,800', '50', '50', '₹85L'),
('Mysuru', 'pu', 'PU2201', 'Maharanis PU College for Women, Mysuru', '2,100', '1,950', '92%', '1,880', '30', '40', '₹21.0L'),
('Mysuru', 'pu', 'PU2202', 'Marimallappa PU College, Mysuru', '1,980', '1,800', '90%', '1,750', '20', '30', '₹18.5L'),
('Belagavi', 'pu', 'PU3301', 'RLS Pre-University College, Belagavi', '1,500', '1,350', '90%', '1,280', '40', '30', '₹14.2L'),
('Hubballi-Dharwad', 'pu', 'PU4401', 'Kittel Junior College, Dharwad', '1,100', '980', '89%', '940', '20', '20', '₹10.1L'),
('Mangaluru', 'pu', 'PU5501', 'St. Aloysius PU College, Mangaluru', '3,100', '2,950', '95%', '2,900', '25', '25', '₹32.0L'),
('Kalaburagi', 'pu', 'PU6601', 'Government PU College, Kalaburagi', '1,600', '1,100', '68%', '980', '60', '60', '₹9.5L')
ON DUPLICATE KEY UPDATE
  institution_name = VALUES(institution_name),
  total = VALUES(total),
  applied = VALUES(applied),
  pct = VALUES(pct),
  approved = VALUES(approved),
  rejected = VALUES(rejected),
  pending = VALUES(pending),
  disbursed = VALUES(disbursed);
