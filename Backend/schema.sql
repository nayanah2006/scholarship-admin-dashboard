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
