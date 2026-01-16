import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

// Debug: Log database configuration (without password)
console.log('🔧 Database Configuration:');
console.log('  DB_HOST:', process.env.DB_HOST || 'NOT SET (defaulting to localhost)');
console.log('  DB_USER:', process.env.DB_USER || 'NOT SET (defaulting to root)');
console.log('  DB_PASSWORD:', process.env.DB_PASSWORD ? '***SET***' : 'NOT SET (no password)');
console.log('  DB_NAME:', process.env.DB_NAME || 'NOT SET (defaulting to bogorjuniorfs)');
console.log('  DB_PORT:', process.env.DB_PORT || 'NOT SET (defaulting to 3306)');
console.log('  NODE_ENV:', process.env.NODE_ENV || 'NOT SET');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'bogorjuniorfs',
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
});

// Test database connection (non-blocking)
setTimeout(async () => {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully');
    connection.release();
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    console.error('⚠️  App will continue running but database operations will fail');
    console.error('💡 Fix: Check environment variables or create .env file on server');
  }
}, 2000); // Test after 2 seconds to not block server startup

export default pool;
