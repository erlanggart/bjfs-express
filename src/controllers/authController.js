import bcrypt from 'bcrypt';
import db from '../config/database.js';
import { generateToken } from '../utils/jwt.js';

export const login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password diperlukan' });
    }

    // Get user with profile data
    const [users] = await db.query(`
      SELECT
        u.id,
        u.username,
        u.password,
        u.role,
        u.email,
        COALESCE(ba.full_name, m.full_name) as full_name,
        m.date_of_birth,
        ba.branch_id
      FROM users u
      LEFT JOIN branch_admins ba ON u.id = ba.user_id
      LEFT JOIN members m ON u.id = m.user_id
      WHERE u.username = ?
      LIMIT 1
    `, [username]);

    if (users.length === 0) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Username atau password salah' });
    }

    // Log login (except for admin role)
    if (user.role !== 'admin') {
      try {
        const ip_address = req.ip || req.connection.remoteAddress || 'unknown';
        const user_agent = req.headers['user-agent'] || 'unknown';
        
        await db.query(
          'INSERT INTO login_logs (user_id, ip_address, user_agent) VALUES (?, ?, ?)',
          [user.id, ip_address, user_agent]
        );
      } catch (error) {
        console.error('Failed to log login:', error);
      }
    }

    // Prepare user profile data
    const user_profile_data = {
      id: user.id,
      role: user.role,
      username: user.username,
      email: user.email,
      full_name: user.full_name || user.username,
    };

    // Add role-specific data
    if (user.role === 'member') {
      user_profile_data.date_of_birth = user.date_of_birth;
    }
    if (user.role === 'admin_cabang') {
      user_profile_data.branch_id = user.branch_id;
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    res.json({
      success: true,
      message: 'Login berhasil',
      token,
      user: user_profile_data,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, email, password, role = 'member' } = req.body;

    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Semua field diperlukan' });
    }

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username atau email sudah terdaftar' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (username, email, password, role) VALUES (?, ?, ?, ?)',
      [username, email, hashedPassword, role]
    );

    res.status(201).json({
      success: true,
      message: 'Registrasi berhasil',
      userId: result.insertId,
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res) => {
  // For JWT-based auth, logout is handled on the client side
  // by removing the token from storage
  res.json({ success: true, message: 'Logout berhasil' });
};

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user with profile data
    const [users] = await db.query(`
      SELECT
        u.id,
        u.username,
        u.email,
        u.role,
        COALESCE(ba.full_name, m.full_name) as full_name,
        m.date_of_birth,
        m.avatar,
        ba.branch_id
      FROM users u
      LEFT JOIN branch_admins ba ON u.id = ba.user_id
      LEFT JOIN members m ON u.id = m.user_id
      WHERE u.id = ?
      LIMIT 1
    `, [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan' });
    }

    const user = users[0];
    delete user.password; // Remove password from response

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};
