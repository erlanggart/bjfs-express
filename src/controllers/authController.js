import bcrypt from 'bcrypt';
import argon2 from 'argon2';
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

    // Verify password - support both argon2 (old PHP) and bcrypt (new)
    let isValidPassword = false;
    if (user.password.startsWith('$argon2')) {
      // Old PHP password using argon2
      isValidPassword = await argon2.verify(user.password, password);
    } else if (user.password.startsWith('$2')) {
      // New bcrypt password
      isValidPassword = await bcrypt.compare(password, user.password);
    }
    
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

    // Set token as httpOnly cookie
    res.cookie('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 2 * 60 * 60 * 1000 // 2 hours
    });

    res.json({
      success: true,
      message: 'Login berhasil',
      token, // Still send in response for compatibility
      user: user_profile_data,
    });
  } catch (error) {
    next(error);
  }
};

export const register = async (req, res, next) => {
  try {
    const { username, password, role = 'member' } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ message: 'Username dan password diperlukan' });
    }

    // Check if user exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE username = ?',
      [username]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({ message: 'Username sudah terdaftar' });
    }

    // Hash password using argon2
    const hashedPassword = await argon2.hash(password);

    // Insert user
    const [result] = await db.query(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [username, hashedPassword, role]
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
  // Clear auth cookie if using cookies
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  res.json({ success: true, message: 'Logout berhasil' });
};

export const checkAuth = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    // Get additional user data
    let responseData = {
      id: userId,
      role: role
    };

    // If member, get additional info
    if (role === 'member') {
      const [members] = await db.query(`
        SELECT full_name, date_of_birth
        FROM members
        WHERE user_id = ?
      `, [userId]);

      if (members.length > 0) {
        responseData.full_name = members[0].full_name;
        responseData.date_of_birth = members[0].date_of_birth;
      }
    }

    // If branch admin, get branch_id
    if (role === 'admin_cabang') {
      const [admins] = await db.query(`
        SELECT branch_id, full_name
        FROM branch_admins
        WHERE user_id = ?
      `, [userId]);

      if (admins.length > 0) {
        responseData.branch_id = admins[0].branch_id;
        responseData.full_name = admins[0].full_name;
      }
    }

    res.json({
      success: true,
      message: 'Autentikasi berhasil',
      user: responseData
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user with profile data
    const [users] = await db.query(`
      SELECT
        u.id,
        u.username,
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
