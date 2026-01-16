import jwt from 'jsonwebtoken';
import db from '../config/database.js';

export const authenticate = async (req, res, next) => {
  try {
    let token;

    // Try to get token from cookie first (most secure)
    if (req.cookies && req.cookies.auth_token) {
      token = req.cookies.auth_token;
    }
    
    // Fallback: Try Authorization header
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }

    if (!token) {
      console.log('No token found in cookies or headers');
      return res.status(401).json({ error: 'No token provided', message: 'Autentikasi diperlukan' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'KUNCI_RAHASIA_SUPER_AMAN_ANDA');

    // Get user from database using decoded id
    const userId = decoded.id || decoded.userId || decoded.data?.id;
    const [users] = await db.query(
      'SELECT id, username, role FROM users WHERE id = ?',
      [userId]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'User not found', message: 'User tidak ditemukan' });
    }

    // Attach user to request
    req.user = users[0];
    
    // Log authentication info
    console.log(`[AUTH] User authenticated: ${req.user.username} (ID: ${req.user.id}, Role: ${req.user.role})`);
    console.log(`[AUTH] Accessing: ${req.method} ${req.originalUrl}`);
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token', message: 'Token tidak valid' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired', message: 'Token sudah kadaluarsa' });
    }
    return res.status(500).json({ error: 'Authentication failed', message: 'Autentikasi gagal' });
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      console.log('[AUTHORIZE] No user attached to request');
      return res.status(401).json({ error: 'Not authenticated' });
    }

    console.log(`[AUTHORIZE] Required roles: [${roles.join(', ')}] - User role: ${req.user.role}`);
    console.log(`[AUTHORIZE] Type of roles array:`, Array.isArray(roles), roles);
    console.log(`[AUTHORIZE] Type of user role:`, typeof req.user.role, JSON.stringify(req.user.role));
    console.log(`[AUTHORIZE] Includes check:`, roles.includes(req.user.role));

    if (!roles.includes(req.user.role)) {
      console.log(`[AUTHORIZE] ACCESS DENIED - User ${req.user.username} (${req.user.role}) tried to access ${req.method} ${req.originalUrl}`);
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        message: 'Akses ditolak. Anda tidak memiliki izin untuk mengakses resource ini.',
        userRole: req.user.role,
        requiredRoles: roles
      });
    }

    console.log(`[AUTHORIZE] ACCESS GRANTED - User ${req.user.username} (${req.user.role})`);
    next();
  };
};
