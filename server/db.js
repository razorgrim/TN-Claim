import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

let pool;

export async function initializeDatabase() {
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };

  // 1. Create database if it doesn't exist
  try {
    const tempConnection = await mysql.createConnection(connectionConfig);
    await tempConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'tn_claims'}\``);
    await tempConnection.end();
  } catch (error) {
    console.error("Failed to connect to MariaDB or create database. Make sure MariaDB is running.", error);
    throw error;
  }

  // 2. Initialize connection pool
  pool = mysql.createPool({
    ...connectionConfig,
    database: process.env.DB_NAME || 'tn_claims',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
  });

  // 3. Create tables and seed data
  try {
    const connection = await pool.getConnection();

    // Create users table
    await connection.query(`
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;
    `);

    // Create claims table
    await connection.query(`
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
    `);

    // Dynamically alter claims type column to support 'others' if table already exists
    try {
      await connection.query(`
        ALTER TABLE claims MODIFY COLUMN type ENUM('ot', 'general', 'outstation', 'others') NOT NULL;
      `);
    } catch (err) {
      console.warn("Could not alter claims type enum column:", err.message);
    }

    // Dynamically add 'is_archived' column if it does not exist
    try {
      await connection.query(`
        ALTER TABLE claims ADD COLUMN is_archived TINYINT(1) DEFAULT 0;
      `);
    } catch (err) {
      // Ignore error if column already exists
    }

    // Rename existing default emails if they exist in the DB
    try {
      await connection.query("UPDATE users SET email = 'admin@neutron.com' WHERE email = 'admin@totalneutron.com'");
      await connection.query("UPDATE users SET email = 'staff@neutron.com' WHERE email = 'staff@totalneutron.com'");
    } catch (err) {
      console.warn('Could not rename existing users (might not exist yet):', err.message);
    }

    // Seed default users if empty
    const [rows] = await connection.query('SELECT COUNT(*) as count FROM users');
    if (rows[0].count === 0) {
      console.log('No users found. Seeding default users...');
      const adminPassHash = await bcrypt.hash('my1p@ssw0rd', 10);
      const staffPassHash = await bcrypt.hash('my1p@ssw0rd', 10);

      // Seed admin
      await connection.query(`
        INSERT INTO users (name, email, password_hash, ic, contact, department, role, mileage_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Finance Admin',
        'admin@neutron.com',
        adminPassHash,
        '900101-14-1111',
        '+60 3-8320 8306',
        'Finance & HR',
        'admin',
        0.60
      ]);

      // Seed staff member
      await connection.query(`
        INSERT INTO users (name, email, password_hash, ic, contact, department, role, mileage_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        'Ahmad Bin Razak',
        'staff@neutron.com',
        staffPassHash,
        '940815-14-5321',
        '+60 12-345 6789',
        'Technical Operations',
        'staff',
        0.60
      ]);
      console.log('Default users successfully seeded.');
    }

    connection.release();
  } catch (error) {
    console.error("Failed to initialize database tables or seed users:", error);
    throw error;
  }
}

export function getDb() {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase first.');
  }
  return pool;
}
