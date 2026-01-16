import db from '../config/database.js';

export const getAllBranches = async (req, res, next) => {
  try {
    const [branches] = await db.query(`
      SELECT 
        b.id,
        b.name,
        b.address,
        COUNT(m.id) as total_members,
        SUM(CASE WHEN m.status = 'active' THEN 1 ELSE 0 END) as active_members,
        SUM(CASE WHEN m.status = 'inactive' THEN 1 ELSE 0 END) as inactive_members
      FROM branches b
      LEFT JOIN members m ON b.id = m.branch_id
      GROUP BY b.id, b.name, b.address
      ORDER BY b.name ASC
    `);

    res.json(branches);
  } catch (error) {
    next(error);
  }
};

export const getBranchById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [branches] = await db.query(`
      SELECT 
        b.*,
        COUNT(DISTINCT m.id) as total_members,
        COUNT(DISTINCT ba.id) as total_admins
      FROM branches b
      LEFT JOIN members m ON b.id = m.branch_id AND m.status = 'active'
      LEFT JOIN branch_admins ba ON b.id = ba.branch_id
      WHERE b.id = ?
      GROUP BY b.id
    `, [id]);

    if (branches.length === 0) {
      return res.status(404).json({ message: 'Branch tidak ditemukan' });
    }

    res.json({ success: true, data: branches[0] });
  } catch (error) {
    next(error);
  }
};

export const createBranch = async (req, res, next) => {
  try {
    const { branch_name, address, phone, email } = req.body;

    if (!branch_name) {
      return res.status(400).json({ message: 'Nama branch diperlukan' });
    }

    const [result] = await db.query(
      'INSERT INTO branches (branch_name, address, phone, email) VALUES (?, ?, ?, ?)',
      [branch_name, address, phone, email]
    );

    res.status(201).json({
      success: true,
      message: 'Branch berhasil ditambahkan',
      data: { id: result.insertId },
    });
  } catch (error) {
    next(error);
  }
};

export const updateBranch = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const fields = Object.keys(updates);
    const values = Object.values(updates);

    if (fields.length === 0) {
      return res.status(400).json({ message: 'Tidak ada data untuk diupdate' });
    }

    const setClause = fields.map(field => `${field} = ?`).join(', ');
    values.push(id);

    const [result] = await db.query(
      `UPDATE branches SET ${setClause} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Branch tidak ditemukan' });
    }

    res.json({ success: true, message: 'Branch berhasil diupdate' });
  } catch (error) {
    next(error);
  }
};

export const deleteBranch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const [result] = await db.query('DELETE FROM branches WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Branch tidak ditemukan' });
    }

    res.json({ success: true, message: 'Branch berhasil dihapus' });
  } catch (error) {
    next(error);
  }
};

// Get branch detail with admins, schedules, and paginated members
export const getBranchDetail = async (req, res, next) => {
  try {
    const branchId = req.query.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const offset = (page - 1) * limit;

    if (!branchId) {
      return res.status(400).json({ message: 'ID Cabang diperlukan.' });
    }

    const response = {};

    // 1. Get branch info
    const [branches] = await db.query('SELECT * FROM branches WHERE id = ?', [branchId]);
    
    if (branches.length === 0) {
      return res.status(404).json({ message: 'Cabang tidak ditemukan.' });
    }
    
    response.branch_info = branches[0];

    // 2. Get branch admins
    const [admins] = await db.query(`
      SELECT u.id as user_id, ba.full_name, u.username 
      FROM branch_admins ba 
      JOIN users u ON ba.user_id = u.id 
      WHERE ba.branch_id = ?
    `, [branchId]);
    response.admins = admins;

    // 3. Get schedules
    const [schedules] = await db.query(`
      SELECT * FROM schedules 
      WHERE branch_id = ? 
      ORDER BY day_of_week, start_time
    `, [branchId]);
    response.schedules = schedules;

    // 4. Get members with pagination and search
    let memberParams = [branchId];
    let searchQuery = '';
    
    if (search) {
      searchQuery = ' AND (m.full_name LIKE ? OR m.id LIKE ?)';
      const searchTerm = `%${search}%`;
      memberParams.push(searchTerm, searchTerm);
    }

    // Count total members
    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM members m WHERE m.branch_id = ?${searchQuery}`,
      memberParams
    );
    const totalRecords = countResult[0].total;
    const totalPages = Math.ceil(totalRecords / limit);

    // Get members data with pagination
    const memberDataParams = [...memberParams, limit, offset];
    const [members] = await db.query(`
      SELECT 
        m.id, 
        m.full_name, 
        m.status, 
        m.avatar, 
        u.username 
      FROM members m 
      LEFT JOIN users u ON m.user_id = u.id 
      WHERE m.branch_id = ?${searchQuery}
      ORDER BY m.full_name ASC 
      LIMIT ? OFFSET ?
    `, memberDataParams);

    // Add full avatar URL
    const membersWithUrls = members.map(member => ({
      ...member,
      avatar: member.avatar ? `${process.env.APP_URL}${member.avatar}` : null
    }));

    response.members = {
      data: membersWithUrls,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalRecords: totalRecords
      }
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
};
