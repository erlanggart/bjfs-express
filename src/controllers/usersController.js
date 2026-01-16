import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/database.js';

const prisma = new PrismaClient();

// List users (admin_cabang or member) with pagination and search
export const listUsers = async (req, res) => {
  try {
    const role = req.query.role || 'admin_cabang';
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    // Validate role
    if (!['admin_cabang', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid.' });
    }

    let users, totalRecords;

    if (role === 'admin_cabang') {
      // Count total admin_cabang
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM users u 
         WHERE u.role = 'admin_cabang' 
         AND (? = '' OR u.username LIKE ?)`,
        [search, `%${search}%`]
      );
      totalRecords = countResult[0].total;

      // Get admin_cabang with details
      const [rows] = await db.query(
        `SELECT 
          u.id,
          u.username,
          ba.id as nomor_id,
          ba.full_name,
          b.name as branch_name
         FROM users u
         LEFT JOIN branch_admins ba ON u.id = ba.user_id
         LEFT JOIN branches b ON ba.branch_id = b.id
         WHERE u.role = 'admin_cabang'
         AND (? = '' OR u.username LIKE ?)
         ORDER BY u.username
         LIMIT ? OFFSET ?`,
        [search, `%${search}%`, limit, offset]
      );
      users = rows;
    } else {
      // Count total members
      const [countResult] = await db.query(
        `SELECT COUNT(*) as total FROM users u 
         WHERE u.role = 'member' 
         AND (? = '' OR u.username LIKE ?)`,
        [search, `%${search}%`]
      );
      totalRecords = countResult[0].total;

      // Get members with details
      const [rows] = await db.query(
        `SELECT 
          u.id,
          u.username,
          m.id as nomor_id,
          m.full_name,
          b.name as branch_name
         FROM users u
         LEFT JOIN members m ON u.id = m.user_id
         LEFT JOIN branches b ON m.branch_id = b.id
         WHERE u.role = 'member'
         AND (? = '' OR u.username LIKE ?)
         ORDER BY u.username
         LIMIT ? OFFSET ?`,
        [search, `%${search}%`, limit, offset]
      );
      users = rows;
    }

    const totalPages = Math.ceil(totalRecords / limit);

    res.json({
      data: users,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Gagal mengambil data pengguna.' });
  }
};

// Create user (admin_cabang or member)
export const createUser = async (req, res) => {
  try {
    const {
      role,
      username,
      password,
      full_name,
      branch_id,
      date_of_birth
    } = req.body;

    // Validate input
    if (!role || !['admin_cabang', 'member'].includes(role)) {
      return res.status(400).json({ message: 'Role tidak valid.' });
    }

    if (!username || !password || !full_name || !branch_id) {
      return res.status(400).json({ message: 'Data yang dikirim tidak lengkap.' });
    }

    // For members, date_of_birth is required
    if (role === 'member' && !date_of_birth) {
      return res.status(400).json({ message: 'Tanggal lahir diperlukan untuk member.' });
    }

    // Determine branch_id based on user role
    let finalBranchId = branch_id;
    if (req.user.role === 'admin_cabang') {
      // Branch admin can only create users in their own branch
      const branchAdmin = await prisma.branch_admins.findFirst({
        where: { user_id: req.user.id }
      });
      if (branchAdmin) {
        finalBranchId = branchAdmin.branch_id;
      }
    }

    // Check if username already exists
    const existingUser = await prisma.users.findFirst({
      where: { username }
    });

    if (existingUser) {
      return res.status(400).json({ message: 'Username sudah digunakan.' });
    }

    // Hash password using argon2 (same as PHP's PASSWORD_ARGON2ID)
    const hashedPassword = await argon2.hash(password);
    const userId = uuidv4();

    // Create user with transaction
    await prisma.$transaction(async (tx) => {
      // Create user
      await tx.users.create({
        data: {
          id: userId,
          username,
          password: hashedPassword,
          role
        }
      });

      // Create profile based on role
      if (role === 'admin_cabang') {
        await tx.branch_admins.create({
          data: {
            id: uuidv4(),
            user_id: userId,
            branch_id: finalBranchId,
            full_name
          }
        });
      } else if (role === 'member') {
        // Generate custom member ID
        const branch = await tx.branches.findUnique({
          where: { id: finalBranchId }
        });

        if (!branch) {
          throw new Error('Cabang tidak ditemukan.');
        }

        // Create prefix from branch name (first 2 letters)
        let prefix = branch.name.replace(/\s/g, '').substring(0, 2).toUpperCase();
        if (prefix.length < 2) {
          prefix = prefix.padEnd(2, 'X');
        }

        // Generate 6 random numbers
        const randomNumbers = Math.floor(100000 + Math.random() * 900000);
        const memberId = prefix + randomNumbers;

        await tx.members.create({
          data: {
            id: memberId,
            user_id: userId,
            branch_id: finalBranchId,
            full_name,
            date_of_birth: date_of_birth ? new Date(date_of_birth) : null
          }
        });
      }
    });

    res.status(201).json({ message: 'Pengguna baru berhasil dibuat.' });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(400).json({ message: error.message || 'Gagal membuat pengguna.' });
  }
};

// Delete user (admin_cabang or member)
export const deleteUser = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID diperlukan.' });
    }

    // Delete user (cascade will handle profile deletion)
    const result = await prisma.users.delete({
      where: {
        id: user_id
      }
    });

    if (result) {
      res.json({ message: 'Pengguna berhasil dihapus.' });
    } else {
      res.status(404).json({ message: 'Pengguna tidak ditemukan atau sudah dihapus.' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Pengguna tidak ditemukan atau sudah dihapus.' });
    }
    
    res.status(500).json({ message: 'Gagal menghapus pengguna.' });
  }
};

// Remove admin (specific for admin_cabang)
export const removeAdmin = async (req, res) => {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: 'User ID admin diperlukan.' });
    }

    // Delete admin_cabang user only
    const result = await prisma.users.deleteMany({
      where: {
        id: user_id,
        role: 'admin_cabang'
      }
    });

    if (result.count > 0) {
      res.json({ message: 'Admin cabang berhasil dihapus.' });
    } else {
      res.status(404).json({ message: 'Admin cabang tidak ditemukan atau sudah dihapus.' });
    }
  } catch (error) {
    console.error('Error removing admin:', error);
    res.status(500).json({ message: 'Gagal menghapus admin cabang.' });
  }
};
