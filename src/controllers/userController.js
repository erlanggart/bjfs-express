import db from '../config/database.js';

// GET /api/users/my-profile - Get current user's profile
export const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    let profile = null;

    switch (role) {
      case 'member': {
        const [members] = await db.query(`
          SELECT m.*, u.username, b.name as branch_name 
          FROM members m 
          JOIN branches b ON m.branch_id = b.id 
          JOIN users u ON m.user_id = u.id
          WHERE m.user_id = ?
        `, [userId]);

        profile = members[0];
        break;
      }

      case 'admin_cabang': {
        const [admins] = await db.query(`
          SELECT ba.id, ba.user_id, u.username, ba.full_name, ba.avatar, 
                 ba.phone_number, ba.address, ba.branch_id, ba.signature,
                 b.name as branch_name 
          FROM branch_admins ba 
          JOIN branches b ON ba.branch_id = b.id 
          JOIN users u ON ba.user_id = u.id
          WHERE ba.user_id = ?
        `, [userId]);

        profile = admins[0];
        break;
      }

      case 'admin': {
        const [users] = await db.query(`
          SELECT id, username, role
          FROM users
          WHERE id = ?
        `, [userId]);

        profile = users[0];
        if (profile) {
          profile.full_name = 'Administrator';
        }
        break;
      }

      default:
        return res.status(400).json({ message: 'Role tidak valid' });
    }

    if (!profile) {
      return res.status(404).json({ message: 'Profil tidak ditemukan' });
    }

    // Add role to response
    profile.role = role;

    res.json({
      success: true,
      profile: profile
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/update-profile - Update current user's profile
export const updateMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role === 'member') {
      // Update member profile
      const { full_name, phone_number, address, date_of_birth } = req.body;

      const [members] = await db.query('SELECT id FROM members WHERE user_id = ?', [userId]);
      
      if (members.length === 0) {
        return res.status(404).json({ message: 'Data member tidak ditemukan' });
      }

      // Convert date_of_birth to YYYY-MM-DD format if provided
      let formattedDateOfBirth = date_of_birth;
      if (date_of_birth) {
        const dateObj = new Date(date_of_birth);
        formattedDateOfBirth = dateObj.toISOString().split('T')[0]; // Extract YYYY-MM-DD
      }

      await db.query(
        'UPDATE members SET full_name = ?, phone_number = ?, address = ?, date_of_birth = ? WHERE user_id = ?',
        [full_name, phone_number, address, formattedDateOfBirth, userId]
      );

    } else if (role === 'admin_cabang') {
      // Update branch admin profile
      const { full_name, phone_number, address } = req.body;

      await db.query(
        'UPDATE branch_admins SET full_name = ?, phone_number = ?, address = ? WHERE user_id = ?',
        [full_name, phone_number, address, userId]
      );

    } else {
      return res.status(403).json({ message: 'Admin tidak bisa update profil dengan endpoint ini' });
    }

    res.json({
      success: true,
      message: 'Profil berhasil diperbarui'
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/change_password.php - Change password for any authenticated user
export const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      return res.status(400).json({ message: 'Semua field password diperlukan.' });
    }

    // Get current password hash
    const [users] = await db.query('SELECT password FROM users WHERE id = ?', [userId]);

    if (users.length === 0) {
      return res.status(404).json({ message: 'User tidak ditemukan.' });
    }

    // Verify current password using argon2
    const argon2 = (await import('argon2')).default;
    const isValid = await argon2.verify(users[0].password, current_password);

    if (!isValid) {
      return res.status(401).json({ message: 'Password saat ini salah.' });
    }

    // Hash new password
    const newHashedPassword = await argon2.hash(new_password);

    // Update password
    await db.query('UPDATE users SET password = ? WHERE id = ?', [newHashedPassword, userId]);

    res.json({ message: 'Password berhasil diubah.' });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/upload_avatar.php - Upload avatar for member or branch_admin
export const uploadAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (!req.file) {
      return res.status(400).json({ message: 'File avatar diperlukan' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;

    if (role === 'member') {
      await db.query(
        'UPDATE members SET avatar = ? WHERE user_id = ?',
        [avatarUrl, userId]
      );
    } else if (role === 'admin_cabang') {
      await db.query(
        'UPDATE branch_admins SET avatar = ? WHERE user_id = ?',
        [avatarUrl, userId]
      );
    } else {
      return res.status(400).json({ message: 'Peran tidak mendukung avatar.' });
    }

    res.json({
      message: 'Avatar berhasil diunggah.',
      avatar_url: avatarUrl
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users/save_signature.php - Save signature for branch_admin
export const saveSignature = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const role = req.user.role;

    if (role !== 'admin_cabang') {
      return res.status(403).json({ message: 'Hanya admin cabang yang bisa menyimpan tanda tangan.' });
    }

    let dbPath = null;

    // Handle file upload
    if (req.file) {
      dbPath = `/uploads/signatures/${req.file.filename}`;
    }
    // Handle base64 data from canvas
    else if (req.body.signature) {
      const base64Data = req.body.signature;
      
      if (!base64Data.startsWith('data:image/png;base64,')) {
        return res.status(400).json({ message: 'Format data tanda tangan tidak valid.' });
      }

      const fs = (await import('fs')).default;
      const path = (await import('path')).default;

      // Remove header
      const base64String = base64Data.replace('data:image/png;base64,', '').replace(/ /g, '+');
      const imageBuffer = Buffer.from(base64String, 'base64');

      const uploadDir = path.join(process.cwd(), 'uploads/signatures');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }

      const filename = `sig_${userId}_${Date.now()}.png`;
      const filepath = path.join(uploadDir, filename);
      
      fs.writeFileSync(filepath, imageBuffer);
      dbPath = `/uploads/signatures/${filename}`;
    } else {
      return res.status(400).json({ message: 'Tidak ada data tanda tangan yang valid dikirim.' });
    }

    // Update database
    await db.query(
      'UPDATE branch_admins SET signature = ? WHERE user_id = ?',
      [dbPath, userId]
    );

    res.json({ message: 'Tanda tangan berhasil disimpan.' });
  } catch (error) {
    next(error);
  }
};

export default {
  getMyProfile,
  updateMyProfile,
  changePassword,
  uploadAvatar,
  saveSignature
};
