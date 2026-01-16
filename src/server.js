import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';

// Import routes
import authRoutes from './routes/auth.js';
import memberRoutes from './routes/members.js';
import attendanceRoutes from './routes/attendance.js';
import branchRoutes from './routes/branches.js';
import scheduleRoutes from './routes/schedules.js';
import analyticsRoutes from './routes/analytics.js';
import userRoutes from './routes/users.js';
import feedbackRoutes from './routes/feedback.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import matchesRoutes from './routes/matches.js';
import branchAdminsRoutes from './routes/branch_admins.js';
import branchAdminRoutes from './routes/branch-admin.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import pool from './config/database.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());

// Cookie parser middleware
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads)
app.use('/uploads', express.static('uploads'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Database connection test endpoint
app.get('/db-test', async (req, res) => {
  try {
    // Test basic connection
    const connection = await pool.getConnection();
    
    // Test query
    const [rows] = await connection.query('SELECT 1 as test');
    
    // Get database info
    const [dbInfo] = await connection.query('SELECT DATABASE() as current_db');
    const [tableCount] = await connection.query(
      'SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = DATABASE()'
    );
    
    // Check if key tables exist
    const [tables] = await connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name IN ('users', 'members', 'branches', 'attendance', 'schedules')
      ORDER BY table_name
    `);
    
    connection.release();
    
    res.json({
      status: 'Connected',
      database: {
        host: process.env.DB_HOST || 'not set',
        name: dbInfo[0].current_db,
        user: process.env.DB_USER || 'not set',
        port: process.env.DB_PORT || 'not set',
        tableCount: tableCount[0].table_count,
        keyTables: tables.map(t => t.table_name),
        missingTables: ['users', 'members', 'branches', 'attendance', 'schedules']
          .filter(t => !tables.find(table => table.table_name === t))
      },
      test: rows[0].test === 1 ? 'PASS' : 'FAIL',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'Failed',
      error: error.message,
      code: error.code,
      sqlState: error.sqlState,
      config: {
        host: process.env.DB_HOST || 'not set',
        user: process.env.DB_USER || 'not set',
        database: process.env.DB_NAME || 'not set',
        port: process.env.DB_PORT || 'not set',
      },
      timestamp: new Date().toISOString()
    });
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/users', userRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/matches', matchesRoutes);
app.use('/api/branch_admins', branchAdminsRoutes);
app.use('/api/branch-admin', branchAdminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API URL: http://localhost:${PORT}`);
});

export default app;
