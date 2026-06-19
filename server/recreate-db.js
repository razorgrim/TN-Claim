import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Recreating database from scratch with clean data...');
  
  const dbName = process.env.DB_NAME || 'tn_claims';
  
  // Connect initially without specifying a database so we can drop/create it
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
  };

  try {
    const connection = await mysql.createConnection(connectionConfig);

    console.log(`Dropping database if exists: ${dbName}...`);
    await connection.query(`DROP DATABASE IF EXISTS \`${dbName}\``);

    console.log(`Creating database: ${dbName}...`);
    await connection.query(`CREATE DATABASE \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);

    console.log(`Switching to database: ${dbName}...`);
    await connection.query(`USE \`${dbName}\``);

    console.log('Creating "users" table...');
    await connection.query(`
      CREATE TABLE users (
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
    `);

    console.log('Creating "claims" table...');
    await connection.query(`
      CREATE TABLE claims (
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

    console.log('Generating secure bcrypt hashes for "My1p@ssw0rd"...');
    const adminPassHash = await bcrypt.hash('My1p@ssw0rd', 10);
    const staffPassHash = await bcrypt.hash('My1p@ssw0rd', 10);

    console.log('Seeding default users...');
    // Seed admin
    await connection.query(`
      INSERT INTO users (id, name, email, password_hash, ic, contact, department, role, mileage_rate, company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      1,
      'Finance Admin',
      'admin@neutron.com',
      adminPassHash,
      '900101-14-1111',
      '+60 3-8320 8306',
      'Finance & HR',
      'admin',
      0.60,
      'Total Neutron Solution Sdn Bhd'
    ]);

    // Seed staff member
    await connection.query(`
      INSERT INTO users (id, name, email, password_hash, ic, contact, department, role, mileage_rate, company)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      2,
      'Ahmad Bin Razak',
      'staff@neutron.com',
      staffPassHash,
      '940815-14-5321',
      '+60 12-345 6789',
      'Technical Operations',
      'staff',
      0.60,
      'Siqma Group (M) Sdn Bhd'
    ]);

    await connection.end();
    console.log('Database successfully recreated and seeded with clean data!');
    console.log('Credentials:');
    console.log('Admin Email: admin@neutron.com | Password: My1p@ssw0rd');
    console.log('Staff Email: staff@neutron.com | Password: My1p@ssw0rd');
    process.exit(0);
  } catch (error) {
    console.error('Failed to recreate database:', error);
    process.exit(1);
  }
}

main();
