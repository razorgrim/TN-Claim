import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  console.log('Resetting database users and passwords...');
  const connectionConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'tn_claims'
  };

  try {
    const connection = await mysql.createConnection(connectionConfig);

    // Disable foreign key checks temporarily to safely truncate/reset users
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');
    await connection.query('TRUNCATE TABLE users');
    await connection.query('TRUNCATE TABLE claims'); // Clear claims for clean testing state
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Generating secure bcrypt hashes for "my1p@ssw0rd"...');
    const adminPassHash = await bcrypt.hash('my1p@ssw0rd', 10);
    const staffPassHash = await bcrypt.hash('my1p@ssw0rd', 10);

    // Seed admin
    await connection.query(`
      INSERT INTO users (id, name, email, password_hash, ic, contact, department, role, mileage_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      1,
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
      INSERT INTO users (id, name, email, password_hash, ic, contact, department, role, mileage_rate)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      2,
      'Ahmad Bin Razak',
      'staff@neutron.com',
      staffPassHash,
      '940815-14-5321',
      '+60 12-345 6789',
      'Technical Operations',
      'staff',
      0.60
    ]);

    await connection.end();
    console.log('Database users successfully reset and seeded!');
    console.log('Credentials:');
    console.log('Admin Email: admin@neutron.com | Password: my1p@ssw0rd');
    console.log('Staff Email: staff@neutron.com | Password: my1p@ssw0rd');
    process.exit(0);
  } catch (error) {
    console.error('Failed to reset database users:', error);
    process.exit(1);
  }
}

main();
