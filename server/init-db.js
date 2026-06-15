import { initializeDatabase } from './db.js';

async function main() {
  console.log('Running database initialization script...');
  try {
    await initializeDatabase();
    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

main();
