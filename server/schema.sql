-- Total Neutron Claims Portal Database Schema & Seed Data
-- Database Name: tn_claims

CREATE DATABASE IF NOT EXISTS `tn_claims` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `tn_claims`;

-- 1. Create users table
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  ic VARCHAR(50) NOT NULL,
  contact VARCHAR(50) NOT NULL,
  department VARCHAR(100) NOT NULL,
  role ENUM('staff', 'admin') DEFAULT 'staff',
  mileage_rate DECIMAL(4, 2) DEFAULT 0.60,
  company VARCHAR(100) DEFAULT 'Total Neutron Solution Sdn Bhd',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Create claims table
CREATE TABLE IF NOT EXISTS claims (
  id VARCHAR(50) PRIMARY KEY,
  user_id INT NOT NULL,
  type ENUM('ot', 'general', 'outstation', 'others') NOT NULL,
  date VARCHAR(20) NOT NULL,
  month VARCHAR(10) NOT NULL,
  status ENUM('Pending', 'Approved', 'Rejected', 'Draft') DEFAULT 'Draft',
  admin_comments TEXT,
  is_archived TINYINT(1) DEFAULT 0,
  totals TEXT NOT NULL,
  items LONGTEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 3. Seed default admin & staff users (Default password: My1p@ssw0rd)
-- Pre-computed bcrypt hash for 'My1p@ssw0rd' is: $2b$10$gbHtQYnea1TtGHvyzg2daOZTOk/KV1XKgPpoTMoI/GwBoqETL4Kiq
REPLACE INTO users (id, name, email, password_hash, ic, contact, department, role, mileage_rate)
VALUES 
(1, 'Finance Admin', 'admin@neutron.com', '$2b$10$gbHtQYnea1TtGHvyzg2daOZTOk/KV1XKgPpoTMoI/GwBoqETL4Kiq', '900101-14-1111', '+60 3-8320 8306', 'Finance & HR', 'admin', 0.60),
(2, 'Ahmad Bin Razak', 'staff@neutron.com', '$2b$10$gbHtQYnea1TtGHvyzg2daOZTOk/KV1XKgPpoTMoI/GwBoqETL4Kiq', '940815-14-5321', '+60 12-345 6789', 'Technical Operations', 'staff', 0.60);
